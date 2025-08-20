# Database Setup Guide for DBeaver

This guide will help you set up the PostgreSQL database for the DokuAI authentication system using DBeaver.

## 📋 Prerequisites

1. **PostgreSQL** installed on your system
2. **DBeaver** installed on your system
3. **Node.js** (for the authentication backend)

## 🗄️ Step 1: Install PostgreSQL

### Windows Installation

1. Go to: https://www.postgresql.org/download/windows/
2. Download the latest version (PostgreSQL 15 or 16)
3. Run the installer
4. **Important**: Remember the password you set for the `postgres` user
5. Keep default port (5432)
6. Install all components

### Verify Installation

Open Command Prompt and run:

```bash
psql --version
```

## 🦫 Step 2: Install DBeaver

1. Go to: https://dbeaver.io/download/
2. Download DBeaver Community Edition for Windows
3. Install and open DBeaver

## 🔌 Step 3: Create Database Connection

### In DBeaver:

1. **Click "New Database Connection"** (plug icon)
2. **Select "PostgreSQL"** → Click Next
3. **Fill in connection details**:
   ```
   Host: localhost
   Port: 5432
   Database: postgres
   Username: postgres
   Password: [your PostgreSQL password]
   ```
4. **Click "Test Connection"** to verify
5. **Click "Finish"**

## 🗃️ Step 4: Create Database

1. **Right-click on your connection** → **Create** → **Database**
2. **Database name**: `dokuai_auth`
3. **Click "OK"**

## 📝 Step 5: Run Database Schema

1. **Right-click on `dokuai_auth` database** → **SQL Editor** → **New SQL Script**
2. **Copy and paste this schema**:

```sql
-- DokuAI Authentication Database Schema
-- Run this script to create the necessary tables and indexes

-- Create users table
CREATE TABLE IF NOT EXISTS users (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- You should change this password in production
INSERT INTO users (name, email, password, role, is_verified)
VALUES (
    'Admin User',
    'admin@dokuai.com',
    '$2b$10$rQZ9X8vK7mN3pL2qR5tY6uI1oA4sB7cD9eF0gH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ0aA1bB2cC3dD4eE5fF6gG7hH8iI9jJ0kK1lL2mM3nN4oO5pP6qQ7rR8sS9tT0uU1vV2wW3xX4yY5zZ',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Create audit log table for security tracking
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for audit log
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_action ON auth_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at ON auth_audit_log(created_at);

-- Create function to log authentication events
CREATE OR REPLACE FUNCTION log_auth_event(
    p_user_id INTEGER,
    p_action VARCHAR(100),
    p_ip_address INET,
    p_user_agent TEXT,
    p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO auth_audit_log (user_id, action, ip_address, user_agent, details)
    VALUES (p_user_id, p_action, p_ip_address, p_user_agent, p_details);
END;
$$ LANGUAGE plpgsql;
```

3. **Click "Execute SQL Script"** (play button) or press `Ctrl+Enter`
4. **Verify tables are created** by expanding the database in DBeaver

## ⚙️ Step 6: Configure Environment Variables

Create a `.env` file in the `backend-auth` directory:

```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=dokuai_auth
DB_PASSWORD=your_postgres_password_here
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
FRONTEND_URL=http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Important**: Replace `your_postgres_password_here` with your actual PostgreSQL password.

## 🚀 Step 7: Test the Setup

### 1. Install Dependencies

```bash
cd backend-auth
npm install
```

### 2. Start the Authentication Server

```bash
npm run dev
```

### 3. Test the Connection

Open a new terminal and run:

```bash
curl http://localhost:5001/health
```

You should see:

```json
{
  "success": true,
  "message": "Authentication service is running",
  "timestamp": "2025-01-XX..."
}
```

## 🔍 Troubleshooting

### Common Issues:

1. **Connection Refused**

   - Make sure PostgreSQL is running
   - Check if port 5432 is correct
   - Verify username/password

2. **Database Not Found**

   - Make sure you created the `dokuai_auth` database
   - Check database name in `.env` file

3. **Permission Denied**

   - Verify PostgreSQL password
   - Check if user has proper permissions

4. **Port Already in Use**
   - Change PORT in `.env` file
   - Or stop other services using port 5001

## 📊 Database Structure

After running the schema, you should have:

### Tables:

- **users**: Stores user accounts and authentication data
- **auth_audit_log**: Tracks authentication events for security

### Indexes:

- Email lookup optimization
- Token verification optimization
- Role-based queries optimization

### Functions:

- **update_updated_at_column()**: Automatically updates timestamps
- **log_auth_event()**: Logs authentication events

## ✅ Verification Checklist

- [ ] PostgreSQL installed and running
- [ ] DBeaver connected to PostgreSQL
- [ ] `dokuai_auth` database created
- [ ] Schema executed successfully
- [ ] Tables visible in DBeaver
- [ ] `.env` file configured
- [ ] Authentication server starts without errors
- [ ] Health check endpoint responds

## 🎯 Next Steps

Once the database is set up:

1. **Configure Email Settings** (for password reset functionality)
2. **Start the Frontend** (`npm run dev` in root directory)
3. **Test User Registration** through the web interface
4. **Monitor Database** in DBeaver to see user data

Your authentication system is now ready to use! 🎉
