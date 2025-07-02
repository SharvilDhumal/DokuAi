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
from datetime import datetime
import groq
from pocketbase import PocketBase
from docx import Document

# Load environment variables
load_dotenv()
groq.api_key = os.getenv("GROQ_API_KEY")

# PocketBase configuration
POCKETBASE_URL = os.getenv("POCKETBASE_URL", "http://localhost:8090")
POCKETBASE_EMAIL = os.getenv("POCKETBASE_EMAIL")
POCKETBASE_PASSWORD = os.getenv("POCKETBASE_PASSWORD")
pb = PocketBase(POCKETBASE_URL)

# Authenticate with PocketBase
try:
    pb.admins.auth_with_password(POCKETBASE_EMAIL, POCKETBASE_PASSWORD)
    logging.info("Successfully authenticated with PocketBase")
except Exception as e:
    logging.error(f"Failed to authenticate with PocketBase: {str(e)}")
    raise

# Setup logging
log_formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]')
log_handler = RotatingFileHandler('app.log', maxBytes=1000000, backupCount=3)
log_handler.setFormatter(log_formatter)
log_handler.setLevel(logging.INFO)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

class ImageData(BaseModel):
    data: str  # contains PocketBase URL
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
            
            url = await upload_image_to_pocketbase(
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
    doc = Document(docx_path)
    
    for rel in doc.part.rels.values():
        if "image" in rel.target_ref:
            img_data = rel.target_part.blob
            # Guess extension and content type
            ext = rel.target_ref.split('.')[-1].lower()
            content_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"
            filename = f"docx_image_{uuid.uuid4().hex}.{ext}"
            # Upload to PocketBase
            image_url = await upload_image_to_pocketbase(img_data, filename, content_type)
            images.append(ImageData(
                data=image_url,
                type=content_type,
                description="Document image"
            ))
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
    try:
        from groq import Groq
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        
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
                markdown_parts.append(chunk)
        
        markdown_output = "\n\n".join(markdown_parts)
    except Exception as e:
        logging.error(f"Groq initialization failed, using simple converter: {str(e)}")
        markdown_output = text
    
    for idx, img in enumerate(images):
        markdown_output = markdown_output.replace(
            f"{{{{IMAGE_POSITION_{idx}}}}}",
            f"![{img.description}]({img.data})"
        )
    
    return markdown_output

async def upload_image_to_pocketbase(image_bytes: bytes, filename: str, content_type: str) -> str:
    """Uploads an image to PocketBase and returns public URL"""
    try:
        # Create unique filename with original extension
        ext = filename.split('.')[-1].lower() if '.' in filename else content_type.split('/')[-1]
        unique_filename = f"{uuid.uuid4().hex}.{ext}"

        # Create a temporary file instead of BytesIO
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as temp_file:
            temp_file.write(image_bytes)
            temp_file_path = temp_file.name

        # Upload to PocketBase using the temporary file path
        with open(temp_file_path, 'rb') as f:
            record = pb.collection("images").create({
                "image": f  # Only the file object!
            })

        # Clean up temporary file
        os.unlink(temp_file_path)

        # Return proper URL format
        return f"{POCKETBASE_URL}/api/files/images/{record.id}/{unique_filename}"
    except Exception as e:
        logging.error(f"PocketBase upload error: {str(e)}")
        logging.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Image upload failed")

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
        # Check PocketBase connection
        pb.health.check()
        
        return {
            "status": "healthy",
            "services": {
                "groq": "connected" if groq.api_key else "error",
                "pocketbase": "connected"
            }
        }
    except Exception as e:
        logging.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "services": {
                "groq": "error" if not groq.api_key else "connected",
                "pocketbase": "error"
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