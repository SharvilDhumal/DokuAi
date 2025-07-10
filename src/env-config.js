// Frontend environment configuration
// This file handles environment variables for the browser environment

const getEnvVar = (key, defaultValue = '') => {
  // Try to get from Docusaurus custom fields first
  if (typeof window !== 'undefined' && window.docusaurus) {
    const customFields = window.docusaurus?.customFields;
    if (customFields && customFields[key]) {
      return customFields[key];
    }
  }

  // Fallback to default value
  return defaultValue;
};

// Environment configuration for frontend
export const config = {
  // Authentication API URL
  AUTH_API_URL: getEnvVar('AUTH_API_URL', 'http://localhost:5001/api/auth'),

  // Python backend URL
  BACKEND_URL: getEnvVar('BACKEND_URL', 'http://localhost:5000'),

  // Other environment variables can be added here
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),

  // Frontend URL
  FRONTEND_URL: getEnvVar('FRONTEND_URL', 'http://localhost:3000'),
};

// Export individual config values for easy import
export const AUTH_API_URL = config.AUTH_API_URL;
export const BACKEND_URL = config.BACKEND_URL;
export const NODE_ENV = config.NODE_ENV;
export const FRONTEND_URL = config.FRONTEND_URL;
