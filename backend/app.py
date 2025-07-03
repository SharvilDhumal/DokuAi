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

# Load environment variables
load_dotenv()
groq.api_key = os.getenv("GROQ_API_KEY")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs("uploads", exist_ok=True)
logger.info(f"[App] Using upload directory: {UPLOAD_DIR}")

# Static file serving
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Add a direct file endpoint as a fallback
@app.get("/files/{file_path:path}")
async def serve_file(file_path: str):
    file_location = os.path.join(UPLOAD_DIR, file_path)
    if not os.path.exists(file_location):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Set proper content type based on file extension
    if file_path.lower().endswith('.png'):
        media_type = 'image/png'
    elif file_path.lower().endswith(('.jpg', '.jpeg')):
        media_type = 'image/jpeg'
    else:
        media_type = 'application/octet-stream'
    
    return FileResponse(
        file_location,
        media_type=media_type,
        headers={
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=31536000'
        }
    )

class ImageData(BaseModel):
    data: str
    type: str
    description: str = "Document image"

class ConversionResponse(BaseModel):
    status: str = "success"
    markdown: str
    filename: str
    images: List[ImageData] = []

async def save_image_locally(image_bytes: bytes, filename: str):
    try:
        # Create uploads directory if it doesn't exist
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        
        # Generate a unique filename
        file_ext = os.path.splitext(filename)[1] or '.png'
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save the image
        with open(file_path, 'wb') as f:
            f.write(image_bytes)
            
        logger.info(f"Image saved to {file_path}")
        return unique_filename  # Return only the filename, not the full path
        
    except Exception as e:
        logger.error(f"Error saving image: {str(e)}")
        raise

async def extract_images_from_pdf(pdf_bytes: bytes) -> List[ImageData]:
    images = []
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(pdf_bytes)
            temp_pdf_path = temp_pdf.name

        try:
            # Convert PDF to images
            images_list = convert_from_path(temp_pdf_path)
            
            for i, image in enumerate(images_list):
                # Convert image to bytes
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format='PNG')
                img_byte_arr = img_byte_arr.getvalue()
                
                # Save locally
                image_url = await save_image_locally(
                    img_byte_arr, 
                    f"page_{i+1}.png"
                )
                
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
    images = []
    doc = Document(docx_path)
    
    for rel in doc.part.rels.values():
        if "image" in rel.target_ref:
            img_data = rel.target_part.blob
            # Guess extension and content type
            ext = rel.target_ref.split('.')[-1].lower()
            content_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"
            filename = f"docx_image_{uuid.uuid4().hex}.{ext}"
            # Save locally
            image_url = await save_image_locally(img_data, filename)
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
        logger.error(f"Error extracting PDF text: {str(e)}")
        logger.error(traceback.format_exc())
    return text

def process_document_with_groq(text: str, images: List[ImageData]) -> str:
    """Process document text with Groq API and return markdown."""
    if not text.strip() and not images:
        return "# Document Conversion\n\nNo text content could be extracted from the document."
        
    try:
        client = groq.Client()
        
        # Enhanced prompt for better formatting
        # Update the prompt in process_document_with_groq()
        prompt = f"""Convert the following document text into well-structured Markdown format. 
        Follow these guidelines:

        1. Preserve all important information
        2. Use appropriate heading levels (#, ##, ###) for document structure
        3. Format lists (both ordered and unordered) properly
        4. Convert tables to Markdown table syntax
        5. Keep code blocks and technical terms intact
        6. Add spacing between sections for better readability
        7. Format notes, warnings, and important information as blockquotes using: > **Note:** 
        8. For images, use the format: ![description](/uploads/filename)
        9. Never duplicate note sections or content

        Here's the document content to convert:
        {text}

        Return ONLY the formatted Markdown content, no additional commentary.
        """
        
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a technical documentation expert that converts documents to perfectly formatted Markdown."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="mixtral-8x7b-32768",
            temperature=0.3,
            max_tokens=4000
        )
        
        markdown_output = chat_completion.choices[0].message.content
        
        # Add image placeholders if we have images
        if images:
            if not markdown_output.strip():
                markdown_output = "# Document with Images\n\n"
            else:
                markdown_output += "\n\n## Images\n\n"
                
            for idx, img in enumerate(images):
                img_filename = os.path.basename(img.data)
                markdown_output += f"\n![Image {idx + 1}](/uploads/{img_filename})\n"
        
        return markdown_output
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        # Fallback to basic formatting
        fallback = "# Document Conversion\n\n"
        if text.strip():
            fallback += text + "\n\n"
        if images:
            fallback += "## Images\n\n"
            for idx, img in enumerate(images):
                img_filename = os.path.basename(img.data)
                fallback += f"![Image {idx + 1}](/uploads/{img_filename})\n\n"
        return fallback

@app.post("/api/convert", response_model=ConversionResponse)
async def convert_file(file: UploadFile):
    logger.info(f"[Convert] Received file: {file.filename} (Content-Type: {file.content_type})")
    try:
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
        
        # Debug logging
        logger.info(f"Sending response with markdown length: {len(markdown_output) if markdown_output else 0}")
        logger.info(f"Filename: {filename}")
        logger.info(f"Number of images: {len(images)}")
        
        response_data = {
            "markdown": markdown_output,
            "filename": filename,
            "images": [img.dict() for img in images]
        }
        
        logger.debug(f"Response data: {response_data}")
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/health")
async def health_check():
    try:
        return {
            "status": "healthy",
            "services": {
                "groq": "connected" if groq.api_key else "error"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "services": {
                "groq": "error" if not groq.api_key else "connected"
            }
        }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )

if __name__ == '__main__':
    import uvicorn
    logging.info("Starting application")
    uvicorn.run(app, host='0.0.0.0', port=5000)