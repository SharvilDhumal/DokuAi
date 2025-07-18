-- DokuAI Authentication Database Schema
-- Run this script to create the necessary tables and indexes

-- Create users table
CREATE TABLE IF NOT EXISTS user1 (
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
CREATE INDEX IF NOT EXISTS idx_user1_email ON user1(email);
CREATE INDEX IF NOT EXISTS idx_user1_verification_token ON user1(verification_token);
CREATE INDEX IF NOT EXISTS idx_user1_reset_token ON user1(reset_token);
CREATE INDEX IF NOT EXISTS idx_user1_role ON user1(role);
CREATE INDEX IF NOT EXISTS idx_user1_created_at ON user1(created_at);

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
    BEFORE UPDATE ON user1 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
-- You should change this password in production
INSERT INTO user1 (name, email, password, role, is_verified) 
VALUES (
    'user1', 
    'admin@dokuai.com', 
    '$2b$10$rQZ9X8vK7mN3pL2qR5tY6uI1oA4sB7cD9eF0gH1iJ2kL3mN4oP5qR6sT7uV8wX9yZ0aA1bB2cC3dD4eE5fF6gG7hH8iI9jJ0kK1lL2mM3nN4oO5pP6qQ7rR8sS9tT0uU1vV2wW3xX4yY5zZ',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- Create audit log table for security tracking
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES user1(id) ON DELETE SET NULL,
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

-- Table to log document conversions for admin panel activity tracking
CREATE TABLE IF NOT EXISTS conversion_logs (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user; 

CREATE TABLE IF NOT EXISTS site_visits (
    id SERIAL PRIMARY KEY,
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user1 ADD COLUMN IF NOT EXISTS last_active TIMESTAMP; 