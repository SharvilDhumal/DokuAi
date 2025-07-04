import os
import uuid
import base64
import io
import tempfile
from fastapi import FastAPI, HTTPException, UploadFile, Request, status
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import mimetypes
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

class ConversionResponse(BaseModel):
    status: str = "success"
    markdown: str
    filename: str
    images: List[ImageData] = []

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

async def extract_text_and_images_from_docx(docx_path: str, doc_name: str = "") -> tuple[str, List[ImageData]]:
    """Extract text and images from DOCX while maintaining their positions.
    
    Args:
        docx_path: Path to the DOCX file
        doc_name: Base name of the document (for naming images)
        
    Returns:
        tuple: (text_with_placeholders, images)
    """
    temp_dir = "temp_images"
    try:
        # Create the temp directory first
        os.makedirs(temp_dir, exist_ok=True)
        
        # Process the document with docx2txt to get text with image placeholders
        text = docx2txt.process(docx_path, temp_dir)
        
        images = []
        if os.path.exists(temp_dir):
            image_files = [f for f in os.listdir(temp_dir) 
                         if os.path.isfile(os.path.join(temp_dir, f)) and 
                         f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))]
            
            # Process each extracted image
            for i, img_file in enumerate(sorted(image_files), 1):
                img_path = os.path.join(temp_dir, img_file)
                try:
                    with open(img_path, 'rb') as f:
                        img_data = f.read()
                    
                    # Get file extension
                    _, ext = os.path.splitext(img_file)
                    ext = ext.lower()
                    if ext not in ['.jpg', '.jpeg', '.png']:
                        ext = '.png'
                    
                    # Save the image with proper naming
                    image_url = await save_image_locally(
                        img_data,
                        f"{doc_name}_image_{i}{ext}",
                        doc_name=doc_name,
                        index=i
                    )
                    
                    images.append(ImageData(
                        data=image_url,
                        type=f"image/{ext.lstrip('.')}",
                        description=f"Image {i}"
                    ))
                    
                except Exception as img_error:
                    logger.error(f"Error processing image {img_file}: {str(img_error)}")
                finally:
                    # Ensure the file is closed and removed
                    try:
                        if os.path.exists(img_path):
                            os.remove(img_path)
                    except Exception as e:
                        logger.error(f"Error removing temporary file {img_path}: {str(e)}")
        
        # Replace image placeholders with markdown
        for i, img in enumerate(images, 1):
            placeholder = f"{temp_dir}/image{i}"
            img_markdown = f"![]({img.data})  \n*{img.description}*"
            text = text.replace(placeholder, img_markdown)
        
        return text, images
        
    except Exception as e:
        logger.error(f"Error processing DOCX: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to process DOCX: {str(e)}")
    finally:
        # Clean up the temp directory
        try:
            if os.path.exists(temp_dir):
                # Remove all files in the directory
                for f in os.listdir(temp_dir):
                    file_path = os.path.join(temp_dir, f)
                    try:
                        if os.path.isfile(file_path):
                            os.unlink(file_path)
                    except Exception as e:
                        logger.error(f"Error deleting {file_path}: {str(e)}")
                # Remove the directory
                os.rmdir(temp_dir)
        except Exception as e:
            logger.error(f"Error cleaning up temp directory: {str(e)}")

async def extract_text_and_images_from_pdf(pdf_bytes: bytes, doc_name: str = "") -> tuple[str, List[ImageData]]:
    """Extract text and images from PDF while maintaining their positions.
    
    Args:
        pdf_bytes: PDF file content as bytes
        doc_name: Base name of the document (for naming images)
        
    Returns:
        tuple: (text_with_placeholders, images)
    """
    text_parts = []
    images = []
    
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
            temp_pdf.write(pdf_bytes)
            temp_pdf_path = temp_pdf.name
        
        try:
            # Extract text first
            reader = PdfReader(io.BytesIO(pdf_bytes))
            for page_num, page in enumerate(reader.pages, 1):
                # Extract text from the page
                page_text = page.extract_text()
                if page_text:
                    # Clean up common PDF artifacts
                    page_text = re.sub(r'\s+', ' ', page_text)  # Normalize whitespace
                    page_text = re.sub(r'(\w)-\s+(\w)', r'\1\2', page_text)  # Fix hyphenated words
                    text_parts.append(page_text)
                
                # Add image placeholder
                text_parts.append(f"\n\n[IMAGE_PLACEHOLDER_{page_num}]\n\n")
            
            # Extract images
            images_list = convert_from_path(temp_pdf_path)
            for i, image in enumerate(images_list, 1):
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format='PNG')
                img_bytes = img_byte_arr.getvalue()
                
                image_url = await save_image_locally(
                    img_bytes, 
                    f"{doc_name}_page_{i}.png",
                    doc_name=doc_name,
                    index=i
                )
                
                images.append(ImageData(
                    data=image_url,
                    type="image/png",
                    description=f"Page {i}"
                ))
            
            # Join text parts and replace placeholders with image markdown
            full_text = "\n\n".join(text_parts).strip()
            
            # Replace placeholders with image markdown
            for i, img in enumerate(images, 1):
                placeholder = f"[IMAGE_PLACEHOLDER_{i}]"
                img_markdown = f"![]({img.data})  \n*{img.description}*"
                full_text = full_text.replace(placeholder, img_markdown, 1)
            
            return full_text, images
            
        finally:
            os.unlink(temp_pdf_path)
            
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to process PDF")

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
    temp_path = None
    try:
        filename = file.filename
        if not filename.lower().endswith(('.pdf', '.docx')):
            raise HTTPException(status_code=400, detail="Only PDF/DOCX files are allowed")

        # Get the base name without extension
        doc_name = os.path.splitext(filename)[0]
        contents = await file.read()
        
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        if filename.lower().endswith('.pdf'):
            text, images = await extract_text_and_images_from_pdf(contents, doc_name=doc_name)
        else:
            # Create a temporary file with a unique name
            fd, temp_path = tempfile.mkstemp(suffix=".docx")
            try:
                with os.fdopen(fd, 'wb') as temp:
                    temp.write(contents)
                
                text, images = await extract_text_and_images_from_docx(temp_path, doc_name=doc_name)
            finally:
                # Ensure the temporary file is removed
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.unlink(temp_path)
                    except Exception as e:
                        logger.error(f"Error removing temporary file {temp_path}: {str(e)}")
        
        # Process the text with Groq to format it as markdown
        markdown_output = process_document_with_groq(text, images, filename)
        
        return ConversionResponse(
            markdown=markdown_output,
            filename=filename,
            images=images
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