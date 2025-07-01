from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import tempfile
import docx2txt
import PyPDF2
from pdf2image import convert_from_path
from dotenv import load_dotenv
from flask_cors import CORS
import base64
import uuid
import ollama
import traceback
import logging
from logging.handlers import RotatingFileHandler

# Load environment variables
load_dotenv()

# Setup logging
log_formatter = logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]')
log_handler = RotatingFileHandler('app.log', maxBytes=1000000, backupCount=3)
log_handler.setFormatter(log_formatter)
log_handler.setLevel(logging.INFO)

app = Flask(__name__)
app.logger.addHandler(log_handler)
app.logger.setLevel(logging.INFO)

CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'pdf', 'docx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_images_from_pdf(filepath):
    images = []
    try:
        app.logger.info(f"Extracting images from PDF: {filepath}")
        pdf_images = convert_from_path(filepath, dpi=100)  # Lower DPI for faster processing
        for i, image in enumerate(pdf_images):
            img_path = os.path.join(app.config['UPLOAD_FOLDER'], f"pdf_image_{i}.jpg")
            image.save(img_path, 'JPEG', quality=70)  # Reduce quality for smaller size
            
            with open(img_path, "rb") as img_file:
                img_base64 = base64.b64encode(img_file.read()).decode('utf-8')
                images.append({
                    "type": "image/jpeg",
                    "data": img_base64,
                    "description": f"PDF Page {i+1}"
                })
            os.remove(img_path)
    except Exception as e:
        app.logger.error(f"Error extracting PDF images: {str(e)}")
        app.logger.error(traceback.format_exc())
    return images

def extract_images_from_docx(filepath):
    images = []
    try:
        app.logger.info(f"Extracting images from DOCX: {filepath}")
        temp_dir = os.path.join(app.config['UPLOAD_FOLDER'], str(uuid.uuid4()))
        os.makedirs(temp_dir, exist_ok=True)
        
        # Process docx and extract images
        text = docx2txt.process(filepath, temp_dir)
        
        # Collect extracted images
        for img_file in os.listdir(temp_dir):
            if img_file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
                img_path = os.path.join(temp_dir, img_file)
                with open(img_path, "rb") as img_file_obj:
                    img_base64 = base64.b64encode(img_file_obj.read()).decode('utf-8')
                    images.append({
                        "type": f"image/{img_file.split('.')[-1].lower()}",
                        "data": img_base64,
                        "description": f"DOCX Image {len(images)+1}"
                    })
                os.remove(img_path)
        os.rmdir(temp_dir)
    except Exception as e:
        app.logger.error(f"Error extracting DOCX images: {str(e)}")
        app.logger.error(traceback.format_exc())
    return images

def extract_text_from_pdf(filepath):
    text = ""
    try:
        app.logger.info(f"Extracting text from PDF: {filepath}")
        with open(filepath, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                if page.extract_text():
                    text += page.extract_text() + "\n"
    except Exception as e:
        app.logger.error(f"Error extracting PDF text: {str(e)}")
        app.logger.error(traceback.format_exc())
    return text

def extract_text_from_docx(filepath):
    text = ""
    try:
        app.logger.info(f"Extracting text from DOCX: {filepath}")
        text = docx2txt.process(filepath)
    except Exception as e:
        app.logger.error(f"Error extracting DOCX text: {str(e)}")
        app.logger.error(traceback.format_exc())
    return text

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        ollama.list()  # Test connection to Ollama
        app.logger.info("Health check: OK")
        return jsonify({"status": "healthy", "ollama": "connected"})
    except Exception as e:
        app.logger.error(f"Health check failed: {str(e)}")
        return jsonify({"status": "unhealthy", "error": str(e)}), 503

@app.route('/api/convert', methods=['POST'])
def convert_file():
    app.logger.info("Received conversion request")
    if 'file' not in request.files:
        app.logger.warning("No file part in request")
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        app.logger.warning("Empty filename")
        return jsonify({"error": "No selected file"}), 400

    if not file or not allowed_file(file.filename):
        app.logger.warning(f"Invalid file type: {file.filename}")
        return jsonify({"error": "Invalid file type. Only PDF and DOCX allowed."}), 400

    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        app.logger.info(f"Saving file to temporary location: {filepath}")
        file.save(filepath)

        try:
            app.logger.info("Starting document processing")
            if filename.lower().endswith('.pdf'):
                text = extract_text_from_pdf(filepath)
                images = extract_images_from_pdf(filepath)
            else:
                text = extract_text_from_docx(filepath)
                images = extract_images_from_docx(filepath)
            
            app.logger.info(f"Extracted text length: {len(text)}")
            app.logger.info(f"Extracted images count: {len(images)}")

            # Return early if no content was extracted
            if not text and not images:
                app.logger.error("Failed to extract any content from document")
                return jsonify({
                    "error": "Failed to extract content from document. The file might be corrupted or contain no extractable content."
                }), 400
            
            # Process the document
            markdown_output = process_document_with_ollama(text, images)
            
            return jsonify({
                "status": "success",
                "markdown": markdown_output,
                "filename": filename,
                "images_count": len(images)
            })

        except Exception as e:
            app.logger.error(f"Document processing failed: {str(e)}")
            app.logger.error(traceback.format_exc())
            return jsonify({"error": f"Document processing failed: {str(e)}"}), 500
        finally:
            if os.path.exists(filepath):
                os.remove(filepath)
                app.logger.info(f"Temporary file removed: {filepath}")

    except Exception as e:
        app.logger.error(f"Server error: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "Internal server error"}), 500

def process_document_with_ollama(text, images):
    """Process document content using Ollama in chunks"""
    # Process images first to create placeholders
    image_placeholders = {}
    for idx, img in enumerate(images):
        placeholder = f"[IMAGE_{idx}]"
        image_placeholders[placeholder] = (
            f"![{img['description']}](data:{img['type']};base64,{img['data']})"
        )
    
    # Split text into manageable chunks
    max_chars = 2000  # Reduced chunk size for stability
    text_chunks = [text[i:i+max_chars] for i in range(0, len(text), max_chars)]
    
    markdown_parts = []
    
    # Process each text chunk
    for i, chunk in enumerate(text_chunks):
        app.logger.info(f"Processing chunk {i+1}/{len(text_chunks)}")
        
        # Inject image placeholders into text
        processed_chunk = chunk
        for placeholder in image_placeholders:
            if placeholder in chunk:
                processed_chunk = processed_chunk.replace(placeholder, "")
        
        prompt = f"""
Convert this document part ({i+1}/{len(text_chunks)}) into well-structured Markdown. Follow these guidelines:

1. Preserve all headings, lists, tables, and code blocks
2. For images, use placeholders like [IMAGE_0] exactly as they appear
3. Maintain original document structure
4. Format tables as Markdown tables
5. Use code blocks for code snippets

Document content:
{processed_chunk}

Return ONLY the Markdown content, no additional commentary.
"""
        try:
            response = ollama.generate(
                model='llama3',
                prompt=prompt,
                options={'temperature': 0.3, 'num_ctx': 8192}
            )
            markdown_parts.append(response['response'])
        except Exception as e:
            app.logger.error(f"Error processing chunk {i+1}: {str(e)}")
            # Fallback to plain text if processing fails
            markdown_parts.append(f"```\n{chunk}\n```")
    
    # Combine all parts
    markdown_output = "\n\n".join(markdown_parts)
    
    # Replace image placeholders with actual images
    for placeholder, img_tag in image_placeholders.items():
        markdown_output = markdown_output.replace(placeholder, img_tag)
    
    return markdown_output

if __name__ == '__main__':
    app.logger.info("Starting application")
    app.run(host='0.0.0.0', port=5000, debug=False)