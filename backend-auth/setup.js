#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up DokuAI Authentication Backend...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
    console.error('❌ Node.js version 18 or higher is required. Current version:', nodeVersion);
    process.exit(1);
}

console.log('✅ Node.js version check passed:', nodeVersion);

// Check if package.json exists
const packagePath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packagePath)) {
    console.error('❌ package.json not found. Please run this script from the backend-auth directory.');
    process.exit(1);
}

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
} catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
}

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
        console.log('\n📝 Creating .env file from template...');
        try {
            fs.copyFileSync(envExamplePath, envPath);
            console.log('✅ .env file created from template');
            console.log('⚠️  Please edit .env file with your configuration before running the server');
        } catch (error) {
            console.error('❌ Failed to create .env file:', error.message);
        }
    } else {
        console.log('\n⚠️  No .env file found. Please create one with the following variables:');
        console.log(`
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
FRONTEND_URL=http://localhost:3000
    `);
    }
} else {
    console.log('✅ .env file already exists');
}

// Check if database schema exists
const schemaPath = path.join(__dirname, 'database', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
    console.log('\n⚠️  Database schema file not found at database/schema.sql');
    console.log('Please ensure the schema file exists before setting up the database');
} else {
    console.log('✅ Database schema file found');
}

// Build the project
console.log('\n🔨 Building the project...');
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Project built successfully');
} catch (error) {
    console.error('❌ Failed to build project:', error.message);
    console.log('⚠️  You can still run the project in development mode with: npm run dev');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Edit the .env file with your configuration');
console.log('2. Set up PostgreSQL database:');
console.log('   - Create database: CREATE DATABASE dokuai_auth;');
console.log('   - Run schema: psql -d dokuai_auth -f database/schema.sql');
console.log('3. Start the server: npm run dev');
console.log('4. Test the API: curl http://localhost:5001/health');
console.log('\n📚 For more information, see README.md'); 