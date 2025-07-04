// This file makes environment variables available at runtime
if (typeof window !== 'undefined') {
  window.ENV = window.ENV || {};
  
  // Set default values if not already set
  window.ENV.REACT_APP_API_URL = window.ENV.REACT_APP_API_URL || 
    (typeof process !== 'undefined' && process.env.REACT_APP_API_URL) || 
    'http://localhost:5000';
  
  console.log('Environment variables initialized:', window.ENV);
}
