# DokuAI: AI-Powered Document to Markdown Converter

DokuAI is a web application that converts PDF and DOCX documents into clean, professional Markdown with embedded images—powered by AI. It’s designed for technical writers, developers, and teams who want to migrate or maintain documentation in Markdown-based systems.

---

## 🚀 Features

- **Upload PDF or DOCX**: Drag-and-drop or select files for conversion.
- **AI-Powered Markdown Formatting**: Uses Groq LLM to produce well-structured, readable Markdown.
- **Image Extraction & Placement**:
  - **DOCX**: Images appear exactly where they do in the original document.
  - **PDF**: Images are placed as close as possible to their original position using a smart heuristic.
- **Live Markdown Preview**: See your converted document with syntax highlighting, styled images, and more.
- **Download or Copy Markdown**: Export your Markdown for use in wikis, codebases, or static site generators.
- **Robust Error Handling**: Friendly messages and logging for unsupported files or backend issues.

---

## 🖼️ Screenshots

> _Add screenshots here of the upload page, preview, and a sample Markdown output!_

---

## 🛠️ Tech Stack

- **Frontend**: React (Docusaurus), Marked.js, Highlight.js
- **Backend**: Python (FastAPI), python-docx, PyMuPDF (fitz), Groq LLM API
- **Storage**: Local file system for uploads and extracted images

---

## 📦 Installation

### Prerequisites

- Python 3.9+
- Node.js 16+
- (Optional) Groq API key for AI formatting

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\\Scripts\\activate on Windows
pip install -r requirements.txt
# Set your Groq API key in a .env file:
echo GROQ_API_KEY=your_groq_api_key > .env
python app.py
```

### Frontend Setup

```bash
npm install
npm start
```

- The frontend will run on [http://localhost:3000](http://localhost:3000)
- The backend API runs on [http://localhost:5000](http://localhost:5000)

---

## 📝 Usage

1. Go to the upload page.
2. Select or drag a PDF/DOCX file.
3. Wait for the AI to process and preview the Markdown.
4. Copy or download the Markdown for your documentation needs.

---

## 🤖 How It Works

- **Text & Image Extraction**: The backend parses the document, extracting text and images.
- **AI Formatting**: The extracted content is sent to Groq LLM, which formats it into Markdown, preserving structure and technical details.
- **Smart Image Placement**: For PDFs, images are placed after the most relevant paragraph using a Y-coordinate heuristic.
- **Preview & Export**: The frontend renders the Markdown with enhanced styling and lets you copy or download the result.

---

## 📄 License

MIT License

---

## 🙏 Acknowledgements

- [Groq](https://groq.com/) for LLM API
- [PyMuPDF](https://pymupdf.readthedocs.io/) for PDF parsing
- [python-docx](https://python-docx.readthedocs.io/) for DOCX parsing
- [Marked.js](https://marked.js.org/) and [Highlight.js](https://highlightjs.org/) for Markdown rendering

---

## 💡 Contributing

Pull requests and issues are welcome! Please open an issue for feature requests or bug reports.

---

## 📫 Contact

For questions or support, open an issue or contact the maintainer.
