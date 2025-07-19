---
description: Repository Information Overview
alwaysApply: true
---

# DokuAI Repository Information

## Repository Summary

DokuAI is a full-stack web application that converts PDF and DOCX documents into clean, professional Markdown with embedded images using AI. It features authentication, role-based access, and a responsive UI built with Docusaurus/React.

## Repository Structure

- **frontend (root)**: Docusaurus-based React application
- **backend**: Python FastAPI/Flask service for document conversion
- **backend-auth**: Node.js/TypeScript authentication service
- **docs**: Documentation content for the Docusaurus site
- **blog**: Blog content for the Docusaurus site
- **static**: Static assets (images, icons, logos)
- **src**: Frontend React components, pages, and theme customizations
- **uploads**: Storage for uploaded and processed files

## Projects

### Frontend (Docusaurus)

**Configuration File**: package.json, docusaurus.config.js

#### Language & Runtime

**Language**: JavaScript/React
**Version**: React 19.0.0
**Build System**: Docusaurus
**Package Manager**: npm

#### Dependencies

**Main Dependencies**:

- @docusaurus/core: 3.8.1
- react: 19.0.0
- react-dom: 19.0.0
- axios: 1.10.0
- marked: 16.0.0
- react-markdown: 10.1.0
- bootstrap: 5.3.7
- chart.js: 4.5.0

#### Build & Installation

```bash
npm install
npm start    # Development server
npm run build # Production build
```

### Backend (Document Conversion)

**Configuration File**: requirements.txt, app.py

#### Language & Runtime

**Language**: Python
**Version**: Python 3.9+
**Framework**: FastAPI, Flask

#### Dependencies

**Main Dependencies**:

- fastapi: 0.115.14
- flask: 3.1.1
- flask-cors: 6.0.1
- groq: 0.29.0
- pdf2image: 1.17.0
- PyPDF2: 3.0.1
- python-docx: 1.1.2
- pillow: 11.2.1
- uvicorn
- psycopg2 # Missing dependency

#### Build & Installation

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
# If psycopg2 installation fails, try psycopg2-binary instead:
pip install psycopg2-binary
python app.py
```

### Backend-Auth (Authentication Service)

**Configuration File**: package.json, tsconfig.json

#### Language & Runtime

**Language**: TypeScript
**Version**: Node.js 18+
**Framework**: Express
**Database**: PostgreSQL

#### Dependencies

**Main Dependencies**:

- express: 4.18.2
- bcrypt: 5.1.0
- jsonwebtoken: 9.0.0
- pg: 8.11.0
- nodemailer: 6.9.0
- cors: 2.8.5
- dotenv: 16.0.0

**Development Dependencies**:

- typescript: 5.0.0
- ts-node: 10.9.0
- nodemon: 3.0.0

#### Build & Installation

```bash
cd backend-auth
npm install
# Configure .env file with database, JWT, SMTP settings
npm run build
npm start
```

#### Database

**Type**: PostgreSQL 12+
**Schema**: backend-auth/database/schema.sql
**Setup**:

```bash
# Run the schema.sql script to create required tables
# Configure connection in .env file
```

## Integration Points

### API Endpoints

- **Document Conversion**: http://localhost:5000
- **Authentication**: http://localhost:5001/api/auth
- **Frontend**: http://localhost:3000

### Authentication Flow

- User registration with email verification
- Secure login with JWT tokens
- Password reset via email
- Role-based access control (Admin, Editor, Viewer)

### Document Processing Flow

1. User uploads PDF/DOCX files
2. Backend processes the file, extracts content and images
3. AI (Groq) generates formatted Markdown
4. Frontend displays live preview with syntax highlighting
