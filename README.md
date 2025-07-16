# DokuAI: AI-Powered Document to Markdown Converter

DokuAI is a full-stack web application that converts PDF and DOCX documents into clean, professional Markdown with embedded images—powered by AI. It features robust authentication, role-based access, and a modern, responsive UI for technical writers, developers, and teams.

---

## 🚀 Features

- **Upload PDF or DOCX**: Drag-and-drop or select files for conversion.
- **AI-Powered Markdown Formatting**: Uses Groq LLM to produce well-structured, readable Markdown.
- **Image Extraction & Placement**:
  - **DOCX**: Images appear exactly where they do in the original document.
  - **PDF**: Images are placed as close as possible to their original position using a smart heuristic.
- **Live Markdown Preview**: See your converted document with syntax highlighting, styled images, and more.
- **Download or Copy Markdown**: Export your Markdown for use in wikis, codebases, or static site generators.
- **Authentication & Role-Based Access**: Secure login, registration, email verification, password reset, and granular permissions.
- **Audit Logging**: Tracks authentication events for security.
- **Robust Error Handling**: Friendly messages and logging for unsupported files or backend issues.
- **Modern UI**: Responsive, accessible, and customizable with Docusaurus and React.

---

## 🛠️ Tech Stack

- **Frontend**: React (Docusaurus), Marked.js, Highlight.js, React Context API
- **Backend**:
  - **Document Conversion**: Python (FastAPI, Flask), Groq LLM, PyMuPDF, python-docx
  - **Authentication**: Node.js (Express, TypeScript), PostgreSQL, JWT, Nodemailer
- **Storage**: Local file system for uploads and extracted images

---

## 📦 Installation

### Prerequisites

- Python 3.9+
- Node.js 16+ (for frontend), Node.js 18+ (for backend-auth)
- PostgreSQL 12+ (for authentication backend)
- (Optional) Groq API key for AI formatting

### Backend Setup (Document Conversion)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\\Scripts\\activate on Windows
pip install -r requirements.txt
# Set your Groq API key in a .env file:
echo GROQ_API_KEY=your_groq_api_key > .env
python app.py
```

### Authentication Backend Setup

```bash
cd backend-auth
npm install
cp env.example .env  # Edit .env with your DB, JWT, SMTP, and frontend config
# Set up PostgreSQL and run schema.sql as described in backend-auth/README.md
npm run build
npm start
```

### Frontend Setup

```bash
npm install
npm start
```

- The frontend runs on [http://localhost:3000](http://localhost:3000)
- The document conversion backend runs on [http://localhost:5000](http://localhost:5000)
- The authentication backend runs on [http://localhost:5001](http://localhost:5001)

---

## 📝 Usage

1. Go to the upload page.
2. Select or drag a PDF/DOCX file.
3. Wait for the AI to process and preview the Markdown.
4. Copy or download the Markdown for your documentation needs.

---

## 🔒 Authentication & Security

- **User registration with email verification**
- **Secure login with JWT tokens**
- **Password reset via email**
- **Role-based access control (Admin, Editor, Viewer)**
- **Audit logging of authentication events**
- **Rate limiting, CORS, Helmet, and input validation for security**

---

## 📂 Project Structure

```
Intern_project/
│
├── backend/                # Python FastAPI/Flask backend for document conversion
│   ├── app.py
│   ├── requirements.txt
│   ├── uploads/            # Uploaded and processed files
│   └── utils/
│       └── db.ts
│
├── backend-auth/           # Node.js/Express/TypeScript authentication backend
│   ├── src/
│   │   ├── controllers/
│   │   │   └── authController.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── models/
│   │   │   └── userModel.ts
│   │   ├── routes/
│   │   │   └── auth.ts
│   │   ├── utils/
│   │   │   ├── db.ts
│   │   │   └── emailService.ts
│   │   └── server.ts
│   ├── database/
│   │   └── schema.sql
│   ├── package.json
│   ├── README.md
│   ├── quick-setup.bat
│   ├── setup.js
│   └── tsconfig.json
│
├── src/                    # Frontend (Docusaurus/React)
│   ├── components/
│   │   ├── AuthModal/
│   │   │   ├── AuthModal.js
│   │   │   └── AuthModal.module.css
│   │   ├── HomepageFeatures/
│   │   │   ├── index.js
│   │   │   └── styles.module.css
│   │   └── ResetPassword/
│   │       ├── ResetPassword.js
│   │       └── ResetPassword.module.css
│   ├── context/
│   │   └── AuthContext.js
│   ├── css/
│   │   └── custom.css
│   ├── pages/
│   │   ├── index.js
│   │   ├── upload.js
│   │   ├── reset-password.js
│   │   ├── markdownpreview.js
│   │   ├── index.module.css
│   │   └── markdownpreview.module.css
│   └── theme/
│       ├── Navbar/
│       ├── NavbarItem/
│       └── Root.js
│
├── static/                 # Static assets (images, icons, logos)
├── docusaurus.config.js    # Docusaurus site config (footer, navbar, theme, etc.)
├── package.json            # Frontend dependencies and scripts
├── README.md               # Main project documentation
├── AUTHENTICATION_SETUP.md # Additional setup instructions for authentication
├── sidebars.js             # Docusaurus sidebar config
├── .gitignore, package-lock.json, etc.
```

---

## 🧩 How the Pieces Work Together

- **User visits the site** and can register/login (handled by backend-auth and frontend modals).
- **Authenticated users** can upload PDF/DOCX files.
- **Backend (Python)** processes the file, extracts content, and uses AI to generate Markdown.
- **Frontend** displays a live preview and allows users to copy or download the Markdown.
- **Role-based access** ensures only authorized users can upload or manage documents.
- **Audit logs** and security features protect user data and track important events.

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

For questions or support, open an issue or contact the maintainer via [LinkedIn](https://www.linkedin.com/in/sharvil-dhumal).

---

**Note:**

- For detailed authentication backend setup, see `backend-auth/README.md`.
- For database schema, see `backend-auth/database/schema.sql`.
