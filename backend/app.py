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
import psycopg2

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

# Database connection string
POSTGRES_DSN = os.getenv("POSTGRES_DSN", "postgresql://postgres:sharvil39@localhost:5432/postgres")

# Ensure the conversion_logs table exists
def ensure_conversion_logs_table():
    try:
        conn = psycopg2.connect(POSTGRES_DSN)
        cur = conn.cursor()
        
        # Create conversion_logs table if it doesn't exist
        cur.execute("""
        CREATE TABLE IF NOT EXISTS conversion_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES user1(id) ON DELETE SET NULL,
            user_email VARCHAR(255) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            original_file_name VARCHAR(255),
            converted_file_name VARCHAR(255),
            conversion_type VARCHAR(50),
            status VARCHAR(50) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # Create index for faster lookups
        cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_conversion_logs_user_email 
        ON conversion_logs(user_email)
        """)
        
        conn.commit()
        cur.close()
        conn.close()
        logger.info("Verified/created conversion_logs table")
    except Exception as e:
        logger.error(f"Error ensuring conversion_logs table exists: {str(e)}")
        logger.error(traceback.format_exc())

# Initialize database table when the app starts
ensure_conversion_logs_table()

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
        global_img_idx = 0
        
        for page_num, page in enumerate(doc, 1):
            # Get page dimensions for relative positioning
            page_width = page.rect.width
            page_height = page.rect.height
            
            # Get all text blocks with their positions
            blocks = page.get_text("blocks", sort=True)  # sort=True helps with reading order
            image_list = page.get_images(full=True)
            
            # Create a list to hold all content elements (text and images)
            content_elements = []
            
            # Process text blocks
            for block in blocks:
                if block[4].strip():  # If block has text
                    content_elements.append({
                        'type': 'text',
                        'y0': block[1],
                        'y1': block[3],
                        'x0': block[0],
                        'x1': block[2],
                        'content': block[4].strip(),
                        'page': page_num
                    })
            
            # Process images
            for img_idx, img in enumerate(image_list, 1):
                xref = img[0]
                try:
                    base_image = doc.extract_image(xref)
                    img_bytes = base_image["image"]
                    ext = f'.{base_image["ext"]}'
                    img_name = f"{doc_name}_img_{global_img_idx + 1}{ext}"
                    
                    # Get image position using get_image_rect if available, otherwise approximate
                    try:
                        bbox = page.get_image_rects(xref)
                        if bbox:
                            bbox = bbox[0]  # Take first rectangle if multiple
                            y0, y1, x0, x1 = bbox.y0, bbox.y1, bbox.x0, bbox.x1
                        else:
                            # Fallback to page dimensions if can't get exact position
                            y0, y1, x0, x1 = 0, page_height, 0, page_width
                    except Exception:
                        y0, y1, x0, x1 = 0, page_height, 0, page_width
                    
                    # Create placeholder and save image
                    placeholder = PLACEHOLDER_FORMAT.format(global_img_idx)
                    image_url = await save_image_locally(img_bytes, img_name, doc_name=doc_name, index=global_img_idx+1)
                    images.append(ImageData(
                        data=image_url,
                        type=f"image/{base_image['ext']}",
                        description=f"Image {global_img_idx+1}",
                        placeholder=placeholder
                    ))
                    placeholder_map[placeholder] = image_url
                    
                    # Add image to content elements
                    content_elements.append({
                        'type': 'image',
                        'y0': y0,
                        'y1': y1,
                        'x0': x0,
                        'x1': x1,
                        'content': placeholder,
                        'page': page_num
                    })
                    
                    global_img_idx += 1
                    
                except Exception as e:
                    logger.warning(f"Error processing image {img_idx} on page {page_num}: {str(e)}")
            
            # Sort all elements by vertical position, then horizontal position
            content_elements.sort(key=lambda x: (x['y0'], x['x0']))
            
            # Group elements into lines based on vertical position
            lines = []
            current_line = []
            last_y = -1
            
            for element in content_elements:
                if current_line and abs(element['y0'] - last_y) > 5:  # Threshold for new line
                    # Sort elements in the line by x-coordinate
                    current_line.sort(key=lambda x: x['x0'])
                    lines.append(current_line)
                    current_line = []
                current_line.append(element)
                last_y = element['y0']
            
            if current_line:  # Add the last line
                current_line.sort(key=lambda x: x['x0'])
                lines.append(current_line)
            
            # Build the page content
            page_content = []
            for line in lines:
                line_content = []
                for element in line:
                    if element['type'] == 'text':
                        line_content.append(element['content'])
                    else:  # image
                        line_content.append(element['content'])
                page_content.append(" ".join(line_content).strip())
            
            text_parts.append("\n\n".join(page_content).strip())
        
        # Combine all pages with page breaks
        full_text = "\n\n---\n\n".join(text_parts).strip()
        
        # Replace all placeholders with markdown image tags
        for img in images:
            img_markdown = f"![]({img.data})"
            full_text = full_text.replace(img.placeholder, img_markdown)
        
        return full_text, images, placeholder_map
        
    except Exception as e:
        logger.error(f"Error in PDF processing: {str(e)}")
        raise
        
    finally:
        if doc is not None:
            doc.close()
        try:
            if os.path.exists(temp_pdf_path):
                os.unlink(temp_pdf_path)
        except Exception as e:
            logger.warning(f"Error removing temporary file: {str(e)}")

def beautify_markdown(markdown: str) -> str:
    """
    Enhanced post-processing for professional Markdown:
    - Fixes code block formatting issues
    - Preserves image tags in their exact positions
    - Converts instructional text to proper paragraphs
    - Cleans up accidental code blocks and backticks
    - Maintains proper spacing and indentation
    """
    import re
    
    def clean_line(line: str) -> str:
        """Clean up a single line of markdown."""
        # Remove accidental code blocks (4+ spaces at start of line that aren't in a list)
        if re.match(r'^ {4,}(?![\-*+\d.])', line):
            line = line.lstrip()
            
        # Fix lines that start with backticks but aren't code blocks
        if line.strip().startswith('`') and not line.strip().startswith('```'):
            line = line.replace('`', '').strip()
            
        # Fix lines that look like code blocks but are just text
        if re.match(r'^\s*`[^`]', line) and not re.match(r'^\s*```', line):
            line = line.replace('`', '').strip()
            
        # Fix lines that look like code blocks but are just text with backticks
        if re.match(r'^\s*`[^`]+`\s*$', line):
            line = line.strip('` ')
            
        return line
    
    lines = markdown.splitlines()
    result = []
    in_code_block = False
    in_list = False
    list_indent = 0
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Handle code blocks
        if stripped.startswith('```'):
            in_code_block = not in_code_block
            result.append(line)
            continue
            
        if in_code_block:
            result.append(line)
            continue
            
        # Preserve image tags exactly as they are
        if re.match(r'^!\[.*\]\(.*\)$', stripped):
            if result and result[-1].strip() and not result[-1].startswith(('!', '>', '#')):
                result.append('')  # Add space before image if needed
            result.append(line)
            if i < len(lines) - 1 and lines[i+1].strip() and not lines[i+1].startswith((' ', '\t', '-', '*', '1.', '!')):
                result.append('')  # Add space after image if needed
            continue
            
        # Skip empty lines in the middle of processing
        if not stripped:
            if result and result[-1]:  # Only add one empty line max
                result.append('')
            continue
            
        # Clean up the line
        line = clean_line(line)
        
        # Handle headings
        if re.match(r'^#+\s+', line):
            if result and result[-1]:
                result.append('')
            result.append(line)
            result.append('')
            continue
            
        # Handle lists
        list_match = re.match(r'^(\s*)([•○▪•\-*+]|\d+[.)])\s+(.+)', line)
        if list_match:
            indent, marker, content = list_match.groups()
            current_indent = len(indent)
            
            # Adjust list level
            if current_indent > list_indent + 2:
                current_indent = list_indent + 2
            elif current_indent < list_indent - 2:
                current_indent = max(0, list_indent - 2)
                
            # Create proper list item
            if marker.isdigit() or marker.endswith(('.', ')')):
                line = ' ' * current_indent + '1. ' + content
            else:
                line = ' ' * current_indent + '- ' + content
                
            list_indent = current_indent
            in_list = True
        else:
            # Handle continuation lines in lists
            if in_list and line.startswith('  '):
                line = ' ' * (list_indent + 2) + line.lstrip()
            else:
                in_list = False
                list_indent = 0
        
        # Add the processed line
        if result and not result[-1] and not line.strip():
            continue  # Skip multiple empty lines
            
        result.append(line)
    
    # Final pass to clean up any remaining issues
    final_result = []
    for i, line in enumerate(result):
        # Remove any remaining single backticks that aren't part of code blocks
        if '`' in line and not any(block in line for block in ['```', '`python', '`bash']):
            line = re.sub(r'(?<!`)`(?!`)', "'", line)  # Replace single backticks with single quotes
            
        # Fix any remaining code block issues
        if line.strip() and not line.strip().startswith(('!', '>', '#', '-', '*', '1.', '```')):
            # If line looks like it was meant to be regular text but is indented
            if re.match(r'^\s{4,}', line) and not re.match(r'^\s*\d+\.', line):
                line = line.lstrip()
                
        final_result.append(line)
    
    # Join with proper spacing
    return '\n'.join(final_result).strip() + '\n'

def process_document_with_groq(text: str, images: List[ImageData], filename: str) -> str:
    """Process document text with Groq API and return formatted Markdown.
    
    This function preserves the exact position of images by using placeholders
    that are replaced after the markdown processing is complete.
    """
    if not text.strip() and not images:
        return "# Document Conversion\n\nNo text content could be extracted from the document."
    
    # If there are no images, we can process the text directly
    if not images:
        try:
            client = groq.Client()
            system_prompt = (
                """
You are an expert technical documentation specialist and Markdown formatter. Your job is to transform raw extracted text into beautiful, production-ready Markdown for technical documentation, blog posts, or guides.

**Formatting Rules:**
- Use clear, hierarchical headings (#, ##, ###) for sections and subsections.
- Use bullet ( - ) and numbered ( 1. ) lists for steps, features, or items.
- Use **bold** and *italic* for emphasis where appropriate.
- Use blockquotes ( > ) for notes, warnings, or tips.
- Use code blocks (triple backticks) for commands, code, or configuration.
- Add horizontal rules (---) to separate major sections.
- Add spacing for readability.
- If you see lines like 'Purpose:', 'Steps:', 'NOTE:', etc., convert them to appropriate Markdown (e.g., headings, blockquotes).
- Beautify the output for clarity and easy reading.

**Example Input:**
Purpose:
This tool converts PDF to Markdown.

Steps:
1. Upload your file
2. Wait for conversion
3. Download the Markdown

NOTE: Images are preserved.

**Example Output:**
# Purpose

This tool converts PDF to Markdown.

---

## Steps

1. Upload your file
2. Wait for conversion
3. Download the Markdown

> **Note:** Images are preserved.

---

- Always preserve the order and content of the original text.
- Do NOT move or modify any image markdown or placeholders (e.g., ![](url) or __IMG_PLACEHOLDER_X__).
                """
            )
            user_prompt = f"""Format the following document as beautiful, professional Markdown. Apply all formatting rules above. Do not move or modify any image markdown or placeholders.

Document content:
{text}"""
            # Calculate a safe max_tokens value (leaving room for both input and output)
            estimated_input_tokens = len(system_prompt.split()) + len(user_prompt.split())
            safe_max_tokens = min(4000, 8192 - estimated_input_tokens - 100)  # Leave 100 tokens buffer
            
            if safe_max_tokens < 100:  # If not enough tokens left for a reasonable response
                raise ValueError("Document is too large to process with the current model's context window")
                
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model="llama3-70b-8192",
                temperature=0.1,
                max_tokens=safe_max_tokens,
                top_p=0.9,
                frequency_penalty=0.1,
                presence_penalty=0.1
            )
            markdown_output = chat_completion.choices[0].message.content
            # Verify content preservation
            original_word_count = len(text.split())
            new_word_count = len(markdown_output.split())
            if new_word_count < original_word_count * 0.7:
                raise ValueError("Significant content loss detected during processing")
            markdown_output = beautify_markdown(markdown_output)
            return markdown_output
        except Exception as e:
            logger.error(f"Error processing document with Groq: {str(e)}")
            return f"# {os.path.splitext(filename)[0]}\n\n{text}"
    
    # Process documents with images
    try:
        # Replace image placeholders with temporary markers that won't be modified by Groq
        placeholder_map = {}
        processed_text = text
        for img in images:
            safe_placeholder = f"__IMG_PLACEHOLDER_{len(placeholder_map)}__"
            placeholder_map[safe_placeholder] = f"![]({img.data})\n"
            processed_text = processed_text.replace(img.placeholder, safe_placeholder)
        client = groq.Client()
        system_prompt = (
            """
You are an expert technical documentation specialist and Markdown formatter. Your job is to transform raw extracted text into beautiful, production-ready Markdown for technical documentation, blog posts, or guides.

**Formatting Rules:**
- Use clear, hierarchical headings (#, ##, ###) for sections and subsections.
- Use bullet ( - ) and numbered ( 1. ) lists for steps, features, or items.
- Use **bold** and *italic* for emphasis where appropriate.
- Use blockquotes ( > ) for notes, warnings, or tips.
- Use code blocks (triple backticks) for commands, code, or configuration.
- Add horizontal rules (---) to separate major sections.
- Add spacing for readability.
- If you see lines like 'Purpose:', 'Steps:', 'NOTE:', etc., convert them to appropriate Markdown (e.g., headings, blockquotes).
- Beautify the output for clarity and easy reading.

**Example Input:**
Purpose:
This tool converts PDF to Markdown.

Steps:
1. Upload your file
2. Wait for conversion
3. Download the Markdown

NOTE: Images are preserved.

**Example Output:**
# Purpose

This tool converts PDF to Markdown.

---

## Steps

1. Upload your file
2. Wait for conversion
3. Download the Markdown

> **Note:** Images are preserved.

---

- Always preserve the order and content of the original text.
- Do NOT move or modify any image markdown or placeholders (e.g., ![](url) or __IMG_PLACEHOLDER_X__).
            """
        )
        user_prompt = f"""Format the following document as beautiful, professional Markdown. Apply all formatting rules above. Do not move or modify any image markdown or placeholders.

Document content:
{processed_text}"""
        # Calculate a safe max_tokens value (leaving room for both input and output)
        estimated_input_tokens = len(system_prompt.split()) + len(user_prompt.split())
        safe_max_tokens = min(4000, 8192 - estimated_input_tokens - 100)  # Leave 100 tokens buffer
        
        if safe_max_tokens < 100:  # If not enough tokens left for a reasonable response
            raise ValueError("Document is too large to process with the current model's context window")
            
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="llama3-70b-8192",
            temperature=0.1,
            max_tokens=safe_max_tokens,
            top_p=0.9,
            frequency_penalty=0.1,
            presence_penalty=0.1
        )
        markdown_output = chat_completion.choices[0].message.content
        # Restore the original image markdown
        for placeholder, img_markdown in placeholder_map.items():
            markdown_output = markdown_output.replace(placeholder, img_markdown)
        # Clean up any remaining formatting issues
        markdown_output = markdown_output.replace('---\n', '\n')
        markdown_output = re.sub(r'\n{3,}', '\n\n', markdown_output)
        # Verify content preservation
        original_word_count = len(text.split())
        new_word_count = len(markdown_output.split())
        if new_word_count < original_word_count * 0.7:
            logger.warning("Content loss detected, falling back to basic formatting")
            markdown_output = f"# {os.path.splitext(filename)[0]}\n\n{text}"
            for img in images:
                markdown_output = markdown_output.replace(img.placeholder, f"![]({img.data})\n")
        markdown_output = beautify_markdown(markdown_output)
        return markdown_output
    except Exception as e:
        logger.error(f"Error processing document with Groq: {str(e)}")
        fallback = f"# {os.path.splitext(filename)[0]}\n\n{text}"
        for img in images:
            fallback = fallback.replace(img.placeholder, f"![]({img.data})\n")
        fallback = beautify_markdown(fallback)
        return fallback

@app.post("/api/convert", response_model=ConversionResponse)
async def convert_file(file: UploadFile, request: Request):
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
            # After successful conversion, log to conversion_logs
            user_email = request.headers.get("x-user-email") or "anonymous"
            logger.info(f"Logging conversion for user: {user_email}, file: {filename}")
            
            try:
                # Use the global POSTGRES_DSN
                conn = psycopg2.connect(POSTGRES_DSN)
                cur = conn.cursor()
                
                # First, try to get the user_id from the user1 table
                user_id = None
                if user_email != "anonymous":
                    cur.execute(
                        "SELECT id FROM user1 WHERE email = %s",
                        (user_email,)
                    )
                    user_result = cur.fetchone()
                    if user_result:
                        user_id = user_result[0]
                
                # Insert into conversion_logs
                cur.execute(
                    """
                    INSERT INTO conversion_logs 
                    (user_id, user_email, file_name, original_file_name, conversion_type, status)
                    VALUES (%s, %s, %s, %s, %s, 'completed')
                    RETURNING id, created_at
                    """,
                    (
                        user_id,
                        user_email,
                        filename,
                        filename,  # Assuming original_file_name is the same as filename
                        os.path.splitext(filename)[1].lstrip('.').lower()  # Extract file extension as conversion_type
                    )
                )
                
                # Get the inserted log entry
                log_entry = cur.fetchone()
                logger.info(f"Logged conversion with ID: {log_entry[0] if log_entry else 'unknown'}")
                
                # After logging the conversion, also update last_active for the user
                if user_email != "anonymous":
                    try:
                        conn = psycopg2.connect(POSTGRES_DSN)
                        cur = conn.cursor()
                        cur.execute(
                            "UPDATE user1 SET last_active = NOW() WHERE email = %s",
                            (user_email,)
                        )
                        conn.commit()
                        cur.close()
                        conn.close()
                    except Exception as e:
                        logger.error(f"Failed to update last_active for {user_email}: {str(e)}")
                
                conn.commit()
                cur.close()
                conn.close()
                
            except Exception as e:
                logger.error(f"Failed to log conversion: {str(e)}")
                logger.error(traceback.format_exc())
            
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
        
        return FileResponse(content=content, media_type=mime_type, filename=os.path.basename(file_path))
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