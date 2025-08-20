# DokuAI Authentication Backend

A complete authentication system built with Node.js, Express, and PostgreSQL for the DokuAI project.

## Features

- ✅ User registration with email verification
- ✅ Secure login with JWT tokens
- ✅ Password reset functionality
- ✅ Email verification system
- ✅ Role-based access control
- ✅ Rate limiting and security middleware
- ✅ PostgreSQL database with audit logging
- ✅ Comprehensive error handling

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- SMTP email service (Gmail, SendGrid, etc.)

## Installation

1. **Clone and navigate to the auth backend directory:**

   ```bash
   cd backend-auth
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp env.example .env
   ```

   Edit `.env` file with your configuration:

   ```env
   # Database Configuration
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=dokuai_auth
   DB_PASSWORD=your_password_here
   DB_PORT=5432

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

   # SMTP Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password

   # Server Configuration
   PORT=5001
   NODE_ENV=development

   # Frontend URL
   FRONTEND_URL=http://localhost:3001
   ```

4. **Set up PostgreSQL database:**

   Create a new database:

   ```sql
   CREATE DATABASE dokuai_auth;
   ```

   Run the schema script:

   ```bash
   psql -d dokuai_auth -f database/schema.sql
   ```

5. **Build the project:**
   ```bash
   npm run build
   ```

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:5001` (or the port specified in your .env file).

## API Endpoints

### Authentication Endpoints

| Method | Endpoint                       | Description               |
| ------ | ------------------------------ | ------------------------- |
| POST   | `/api/auth/register`           | Register a new user       |
| POST   | `/api/auth/login`              | Login user                |
| POST   | `/api/auth/forgot-password`    | Request password reset    |
| POST   | `/api/auth/reset-password`     | Reset password with token |
| GET    | `/api/auth/verify-reset-token` | Verify reset token        |
| GET    | `/api/auth/verify-email`       | Verify email with token   |
| GET    | `/api/auth/verify-token`       | Verify JWT token          |

### Health Check

| Method | Endpoint  | Description          |
| ------ | --------- | -------------------- |
| GET    | `/health` | Server health status |

## Database Schema

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

## Email Configuration

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password
3. Use the App Password in your SMTP_PASS environment variable

### Other SMTP Providers

Update the SMTP configuration in your `.env` file:

```env
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

## Security Features

- **Password Hashing**: Uses bcrypt with salt rounds of 10
- **JWT Tokens**: Secure token-based authentication
- **Rate Limiting**: Prevents brute force attacks
- **CORS Protection**: Configured for frontend domain
- **Helmet**: Security headers middleware
- **Input Validation**: Comprehensive form validation
- **SQL Injection Prevention**: Parameterized queries
- **Audit Logging**: Tracks authentication events

## Testing

### Manual Testing

1. **Register a new user:**

   ```bash
   curl -X POST http://localhost:5001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

2. **Login:**

   ```bash
   curl -X POST http://localhost:5001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

3. **Request password reset:**
   ```bash
   curl -X POST http://localhost:5001/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com"
     }'
   ```

## Frontend Integration

The authentication system is designed to work with the DokuAI frontend. The frontend components are located in:

- `src/components/AuthModal/` - Login/Register modal
- `src/components/ResetPassword/` - Password reset component
- `src/context/AuthContext.js` - Authentication context

## Environment Variables

| Variable     | Description         | Required | Default               |
| ------------ | ------------------- | -------- | --------------------- |
| DB_USER      | PostgreSQL username | Yes      | -                     |
| DB_HOST      | PostgreSQL host     | Yes      | localhost             |
| DB_NAME      | Database name       | Yes      | dokuai_auth           |
| DB_PASSWORD  | PostgreSQL password | Yes      | -                     |
| DB_PORT      | PostgreSQL port     | No       | 5432                  |
| JWT_SECRET   | JWT signing secret  | Yes      | -                     |
| SMTP_HOST    | SMTP server host    | Yes      | -                     |
| SMTP_PORT    | SMTP server port    | No       | 587                   |
| SMTP_USER    | SMTP username       | Yes      | -                     |
| SMTP_PASS    | SMTP password       | Yes      | -                     |
| PORT         | Server port         | No       | 5001                  |
| NODE_ENV     | Environment         | No       | development           |
| FRONTEND_URL | Frontend URL        | No       | http://localhost:3001 |

## Troubleshooting

### Common Issues

1. **Database Connection Error**

   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Email Not Sending**

   - Verify SMTP credentials
   - Check firewall settings
   - For Gmail, ensure App Password is used

3. **JWT Token Issues**

   - Ensure JWT_SECRET is set
   - Check token expiration settings

4. **CORS Errors**
   - Verify FRONTEND_URL in `.env`
   - Check CORS configuration in server.ts

### Logs

Check the console output for detailed error messages. The server logs all authentication events and errors.

## Production Deployment

1. **Set NODE_ENV=production**
2. **Use strong JWT_SECRET**
3. **Configure proper SMTP settings**
4. **Set up SSL/TLS**
5. **Configure proper CORS origins**
6. **Set up database backups**
7. **Configure monitoring and logging**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
