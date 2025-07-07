import asyncio
import base64
import io
import json
import logging
import os
import re
import shutil
import tempfile
import time
import traceback
import uuid
from pathlib import Path
from typing import List, Optional, Dict, Any
import docx2txt
import fitz  # PyMuPDF
import numpy as np
import PyPDF2
import pytesseract
import requests
import uvicorn
from docx import Document
from fastapi import FastAPI, UploadFile, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pdf2image import convert_from_path
from PIL import Image
from pydantic import BaseModel
from dotenv import load_dotenv
from datetime import datetime
import groq
import mimetypes
from docx.opc.constants import RELATIONSHIP_TYPE as RT

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
# UPLOAD_DIR = os.path.abspath("uploads")
# os.makedirs(UPLOAD_DIR, exist_ok=True)
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
logger.info(f"Using upload directory: {UPLOAD_DIR}")

# Add MIME types for common image formats
mimetypes.add_type('image/png', '.png')
mimetypes.add_type('image/jpeg', '.jpg')
mimetypes.add_type('image/jpeg', '.jpeg')

# Serve static files from the uploads directory
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
class ImageData(BaseModel):
    data: str
    type: str
    description: str = "Document image"
    placeholder: str = ""

class ConversionResponse(BaseModel):
    status: str = "success"
    markdown: str
    filename: str
    images: List[ImageData] = []
    placeholder_map: Dict[str, str] = {}

# --- 1. Standardize placeholder format ---
PLACEHOLDER_FORMAT = "[[IMG_PLACEHOLDER_{}]]"

async def save_image_locally(image_bytes: bytes, filename: str, doc_name: str = "", index: int = 0) -> str:
    """Save image to local uploads directory and return its URL path.
    
    Args:
        image_bytes: The image data as bytes
        filename: Original filename (used for extension)
        doc_name: Base name of the document (without extension)
        index: Index of the image in the document
        
    Returns:
        str: URL path to the saved image
    """
    try:
        # Get file extension from original filename, default to .png
        file_ext = os.path.splitext(filename)[1].lower() or '.png'
        
        # Create a clean base name from the document name
        if doc_name:
            # Remove extension if present
            doc_base = os.path.splitext(doc_name)[0]
            # Remove special characters and replace spaces with underscores
            clean_name = re.sub(r'[^\w\d-]', '_', doc_base).strip('_')
            # Create filename with document name and index
            unique_filename = f"{clean_name}_{index}{file_ext}"
        else:
            # Fallback to UUID if no doc_name provided
            unique_filename = f"{uuid.uuid4().hex}{file_ext}"
            
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Ensure the uploads directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Save the file
        with open(file_path, 'wb') as buffer:
            buffer.write(image_bytes)
            
        # Return the full URL path
        # In production, replace 'http://localhost:5000' with your actual domain
        base_url = "http://localhost:5000"
        return f"{base_url}/uploads/{unique_filename}"
        
    except Exception as e:
        logger.error(f"Error saving image: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")

async def extract_images_from_pdf(pdf_bytes: bytes, doc_name: str = "") -> List[ImageData]:
    """Extract images from PDF and save them locally.
    
    Args:
        pdf_bytes: PDF file content as bytes
        doc_name: Base name of the document (for naming images)
        
    Returns:
        List of ImageData objects with image metadata
    """
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
                
                # Use document name and page number for the image filename
                image_url = await save_image_locally(
                    img_bytes, 
                    f"{doc_name}_page_{i+1}.png",
                    doc_name=doc_name,
                    index=i+1
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
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to extract images from PDF")
    return images

async def extract_text_and_images_from_docx(docx_path: str, doc_name: str = "") -> tuple[str, List[ImageData], Dict[str, str]]:
    """Extract text and images from DOCX while maintaining their positions and return placeholder map."""
    doc = Document(docx_path)
    images = []
    placeholder_map = {}
    image_counter = 0
    text_parts = []
    rels = doc.part.rels
    for para in doc.paragraphs:
        para_text = ""
        for run in para.runs:
            run_xml = run._element.xml
            # Look for image relationship ID in the run's XML
            match = re.search(r'r:embed="(rId[0-9]+)"', run_xml)
            if match:
                rId = match.group(1)
                rel = rels.get(rId)
                if rel and rel.reltype == RT.IMAGE:
                    image_part = rel.target_part
                    image_bytes = image_part.blob
                    ext = os.path.splitext(image_part.partname)[1].lower()
                    ext = ext if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp'] else '.png'
                    img_name = f"{doc_name}_img_{image_counter+1}{ext}"
                    image_url = await save_image_locally(image_bytes, img_name, doc_name=doc_name, index=image_counter+1)
                    placeholder = PLACEHOLDER_FORMAT.format(image_counter)
                    images.append(ImageData(data=image_url, type=f"image/{ext.lstrip('.')}" , description=f"Image {image_counter+1}", placeholder=placeholder))
                    placeholder_map[placeholder] = image_url
                    para_text += f" {placeholder} "
                    image_counter += 1
                else:
                    para_text += run.text
            else:
                para_text += run.text
        text_parts.append(para_text)
    # Join all text parts
    text = "\n\n".join(text_parts)
    # Replace all placeholders with markdown image tags
    for img in images:
        img_markdown = f"![]({img.data})"
        text = text.replace(img.placeholder, img_markdown)
    return text, images, placeholder_map

async def extract_text_and_images_from_pdf(pdf_bytes: bytes, doc_name: str = "") -> tuple[str, List[ImageData], Dict[str, str]]:
    images = []
    placeholder_map = {}
    text_parts = []
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
        temp_pdf.write(pdf_bytes)
        temp_pdf_path = temp_pdf.name
    doc = None
    try:
        doc = fitz.open(temp_pdf_path)
        img_idx = 0
        for page_num, page in enumerate(doc, 1):
            # Extract text and split into paragraphs (by double newlines or lines)
            page_text = page.get_text("text")
            paragraphs = [p.strip() for p in re.split(r'\n{2,}', page_text) if p.strip()]
            para_with_images = []
            image_list = page.get_images(full=True)
            img_in_para = 0
            for i, para in enumerate(paragraphs):
                para_with_images.append(para)
                # Insert image placeholder after every paragraph if there are images left
                if img_idx < len(image_list):
                    placeholder = f"[IMAGE_{img_idx}]"
                    para_with_images.append(placeholder)
                    xref = image_list[img_idx][0]
                    base_image = doc.extract_image(xref)
                    img_bytes = base_image["image"]
                    ext = f'.{base_image["ext"]}'
                    img_name = f"{doc_name}_img_{img_idx+1}{ext}"
                    image_url = await save_image_locally(img_bytes, img_name, doc_name=doc_name, index=img_idx+1)
                    images.append(ImageData(data=image_url, type=f"image/{base_image['ext']}", description=f"Image {img_idx+1}", placeholder=placeholder))
                    placeholder_map[placeholder] = image_url
                    img_idx += 1
            # If there are still images left after all paragraphs, append them at the end
            while img_idx < len(image_list):
                placeholder = f"[IMAGE_{img_idx}]"
                para_with_images.append(placeholder)
                xref = image_list[img_idx][0]
                base_image = doc.extract_image(xref)
                img_bytes = base_image["image"]
                ext = f'.{base_image["ext"]}'
                img_name = f"{doc_name}_img_{img_idx+1}{ext}"
                image_url = await save_image_locally(img_bytes, img_name, doc_name=doc_name, index=img_idx+1)
                images.append(ImageData(data=image_url, type=f"image/{base_image['ext']}", description=f"Image {img_idx+1}", placeholder=placeholder))
                placeholder_map[placeholder] = image_url
                img_idx += 1
            text_parts.append("\n\n".join(para_with_images))
        full_text = "\n\n".join(text_parts).strip()
        return full_text, images, placeholder_map
    finally:
        if doc is not None:
            doc.close()
        os.unlink(temp_pdf_path)

def process_document_with_groq(text: str, images: List[ImageData], filename: str) -> str:
    """Process document text with Groq API and return formatted Markdown."""
    if not text.strip() and not images:
        return "# Document Conversion\n\nNo text content could be extracted from the document."
    try:
        client = groq.Client()
        # Prepare image placeholders in the text
        for img in images:
            text = text.replace(img.placeholder, f"![]({img.data})")
        system_prompt = """You are an expert technical documentation specialist with deep knowledge of Markdown formatting.\nYour task is to convert technical documentation into perfectly formatted Markdown while preserving all technical accuracy.\n\nKey Rules:\n1. Maintain exact technical details and terminology\n2. Use proper Markdown syntax for all elements\n3. Structure content with clear hierarchy\n4. Format all lists, notes, and code blocks properly\n5. Preserve all original information without adding or removing content\n6. Ensure consistent spacing and formatting throughout\n7. Place images inline exactly where the ![](...) markdown appears in the text\n8. Beautify the output: use lists for steps, highlight NOTE:, style section titles (Purpose:, Steps:) as headers or bold, and add spacing for readability\n\nThe output should be production-ready technical documentation in Markdown format."""
        user_prompt = f"""Convert the following document into professional Markdown format.\nThe document already contains properly positioned image markdown in the format ![](image_url).\nDO NOT move or modify these image markdowns in any way.\n\nDocument content:\n{text}\n\nPlease format this as clean, well-structured markdown while preserving all technical details and following the formatting rules.\nMost importantly, DO NOT move or modify any existing image markdown (![alt](url)) in the text."""
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
        if len(markdown_output.split()) < len(text.split()) * 0.7:
            raise ValueError("Significant content loss detected")
        return markdown_output
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
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
    temp_path = None
    
    try:
        # Check if file is provided
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        filename = file.filename
        if not filename.lower().endswith(('.pdf', '.docx')):
            raise HTTPException(status_code=400, detail="Only PDF/DOCX files are allowed")

        logger.info(f"Starting conversion for file: {filename}")
        
        # Read file content
        file_content = await file.read()
        if not file_content:
            raise HTTPException(status_code=400, detail="File is empty")
            
        logger.info(f"File size: {len(file_content)} bytes")
        
        # Get the base name without extension
        doc_name = os.path.splitext(filename)[0]
        text = ""
        images = []
        placeholder_map = {}
        
        try:
            # Extract text and images based on file type
            if filename.lower().endswith('.pdf'):
                logger.info("Processing PDF file")
                text, images, placeholder_map = await extract_text_and_images_from_pdf(file_content, doc_name=doc_name)
            else:  # .docx
                logger.info("Processing DOCX file")
                # Create a temporary file
                fd, temp_path = tempfile.mkstemp(suffix=".docx")
                try:
                    with os.fdopen(fd, 'wb') as temp:
                        temp.write(file_content)
                    
                    text, images, placeholder_map = await extract_text_and_images_from_docx(temp_path, doc_name=doc_name)
                finally:
                    # Clean up temp file
                    if temp_path and os.path.exists(temp_path):
                        try:
                            os.unlink(temp_path)
                        except Exception as e:
                            logger.error(f"Error removing temporary file {temp_path}: {str(e)}")
            
            logger.info(f"Extracted text length: {len(text)}, Number of images: {len(images)}")
            
            # Always process with Groq for Markdown formatting, even if images are present
            if text or images:
                markdown_content = process_document_with_groq(text, images, filename)
            else:
                markdown_content = "# Document Conversion\n\nNo content could be extracted from the document."
            # Ensure all images are properly referenced in the markdown
            for img in images:
                if img.data not in markdown_content:
                    markdown_content += f"\n\n![]({img.data})"
            logger.info("Document processing completed successfully")
            
            # Create response
            return {
                "status": "success",
                "markdown": markdown_content,
                "filename": filename,
                "images": images,
                "placeholder_map": placeholder_map
            }
            
        except Exception as e:
            logger.error(f"Error during document processing: {str(e)}\n{traceback.format_exc()}")
            raise HTTPException(
                status_code=500, 
                detail=f"Error processing document: {str(e)}"
            )
        
        return ConversionResponse(
            status="success",
            markdown=markdown_content,
            filename=filename,
            images=images,
            placeholder_map=placeholder_map
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Conversion error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")
    finally:
        # Final cleanup in case anything was missed
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.error(f"Error in final cleanup of {temp_path}: {str(e)}")

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

@app.get("/uploads/{file_path:path}")
async def serve_file(file_path: str):
    """Serve uploaded files with proper MIME types."""
    try:
        file_path = os.path.join(UPLOAD_DIR, file_path)
        
        # Check if file exists and is within the uploads directory
        if not os.path.isfile(file_path) or not file_path.startswith(os.path.abspath(UPLOAD_DIR)):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Determine MIME type
        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
            mime_type = 'application/octet-stream'
        
        # Read and return the file
        with open(file_path, 'rb') as f:
            content = f.read()
        
        return Response(content=content, media_type=mime_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving file {file_path}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error serving file")

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