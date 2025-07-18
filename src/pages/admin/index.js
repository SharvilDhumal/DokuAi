import React, { useEffect, useState } from 'react';
import AdminPanel from '../admin-panel';
import Layout from '@theme/Layout';

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        if (!token) {
          window.location.href = '/login';
          return;
        }
        
        // Verify token with backend
        const response = await fetch('http://localhost:5001/api/auth/verify-token', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          mode: 'cors'
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();
        if (!data.success || (data.role !== 'admin' && data.user?.role !== 'admin')) {
          throw new Error('Admin access required');
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Authentication check failed:', error);
        setError('You must be logged in as an admin to access this page.');
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <Layout title="Loading..." description="Admin Panel">
        <div className="container margin-vert--xl">
          <div className="row">
            <div className="col col--6 col--offset-3">
              <div className="text--center">
                <div className="spinner"></div>
                <p>Loading admin panel...</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Access Denied" description="Admin Panel">
        <div className="container margin-vert--xl">
          <div className="row">
            <div className="col col--6 col--offset-3">
              <div className="alert alert--danger">
                <h3>Access Denied</h3>
                <p>{error}</p>
                <a href="/" className="button button--primary">Return to Home</a>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Panel" description="Admin Dashboard">
      <AdminPanel />
    </Layout>
  );
}
