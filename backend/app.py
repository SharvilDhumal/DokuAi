import os
import uuid
import base64
import io
import tempfile
import traceback
import logging
import re
from logging.handlers import RotatingFileHandler
from fastapi import FastAPI, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
import docx2txt
from PyPDF2 import PdfReader
from pdf2image import convert_from_bytes
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime
import groq

# Load environment variables
load_dotenv()
groq.api_key = os.getenv("GROQ_API_KEY")

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = "documents"  # Your bucket name
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Setup logging
log_formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]')
log_handler = RotatingFileHandler('app.log', maxBytes=1000000, backupCount=3)
log_handler.setFormatter(log_formatter)
log_handler.setLevel(logging.INFO)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

class ImageData(BaseModel):
    data: str  # now contains Supabase URL
    type: str  # image/png, image/jpeg
    description: str = "Document image"

class ConversionResponse(BaseModel):
    status: str = "success"
    markdown: str
    filename: str
    images: List[ImageData] = []

async def extract_images_from_pdf(pdf_bytes: bytes) -> List[ImageData]:
    images = []
    try:
        pil_images = convert_from_bytes(pdf_bytes, dpi=100)
        for idx, img in enumerate(pil_images):
            with io.BytesIO() as output:
                img.save(output, format="JPEG", quality=70)
                image_bytes = output.getvalue()
            
            # Upload to Supabase
            url = await upload_image_to_supabase(
                image_bytes,
                f"page_{idx+1}.jpg",
                "image/jpeg"
            )
            
            images.append(ImageData(
                data=url,
                type="image/jpeg",
                description=f"Page {idx+1} Image"
            ))
    except Exception as e:
        logging.error(f"Error extracting images from PDF: {str(e)}")
        logging.error(traceback.format_exc())
    return images

async def extract_images_from_docx(docx_path: str) -> List[ImageData]:
    images = []
    image_dir = tempfile.mkdtemp()
    try:
        text = docx2txt.process(docx_path, image_dir)
        
        # Create mapping between image names and positions
        image_map = {}
        for idx, img_file in enumerate(os.listdir(image_dir)):
            if img_file.lower().endswith(('.png', '.jpg', '.jpeg')):
                image_map[img_file] = idx
                
        # Replace image references in text with placeholders
        for img_file, idx in image_map.items():
            placeholder = f"[IMAGE: {img_file}]"
            text = text.replace(f"[image: {img_file}]", placeholder)
        
        # Process images
        for img_file, idx in image_map.items():
            with open(os.path.join(image_dir, img_file), "rb") as f:
                image_bytes = f.read()
            
            ext = img_file.split('.')[-1].lower()
            content_type = f"image/{ext}" if ext != 'jpg' else "image/jpeg"
            
            url = await upload_image_to_supabase(
                image_bytes,
                img_file,
                content_type
            )
            
            images.append(ImageData(
                data=url,
                type=content_type,
                description=f"Document Image {idx+1}"
            ))
    except Exception as e:
        logging.error(f"Error extracting images from DOCX: {str(e)}")
        logging.error(traceback.format_exc())
    finally:
        for file in os.listdir(image_dir):
            os.remove(os.path.join(image_dir, file))
        os.rmdir(image_dir)
    return images

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    text = ""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages:
            if page.extract_text():
                text += page.extract_text() + "\n"
    except Exception as e:
        logging.error(f"Error extracting PDF text: {str(e)}")
        logging.error(traceback.format_exc())
    return text

def process_document_with_groq(text: str, images: List[ImageData]) -> str:
    """Process document content while preserving image positions"""
    # If Groq isn't working, we'll fall back to a simple converter
    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
        # Replace image placeholders with temporary tokens
        for idx, img in enumerate(images):
            placeholder = f"{{{{IMAGE_POSITION_{idx}}}}}"
            text = re.sub(r'\[IMAGE[^\]]*\]', placeholder, text, count=1)
        
        max_chars = 4000
        text_chunks = [text[i:i+max_chars] for i in range(0, len(text), max_chars)]
        
        markdown_parts = []
        for chunk in text_chunks:
            prompt = f"""Convert this document to well-structured Markdown, preserving all image placeholders."""
            try:
                response = client.chat.completions.create(
                    model="llama3-70b-8192",
                    messages=[
                        {"role": "system", "content": "Convert documents to Markdown"},
                        {"role": "user", "content": chunk}
                    ]
                )
                markdown_parts.append(response.choices[0].message.content)
            except Exception as e:
                logging.error(f"Groq processing error: {str(e)}")
                markdown_parts.append(chunk)  # Fallback to original text
        
        markdown_output = "\n\n".join(markdown_parts)
    except Exception as e:
        logging.error(f"Groq initialization failed, using simple converter: {str(e)}")
        markdown_output = text  # Fallback to original text
    
    # Ensure images are properly inserted
    for idx, img in enumerate(images):
        markdown_output = markdown_output.replace(
            f"{{{{IMAGE_POSITION_{idx}}}}}",
            f"![{img.description}]({img.data})"
        )
    
    return markdown_output

async def upload_image_to_supabase(image_bytes: bytes, filename: str, content_type: str) -> str:
    """Uploads an image to Supabase Storage and returns public URL"""
    try:
        # Generate unique filename
        ext = content_type.split('/')[-1]
        unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex}.{ext}"
        
        # Upload file
        res = supabase.storage.from_(SUPABASE_BUCKET).upload(
            file=image_bytes,
            path=unique_filename,
            file_options={"content-type": content_type}
        )
        
        # Get public URL - ensure it's a full URL
        url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(unique_filename)
        
        # Ensure the URL has the correct format
        if url and not url.startswith(('http://', 'https://')):
            url = f"https://{url}"
            
        return url
    except Exception as e:
        logging.error(f"Error uploading to Supabase: {str(e)}")
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Error uploading image")

@app.post("/api/convert", response_model=ConversionResponse)
async def convert_file(file: UploadFile):
    try:
        logging.info("Received conversion request")
        filename = file.filename
        if not filename.lower().endswith(('.pdf', '.docx')):
            raise HTTPException(status_code=400, detail="Invalid file type. Only PDF and DOCX allowed.")

        contents = await file.read()
        images = []
        text = ""
        
        if filename.lower().endswith('.pdf'):
            text = extract_text_from_pdf(contents)
            images = await extract_images_from_pdf(contents)
        else:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as temp:
                temp.write(contents)
                temp_path = temp.name
            
            text = docx2txt.process(temp_path)
            images = await extract_images_from_docx(temp_path)
            os.unlink(temp_path)
        
        if not text and not images:
            raise HTTPException(
                status_code=400,
                detail="Failed to extract content from document."
            )
        
        markdown_output = process_document_with_groq(text, images)
        
        return ConversionResponse(
            markdown=markdown_output,
            filename=filename,
            images=images
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Server error: {str(e)}")
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/health")
async def health_check():
    try:
        # Simple check that environment variables are loaded
        if not groq.api_key:
            raise Exception("Groq API key not configured")
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise Exception("Supabase configuration missing")
        return {
            "status": "healthy",
            "services": {
                "groq": "connected",
                "supabase": "configured"
            }
        }
    except Exception as e:
        logging.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "services": {
                "groq": "error" if not groq.api_key else "connected",
                "supabase": "error" if not SUPABASE_URL or not SUPABASE_KEY else "configured"
            }
        }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {str(exc)}")
    logging.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )

if __name__ == '__main__':
    import uvicorn
    logging.info("Starting application")
    uvicorn.run(app, host='0.0.0.0', port=5000)