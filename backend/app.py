import os
import uuid
import base64
import io
import tempfile
import traceback
import logging
import re  # Added for regex support
from logging.handlers import RotatingFileHandler
from fastapi import FastAPI, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
import docx2txt
from PyPDF2 import PdfReader
from pdf2image import convert_from_bytes
import groq
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime

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
    data: str  # base64 encoded image
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
                data=url,  # Now storing URL instead of base64
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
        # Extract images using docx2txt
        text = docx2txt.process(docx_path, image_dir)
        
        # Process extracted images
        for idx, img_file in enumerate(os.listdir(image_dir)):
            if img_file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
                with open(os.path.join(image_dir, img_file), "rb") as f:
                    image_bytes = f.read()
                
                # Determine content type
                ext = img_file.split('.')[-1].lower()
                content_type = f"image/{ext}" if ext != 'jpg' else "image/jpeg"
                
                # Upload to Supabase
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
        # Cleanup
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
    """Process document content using Groq in chunks"""
    # Create unique image placeholders
    image_placeholders = {}
    for idx, img in enumerate(images):
        placeholder = f"{{{{IMAGE_{idx}}}}}"  # Use double curly braces
        # Use the public URL directly
        image_placeholders[placeholder] = (
            f"![{img.description}]({img.data})"
        )
    
    # Insert placeholders at the beginning to ensure they're preserved
    placeholder_text = "\n".join(image_placeholders.keys())
    processed_text = placeholder_text + "\n\n" + text
    
    # Process text with Groq
    max_chars = 4000
    text_chunks = [processed_text[i:i+max_chars] for i in range(0, len(processed_text), max_chars)]
    
    markdown_parts = []
    for chunk in text_chunks:
        prompt = f"""
Convert this document part to well-structured Markdown. Preserve:
- All original content including headings, lists, tables
- Document structure and formatting
- Image placeholders exactly as they appear: {{{{IMAGE_0}}}}, {{{{IMAGE_1}}}}, etc.

Document content:
{chunk}
"""
        try:
            response = groq.chat.completions.create(
                model="llama3-70b-8192",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a helpful assistant that converts documents to well-structured Markdown. Preserve all image placeholders exactly as they appear."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2048
            )
            markdown_parts.append(response.choices[0].message.content)
        except Exception as e:
            logging.error(f"Error processing chunk: {str(e)}")
            markdown_parts.append(chunk)
    
    markdown_output = "\n\n".join(markdown_parts)
    
    # Replace placeholders with actual image tags
    for placeholder, img_tag in image_placeholders.items():
        markdown_output = markdown_output.replace(placeholder, img_tag)
    
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
        
        # Get public URL
        url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(unique_filename)
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
        
        # Process document (no changes needed here as we already store URLs)
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
        # Test Groq connection
        groq.models.list()  # This might need adjustment based on actual Groq API
        logging.info("Health check: OK")
        return {"status": "healthy", "groq": "connected"}
    except Exception as e:
        logging.error(f"Health check failed: {str(e)}")
        return {"status": "unhealthy", "error": str(e)}

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