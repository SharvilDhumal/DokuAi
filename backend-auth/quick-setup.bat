@echo off
echo ========================================
echo   DokuAI Authentication Setup Script
echo ========================================
echo.

echo Checking prerequisites...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js is installed

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is not installed!
    echo Please install PostgreSQL from: https://www.postgresql.org/download/windows/
    echo.
    echo After installing PostgreSQL, run this script again.
    pause
    exit /b 1
)
echo ✅ PostgreSQL is installed

echo.
echo ========================================
echo   Installing Dependencies
echo ========================================
npm install

echo.
echo ========================================
echo   Setup Instructions
echo ========================================
echo.
echo 1. Install DBeaver from: https://dbeaver.io/download/
echo 2. Open DBeaver and create a PostgreSQL connection:
echo    - Host: localhost
echo    - Port: 5432
echo    - Database: postgres
echo    - Username: postgres
echo    - Password: [your PostgreSQL password]
echo.
echo 3. Create a new database named 'dokuai_auth'
echo.
echo 4. Run the SQL schema from: backend-auth/database/schema.sql
echo.
echo 5. Create a .env file in backend-auth directory with your configuration
echo.
echo 6. Start the authentication server:
echo    cd backend-auth
echo    npm run dev
echo.
echo For detailed instructions, see: backend-auth/DATABASE_SETUP.md
echo.
pause 