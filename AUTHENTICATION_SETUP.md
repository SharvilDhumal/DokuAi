# DokuAI Authentication System Setup Guide

This guide will help you set up the complete authentication system for your DokuAI project, including both backend and frontend components.

## 🏗️ Project Structure

```
intern_project/
├── backend-auth/           # Node.js authentication backend
│   ├── src/
│   │   ├── controllers/    # Authentication controllers
│   │   ├── middleware/     # Auth middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Database & email utilities
│   │   └── server.ts       # Main server file
│   ├── database/
│   │   └── schema.sql      # PostgreSQL schema
│   ├── package.json        # Backend dependencies
│   ├── tsconfig.json       # TypeScript config
│   ├── setup.js           # Setup script
│   └── README.md          # Backend documentation
├── src/
│   ├── components/
│   │   ├── AuthModal/      # Login/Register modal
│   │   └── ResetPassword/  # Password reset component
│   ├── context/
│   │   └── AuthContext.js  # Authentication context
│   └── pages/
│       └── index.js        # Updated homepage with auth
└── backend/               # Existing Python backend
```

## 🚀 Quick Start

### 1. Backend Setup

```bash
# Navigate to the auth backend directory
cd backend-auth

# Run the setup script
node setup.js

# Or manually install dependencies
npm install

# Create environment file
cp env.example .env
```

### 2. Database Setup

```bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE dokuai_auth;
\q

# Run the schema
psql -d dokuai_auth -f database/schema.sql
```

### 3. Environment Configuration

Edit `backend-auth/.env`:

```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=dokuai_auth
DB_PASSWORD=your_password_here
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# SMTP Configuration (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Server Configuration
PORT=5001
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Start the Authentication Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 5. Frontend Integration

The frontend components are already integrated into your existing Docusaurus project. The authentication system will work alongside your existing Python backend.

## 📧 Email Configuration

### Gmail Setup

1. **Enable 2-Factor Authentication**

   - Go to Google Account settings
   - Enable 2-Step Verification

2. **Generate App Password**

   - Go to Security settings
   - Select "App passwords"
   - Generate a new app password for "Mail"
   - Use this password in your SMTP_PASS environment variable

3. **Test Email Configuration**
   ```bash
   curl -X POST http://localhost:5001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "your-email@gmail.com",
       "password": "password123"
     }'
   ```

### Other Email Providers

Update your `.env` file with your SMTP provider's settings:

```env
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

## 🔧 API Testing

### Test Registration

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Password Reset

```bash
curl -X POST http://localhost:5001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

## 🌐 Frontend Features

### Authentication Modal

- **Location**: `src/components/AuthModal/AuthModal.js`
- **Features**:
  - Login/Register toggle
  - Email verification
  - Password visibility toggle
  - Form validation
  - Forgot password functionality
  - Toast notifications

### Password Reset

- **Location**: `src/components/ResetPassword/ResetPassword.js`
- **Features**:
  - Token validation
  - Password strength requirements
  - Confirmation password
  - Success/error handling

### Authentication Context

- **Location**: `src/context/AuthContext.js`
- **Features**:
  - Global auth state management
  - Token persistence
  - Automatic token verification
  - User session management

## 🔒 Security Features

### Backend Security

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ Audit logging

### Frontend Security

- ✅ Secure token storage
- ✅ Automatic token verification
- ✅ Form validation
- ✅ XSS protection
- ✅ CSRF protection via same-origin policy

## 📊 Database Schema

### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMP,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Audit Log Table

```sql
CREATE TABLE auth_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Deployment

### Development

```bash
# Backend
cd backend-auth
npm run dev

# Frontend (in another terminal)
npm run dev
```

### Production

```bash
# Build backend
cd backend-auth
npm run build
npm start

# Build frontend
npm run build
npm run serve
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Error**

   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql

   # Test connection
   psql -U postgres -d dokuai_auth
   ```

2. **Email Not Sending**

   ```bash
   # Check SMTP settings
   # For Gmail, ensure App Password is used
   # Check firewall settings
   ```

3. **CORS Errors**

   - Verify FRONTEND_URL in `.env`
   - Check browser console for CORS errors
   - Ensure both servers are running

4. **JWT Token Issues**
   - Ensure JWT_SECRET is set
   - Check token expiration
   - Verify token format in requests

### Logs

- Backend logs: Check console output
- Database logs: `tail -f /var/log/postgresql/postgresql-*.log`
- Frontend logs: Browser developer tools

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint                       | Description    | Request Body                |
| ------ | ------------------------------ | -------------- | --------------------------- |
| POST   | `/api/auth/register`           | Register user  | `{name, email, password}`   |
| POST   | `/api/auth/login`              | Login user     | `{email, password}`         |
| POST   | `/api/auth/forgot-password`    | Request reset  | `{email}`                   |
| POST   | `/api/auth/reset-password`     | Reset password | `{token, newPassword}`      |
| GET    | `/api/auth/verify-reset-token` | Verify token   | `?token=xxx`                |
| GET    | `/api/auth/verify-email`       | Verify email   | `?token=xxx`                |
| GET    | `/api/auth/verify-token`       | Verify JWT     | `Authorization: Bearer xxx` |

### Response Format

```json
{
  "success": true,
  "message": "Operation successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com",
    "role": "user",
    "is_verified": true
  }
}
```

## 🎯 Next Steps

1. **Customize the UI**: Modify the CSS in `AuthModal.module.css` and `ResetPassword.module.css`
2. **Add Role-Based Features**: Implement role-based access control in your existing components
3. **Integrate with Python Backend**: Connect the auth system with your existing FastAPI backend
4. **Add More Security**: Implement additional security features like IP blocking, session management
5. **Monitoring**: Set up logging and monitoring for production deployment

## 📞 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the logs for error messages
3. Verify all environment variables are set correctly
4. Ensure PostgreSQL is running and accessible
5. Test email configuration with a simple curl request

## 🔄 Updates

To update the authentication system:

1. **Backend Updates**

   ```bash
   cd backend-auth
   git pull origin main
   npm install
   npm run build
   ```

2. **Frontend Updates**
   ```bash
   # Update components in src/components/
   # Restart the development server
   npm run dev
   ```

---

**🎉 Congratulations!** Your DokuAI project now has a complete, secure authentication system with PostgreSQL database integration.
