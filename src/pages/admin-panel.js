import React, { useState, useEffect } from 'react';
import Layout from "@theme/Layout";
import styles from "./index.module.css";
import { useAuth } from "../context/AuthContext";
import { Redirect } from '@docusaurus/router';
import { AUTH_API_URL, ADMIN_API_URL } from '../env-config';

// Log environment variables for debugging
console.log('Environment variables:', { AUTH_API_URL, ADMIN_API_URL });

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error in admin panel:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container margin-vert--xl">
          <div className="row">
            <div className="col col--6 col--offset-3">
              <div className="alert alert--danger">
                <h3>Something went wrong</h3>
                <p>An error occurred while loading the admin panel. Please try again later.</p>
                <button 
                  className="button button--primary" 
                  onClick={() => window.location.reload()}
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AdminPanelContent() {
    const { user, isAuthenticated } = useAuth();
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [shouldRedirect, setShouldRedirect] = useState(false);

    useEffect(() => {
        const checkAdminAccess = async () => {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setError("No authentication token found. Please log in again.");
                setShouldRedirect(true);
                return false;
            }

            try {
                // Verify token with backend - use the full URL including /api/auth
                const verifyUrl = `${AUTH_API_URL}/verify-token`;
                console.log('Verifying token at:', verifyUrl);
                
                const response = await fetch(verifyUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include'
                });

                const data = await response.json();
                console.log('Token verification response:', { status: response.status, data });
                
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Token verification failed');
                }

                // Check if user has admin role
                const userRole = data.role || (data.user && data.user.role);
                console.log('User role from token:', userRole);
                
                if (userRole !== 'admin') {
                    setError("Unauthorized: Admin access only");
                    setLoading(false);
                    return false;
                }
                
                return true;
                
            } catch (err) {
                console.error('Error verifying admin access:', err);
                setError(`Failed to verify admin access: ${err.message}`);
                setShouldRedirect(true);
                return false;
            }
        };

        const fetchData = async () => {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setError("No authentication token found. Please log in again.");
                setShouldRedirect(true);
                return;
            }

            try {
                setLoading(true);
                setError("");
                
                const token = localStorage.getItem("authToken");
                if (!token) {
                    setError("No authentication token found. Please log in again.");
                    setShouldRedirect(true);
                    return;
                }

                // Check admin access first
                const hasAccess = await checkAdminAccess();
                if (!hasAccess) return;

                // Get fresh token for each request
                const freshToken = localStorage.getItem("authToken");
                if (!freshToken) {
                    throw new Error('No authentication token found');
                }

                // Use the correct API endpoints
                const statsUrl = `${ADMIN_API_URL}/api/admin/stats`;
                const logsUrl = `${ADMIN_API_URL}/api/admin/logs`;
                
                console.log('Fetching admin stats from:', statsUrl);
                console.log('Fetching admin logs from:', logsUrl);
                
                // Create headers with fresh auth token
                const headers = new Headers();
                headers.append('Authorization', `Bearer ${freshToken}`);
                headers.append('Content-Type', 'application/json');
                
                // Log the headers for debugging
                console.log('Request headers:', Object.fromEntries(headers.entries()));
                
                // Fetch stats and logs in parallel
                const [statsRes, logsRes] = await Promise.all([
                    fetch(statsUrl, {
                        method: 'GET',
                        headers,
                        credentials: 'include',
                        mode: 'cors'
                    }).then(res => {
                        console.log('Stats response status:', res.status);
                        return res;
                    }),
                    fetch(logsUrl, {
                        method: 'GET',
                        headers,
                        credentials: 'include',
                        mode: 'cors'
                    }).then(res => {
                        console.log('Logs response status:', res.status);
                        return res;
                    })
                ]);

                // Handle stats response
                let statsData;
                try {
                    statsData = await statsRes.json();
                    if (!statsRes.ok) {
                        throw new Error(statsData.message || 'Failed to fetch admin stats');
                    }
                } catch (statsErr) {
                    console.error('Error parsing stats response:', statsErr);
                    throw new Error('Failed to parse admin stats response');
                }

                // Handle logs response
                let logsData;
                try {
                    logsData = await logsRes.json();
                    if (!logsRes.ok) {
                        throw new Error(logsData.message || 'Failed to fetch admin logs');
                    }
                } catch (logsErr) {
                    console.error('Error parsing logs response:', logsErr);
                    throw new Error('Failed to parse admin logs response');
                }

                setStats(statsData.data || statsData);
                setLogs(logsData.logs || logsData || []);

            } catch (err) {
                console.error('Error in admin panel:', err);
                setError(err.message || 'Failed to load admin data');
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setShouldRedirect(true);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAuthenticated, user]);

    if (shouldRedirect) {
        return <Redirect to="/" />;
    }

    if (loading) {
        return (
            <Layout title="Admin Panel" description="Admin Dashboard">
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
            <Layout title="Admin Panel" description="Admin Dashboard">
                <div className="container margin-vert--xl">
                    <div className="row">
                        <div className="col col--6 col--offset-3">
                            <div className="alert alert--danger">
                                <h3>Error</h3>
                                <p>{error}</p>
                                <button 
                                    className="button button--primary"
                                    onClick={() => window.location.reload()}
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Admin Panel" description="Admin Dashboard">
            <div className="container margin-vert--xl">
                <h1>Admin Dashboard</h1>
                {stats && (
                    <div className="row margin-vert--lg">
                        <div className="col col--4">
                            <div className="card">
                                <div className="card__header">
                                    <h3>Users</h3>
                                </div>
                                <div className="card__body">
                                    <h2>{stats.users || 0}</h2>
                                    <p>Total registered users</p>
                                </div>
                            </div>
                        </div>
                        <div className="col col--4">
                            <div className="card">
                                <div className="card__header">
                                    <h3>Conversions</h3>
                                </div>
                                <div className="card__body">
                                    <h2>{stats.conversions || 0}</h2>
                                    <p>Total document conversions</p>
                                </div>
                            </div>
                        </div>
                        <div className="col col--4">
                            <div className="card">
                                <div className="card__header">
                                    <h3>Visits</h3>
                                </div>
                                <div className="card__body">
                                    <h2>{stats.visits || 0}</h2>
                                    <p>Total site visits</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="margin-vert--lg">
                    <h2>Recent Activity</h2>
                    <div className="card">
                        <div className="card__body">
                            {logs.length > 0 ? (
                                <table className="table table--striped">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Action</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log, index) => {
                                            // Format the timestamp
                                            const formattedTime = log.created_at 
                                                ? new Date(log.created_at).toLocaleString() 
                                                : 'N/A';
                                                
                                            return (
                                                <tr key={index}>
                                                    <td>{log.user_email || 'Anonymous'}</td>
                                                    <td>
                                                        {log.original_file_name || log.file_name || 'N/A'}
                                                        {log.conversion_type && ` (${log.conversion_type.toUpperCase()})`}
                                                    </td>
                                                    <td>{formattedTime}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <p>No recent activity found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default function AdminPanel() {
    return (
        <ErrorBoundary>
            <AdminPanelContent />
        </ErrorBoundary>
    );
}