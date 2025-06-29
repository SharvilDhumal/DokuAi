from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import tempfile
import docx2txt
import PyPDF2
from dotenv import load_dotenv
from flask_cors import CORS
import requests

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

groq_api_key = os.getenv('GROQ_API_KEY')

UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'pdf', 'docx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(filepath):
    text = ""
    with open(filepath, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

def extract_text_from_docx(filepath):
    return docx2txt.process(filepath)

@app.route('/api/convert', methods=['POST'])
def convert_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        try:
            # Extract text based on file type
            if filename.endswith('.pdf'):
                text = extract_text_from_pdf(filepath)
            else:
                text = extract_text_from_docx(filepath)

            prompt = f"""Convert this document into well-structured Markdown format.
Preserve all important information, headings, lists, and formatting.
Use appropriate Markdown syntax for headings, lists, code blocks, etc.

Document content:
{text}
"""

            # Call Groq API
            groq_url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json"
            }
            data = {
                "model": "llama3-70b-8192",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 4096,
                "temperature": 0.2
            }
            response = requests.post(groq_url, headers=headers, json=data)
            if response.status_code != 200:
                return jsonify({"error": response.text}), 500

            markdown_output = response.json()["choices"][0]["message"]["content"]

            return jsonify({
                "status": "success",
                "markdown": markdown_output,
                "filename": filename
            })

        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            if os.path.exists(filepath):
                os.remove(filepath)
    else:
        return jsonify({"error": "Invalid file type. Only PDF and DOCX allowed."}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)