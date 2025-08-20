// Frontend environment configuration
// This file handles environment variables for the browser environment

const getEnvVar = (key, defaultValue = '') => {
  // Try to get from environment variables first
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[`REACT_APP_${key}`] !== undefined) {
      return process.env[`REACT_APP_${key}`];
    }
  }

  // Try to get from Docusaurus custom fields
  if (typeof window !== 'undefined' && window.docusaurus) {
    const customFields = window.docusaurus?.customFields;
    if (customFields && customFields[key] !== undefined) {
      return customFields[key];
    }
  }

  // Fallback to default value
  return defaultValue;
};

// Environment configuration for frontend
const config = {
  // Authentication API URL (Node.js backend)
  AUTH_API_URL: getEnvVar('AUTH_API_URL', 'http://localhost:5001/api/auth'),
  
  // Admin API base URL (same as auth but without /api/auth)
  ADMIN_API_URL: getEnvVar('ADMIN_API_URL', 'http://localhost:5001'),

  // Python backend URL (FastAPI)
  BACKEND_URL: getEnvVar('BACKEND_URL', 'http://localhost:5000'),

  // Environment
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  IS_DEVELOPMENT: getEnvVar('NODE_ENV', 'development') === 'development',
  IS_PRODUCTION: getEnvVar('NODE_ENV', 'development') === 'production',

  // Frontend URL
  FRONTEND_URL: getEnvVar('FRONTEND_URL', 'http://localhost:3001'),
};

// Export individual variables for easier imports
export const {
  AUTH_API_URL,
  ADMIN_API_URL,
  BACKEND_URL,
  NODE_ENV,
  IS_DEVELOPMENT,
  IS_PRODUCTION,
  FRONTEND_URL
} = config;

export default config;
