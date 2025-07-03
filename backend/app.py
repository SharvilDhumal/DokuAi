import os
import uuid
import base64
import io
import tempfile
from fastapi import FastAPI, HTTPException, UploadFile, Request, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import traceback
from pdf2image import convert_from_path
import fitz  # PyMuPDF
from docx import Document
import pytesseract
from PIL import Image
import re
import asyncio
import docx2txt
from PyPDF2 import PdfReader
import groq
from dotenv import load_dotenv
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
groq.api_key = os.getenv("GROQ_API_KEY")

app = FastAPI(
    title="Document Conversion API",
    description="API for converting documents to Markdown with image extraction",
    version="1.0.0"
)

# At the top of app.py
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = os.path.abspath("uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
logger.info(f"Using upload directory: {UPLOAD_DIR}")

# Static file serving
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

class ImageData(BaseModel):
    data: str
    type: str
    description: str = "Document image"

class ConversionResponse(BaseModel):
    status: str = "success"
    markdown: str
    filename: str
    images: List[ImageData] = []

async def save_image_locally(image_bytes: bytes, filename: str) -> str:
    """Save image to local uploads directory and return its URL path."""
    try:
        file_ext = os.path.splitext(filename)[1] or '.png'
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, 'wb') as f:
            f.write(image_bytes)
            
        logger.info(f"Image saved to {file_path}")
        return f"/uploads/{unique_filename}"
        
    except Exception as e:
        logger.error(f"Error saving image: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save image")

async def extract_images_from_pdf(pdf_bytes: bytes) -> List[ImageData]:
    """Extract images from PDF and save them locally."""
    images = []
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(pdf_bytes)
            temp_pdf_path = temp_pdf.name

        try:
            images_list = convert_from_path(temp_pdf_path)
            for i, image in enumerate(images_list):
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format='PNG')
                img_bytes = img_byte_arr.getvalue()
                image_url = await save_image_locally(img_bytes, f"page_{i+1}.png")
                
                images.append(ImageData(
                    data=image_url,
                    type="image/png",
                    description=f"Page {i+1}"
                ))
        finally:
            os.unlink(temp_pdf_path)
    except Exception as e:
        logger.error(f"Error extracting images from PDF: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to extract images from PDF")
    return images

async def extract_images_from_docx(docx_path: str) -> List[ImageData]:
    """Extract images from DOCX file and save them locally."""
    images = []
    try:
        doc = Document(docx_path)
        for i, rel in enumerate(doc.part.rels.values()):
            if "image" in rel.target_ref:
                img_data = rel.target_part.blob
                ext = rel.target_ref.split('.')[-1].lower()
                ext = 'png' if ext not in ['jpg', 'jpeg', 'png'] else ext
                
                image_url = await save_image_locally(img_data, f"docx_image_{i+1}.{ext}")
                
                images.append(ImageData(
                    data=image_url,
                    type=f"image/{ext}",
                    description=f"Image {i+1}"
                ))
    except Exception as e:
        logger.error(f"Error extracting images from DOCX: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to extract images from DOCX")
    return images

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract and clean text from PDF."""
    text = ""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                # Clean up common PDF artifacts
                page_text = re.sub(r'\s+', ' ', page_text)  # Normalize whitespace
                page_text = re.sub(r'(\w)-\s+(\w)', r'\1\2', page_text)  # Fix hyphenated words
                text += page_text + "\n\n"
    except Exception as e:
        logger.error(f"Error extracting PDF text: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to extract text from PDF")
    return text.strip()

def process_document_with_groq(text: str, images: List[ImageData], filename: str) -> str:
    """Process document text with Groq API and return formatted Markdown."""
    if not text.strip() and not images:
        return "# Document Conversion\n\nNo text content could be extracted from the document."
        
    try:
        client = groq.Client()
        
        # Prepare image references for the prompt
        image_references = "\n".join(
            f"Image {idx+1}: {img.description} (path: {img.data})" 
            for idx, img in enumerate(images)
        ) if images else "No images"
        
        system_prompt = """You are an expert technical documentation specialist with deep knowledge of Markdown formatting. 
Your task is to convert technical documentation into perfectly formatted Markdown while preserving all technical accuracy.

Key Rules:
1. Maintain exact technical details and terminology
2. Use proper Markdown syntax for all elements
3. Structure content with clear hierarchy
4. Format all lists, notes, and code blocks properly
5. Preserve all original information without adding or removing content
6. Ensure consistent spacing and formatting throughout

The output should be production-ready technical documentation in Markdown format."""

        user_prompt = f"""Convert the following document into professional Markdown format:

Document content:
{text}

Images available:
{image_references}

Please format this as clean, well-structured markdown while preserving all technical details and following the formatting rules."""

        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            model="llama3-70b-8192",
            temperature=0.1,
            max_tokens=8000,
            top_p=0.9,
            frequency_penalty=0.1,
            presence_penalty=0.1
        )
        
        markdown_output = chat_completion.choices[0].message.content
        
        # Validate output
        if len(markdown_output.split()) < len(text.split()) * 0.7:
            raise ValueError("Significant content loss detected")
            
        return markdown_output
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        # Fallback with basic formatting
        fallback = f"# {os.path.splitext(filename)[0]}\n\n{text}"
        if images:
            fallback += "\n\n## Images\n"
            for img in images:
                fallback += f"\n![]({img.data})"
        return fallback

@app.post("/api/convert", response_model=ConversionResponse)
async def convert_file(file: UploadFile):
    """Convert uploaded PDF or DOCX file to Markdown with extracted images."""
    logger.info(f"Received file: {file.filename}")
    try:
        filename = file.filename
        if not filename.lower().endswith(('.pdf', '.docx')):
            raise HTTPException(status_code=400, detail="Only PDF/DOCX files are allowed")

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
            
            try:
                text = docx2txt.process(temp_path)
                images = await extract_images_from_docx(temp_path)
            finally:
                os.unlink(temp_path)
        
        markdown_output = process_document_with_groq(text, images, filename)
        
        return ConversionResponse(
            markdown=markdown_output,
            filename=filename,
            images=images
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Conversion error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Document conversion failed")

@app.get("/api/health")
async def health_check():
    """Check API health status."""
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "groq": "connected" if groq.api_key else "error",
                "storage": "available" if os.path.exists(UPLOAD_DIR) else "error"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "services": {
                "groq": "error",
                "storage": "error"
            }
        }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all uncaught exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=5000, log_level="info")