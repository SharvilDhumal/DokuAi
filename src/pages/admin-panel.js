import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, OverlayTrigger, Tooltip, Button } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import ReactPaginate from 'react-paginate';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);
import { useAuth } from '../context/AuthContext';
import Layout from '@theme/Layout';

// Add Inter font
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

document.body.style.fontFamily = 'Inter, sans-serif';

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

function getMonthName(monthStr) {
    // monthStr: 'YYYY-MM'
    const [year, month] = monthStr.split('-');
    return new Date(year, month - 1).toLocaleString('default', { month: 'short' });
}

const METRIC_COLORS = {
    Users: '#25c2a0',
    'Active Users': '#457b9d',
    Conversions: '#e63946',
    Visits: '#fbbf24',
};

const FILE_ICONS = {
    pdf: <i className="bi bi-file-earmark-pdf" style={{ color: '#e63946', marginRight: 6 }}></i>,
    docx: <i className="bi bi-file-earmark-word" style={{ color: '#457b9d', marginRight: 6 }}></i>,
};

function NoDataSVG() {
    return (
        <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="50" width="15" height="20" rx="3" fill="#e5e7eb" />
            <rect x="35" y="40" width="15" height="30" rx="3" fill="#e5e7eb" />
            <rect x="60" y="30" width="15" height="40" rx="3" fill="#e5e7eb" />
            <rect x="85" y="60" width="15" height="10" rx="3" fill="#e5e7eb" />
            <text x="60" y="75" textAnchor="middle" fill="#b3b3b3" fontSize="13">No Data</text>
        </svg>
    );
}

function AdminPanelContent() {
    const { user, isAuthenticated } = useAuth();
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [shouldRedirect, setShouldRedirect] = useState(false);
    const [activeUsers, setActiveUsers] = useState([]);
    const [monthlyViews, setMonthlyViews] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(0);
    const rowsPerPage = 10;

    useEffect(() => {
        const checkAdminAccess = async () => {
            // Authentication is already verified by the wrapper component
            // We can proceed with loading admin data
            return true;
        };

        const fetchData = async () => {
            try {
                setLoading(true);
                setError("");

                const token = sessionStorage.getItem("authToken");
                if (!token) {
                    setError("No authentication token found. Please log in again.");
                    setShouldRedirect(true);
                    return;
                }

                // Use the correct API endpoints with full URL
                const baseUrl = 'http://localhost:5001';
                const statsUrl = `${baseUrl}/api/admin/stats`;
                const logsUrl = `${baseUrl}/api/admin/logs`;

                console.log('Fetching admin stats from:', statsUrl);
                console.log('Fetching admin logs from:', logsUrl);

                // Create headers with auth token
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                };

                // Log the headers for debugging
                console.log('Request headers:', headers);

                // Fetch stats and logs in parallel
                const [statsRes, logsRes] = await Promise.all([
                    fetch(statsUrl, {
                        method: 'GET',
                        headers,
                        credentials: 'include',
                        mode: 'cors'
                    }).then(async res => {
                        console.log('Stats response status:', res.status);
                        if (!res.ok) {
                            const errorText = await res.text();
                            console.error('Failed to fetch stats:', errorText);
                            throw new Error(`Failed to fetch stats: ${res.status}`);
                        }
                        return res;
                    }),
                    fetch(logsUrl, {
                        method: 'GET',
                        headers,
                        credentials: 'include',
                        mode: 'cors'
                    }).then(async res => {
                        console.log('Logs response status:', res.status);
                        if (!res.ok) {
                            const errorText = await res.text();
                            console.error('Failed to fetch logs:', errorText);
                            throw new Error(`Failed to fetch logs: ${res.status}`);
                        }
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

                // Fetch active users
                const activeUsersUrl = `${baseUrl}/api/admin/active-users`;
                let activeUsersData = { users: [] };
                try {
                    const activeUsersRes = await fetch(activeUsersUrl, {
                        method: 'GET',
                        headers,
                        credentials: 'include',
                        mode: 'cors'
                    });

                    if (activeUsersRes.ok) {
                        activeUsersData = await activeUsersRes.json();
                    } else {
                        const errorText = await activeUsersRes.text();
                        console.error('Failed to fetch active users:', errorText);
                    }
                } catch (err) {
                    console.error('Error fetching active users:', err);
                }
                setActiveUsers(activeUsersData.users || []);

                // Fetch monthly site views for chart
                const monthlyViewsUrl = `${baseUrl}/api/admin/monthly-site-views`;
                let monthlyViewsData = { data: [] };
                try {
                    const monthlyViewsRes = await fetch(monthlyViewsUrl, {
                        method: 'GET',
                        headers,
                        credentials: 'include',
                        mode: 'cors'
                    });

                    if (monthlyViewsRes.ok) {
                        monthlyViewsData = await monthlyViewsRes.json();
                    } else {
                        const errorText = await monthlyViewsRes.text();
                        console.error('Failed to fetch monthly views:', errorText);
                    }
                } catch (err) {
                    console.error('Error fetching monthly views:', err);
                }
                setMonthlyViews(monthlyViewsData.data || []);

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
        // The wrapper component will handle the redirection
        return null;
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

    // Chart data
    const chartLabels = monthlyViews.map(row => getMonthName(row.month));
    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                label: 'Site Visits',
                data: monthlyViews.map(row => Number(row.views)),
                backgroundColor: METRIC_COLORS.Visits,
                borderRadius: 6,
                hoverBackgroundColor: '#fbbf24',
                borderSkipped: false,
            },
        ],
    };
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                enabled: true,
                callbacks: {
                    label: function (context) {
                        return `Site Visits: ${context.parsed.y}`;
                    }
                }
            }
        },
        animation: {
            duration: 900,
            easing: 'easeOutQuart',
        },
        scales: {
            x: {
                grid: { display: false },
                title: { display: true, text: 'Month', font: { size: 14, weight: 'bold' } },
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(200,200,200,0.08)' },
                title: { display: true, text: 'Site Visits', font: { size: 14, weight: 'bold' } },
            },
        },
    };
    // Table sorting
    function sortTable(rows) {
        if (!sortConfig.key) return rows;
        return [...rows].sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];
            if (sortConfig.key === 'created_at') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    function handleSort(key) {
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    }
    // Pagination
    const sortedLogs = sortTable(logs);
    const pageCount = Math.ceil(sortedLogs.length / rowsPerPage);
    const paginatedLogs = sortedLogs.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);
    function handlePageClick({ selected }) {
        setCurrentPage(selected);
    }

    return (
        <Layout title="Admin Panel" description="Admin Dashboard">
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #181c2f 0%, #232946 100%)', paddingBottom: 40 }}>
                <Container fluid className="py-4">
                    <h1 className="mb-4 fw-bold" style={{ fontSize: '2.5rem', letterSpacing: '0.01em' }}>Admin Dashboard</h1>
                    {/* Stats Cards */}
                    <Row className="g-4 mb-4">
                        {[{ title: 'Users', value: stats?.users || 0, tip: 'Total registered users', color: METRIC_COLORS.Users }, { title: 'Active Users', value: stats?.activeUsers || 0, tip: 'Active in last 10 min', color: METRIC_COLORS['Active Users'] }, { title: 'Conversions', value: stats?.conversions || 0, tip: 'Total document conversions', color: METRIC_COLORS.Conversions }, { title: 'Visits', value: stats?.visits || 0, tip: 'Total site visits', color: METRIC_COLORS.Visits }].map((card, i) => (
                            <Col xs={12} sm={6} md={3} key={card.title}>
                                <OverlayTrigger placement="top" overlay={<Tooltip>{card.tip}</Tooltip>}>
                                    <Card className="text-center shadow-sm border-0 h-100 metric-card" style={{ background: 'rgba(36,40,62,0.98)', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 12px rgba(36,40,62,0.10)' }}>
                                        <Card.Body className="py-4">
                                            <Card.Title className="mb-2" style={{ color: card.color, fontWeight: 700, fontSize: '1.2rem', letterSpacing: '0.01em' }}>{card.title}</Card.Title>
                                            <h2 className="fw-bold" style={{ fontSize: '2.1rem', color: '#fff' }}>{card.value}</h2>
                                        </Card.Body>
                                    </Card>
                                </OverlayTrigger>
                            </Col>
                        ))}
                    </Row>
                    {/* Section Separator */}
                    <div style={{ height: 2, background: 'linear-gradient(90deg, #232946 0%, #2e8555 100%)', opacity: 0.12, margin: '32px 0 24px 0', borderRadius: 2 }} />
                    {/* Monthly Site Views Chart */}
                    <Row className="mb-4">
                        <Col>
                            <Card className="shadow-sm border-0" style={{ background: 'rgba(36,40,62,0.98)' }}>
                                <Card.Body>
                                    <Card.Title className="mb-3 fw-bold" style={{ fontSize: '1.5rem', color: METRIC_COLORS.Visits, letterSpacing: '0.01em' }}>Monthly Site Views</Card.Title>
                                    <div style={{ height: 320 }}>
                                        {monthlyViews.length === 0 ? (
                                            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted fw-semibold" style={{ fontSize: 18 }}>
                                                <NoDataSVG />
                                                <div style={{ marginTop: 8, color: '#b3b3b3', fontWeight: 500 }}>No Data Available</div>
                                            </div>
                                        ) : (
                                            <Bar data={chartData} options={chartOptions} />
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                    {/* Section Separator */}
                    <div style={{ height: 2, background: 'linear-gradient(90deg, #2e8555 0%, #232946 100%)', opacity: 0.12, margin: '32px 0 24px 0', borderRadius: 2 }} />
                    {/* Recent Activity Table */}
                    <Row>
                        <Col>
                            <Card className="shadow-sm border-0" style={{ background: 'rgba(36,40,62,0.98)' }}>
                                <Card.Body>
                                    <Card.Title className="mb-3 fw-bold" style={{ fontSize: '1.5rem', color: METRIC_COLORS.Conversions, letterSpacing: '0.01em' }}>Recent Activity</Card.Title>
                                    <div className="table-responsive">
                                        <Table striped bordered hover variant="dark" className="align-middle mb-0" style={{ fontSize: 14 }}>
                                            <thead>
                                                <tr style={{ fontSize: 15, cursor: 'pointer' }}>
                                                    <th onClick={() => handleSort('user_email')}>User {sortConfig.key === 'user_email' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                                                    <th onClick={() => handleSort('original_file_name')}>Action {sortConfig.key === 'original_file_name' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                                                    <th onClick={() => handleSort('created_at')}>Time {sortConfig.key === 'created_at' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedLogs.map((log, index) => {
                                                    const formattedTime = log.created_at
                                                        ? new Date(log.created_at).toLocaleString()
                                                        : 'N/A';
                                                    const isActive = activeUsers.some(u => u.email === log.user_email);
                                                    let fileIcon = null;
                                                    let badgeVariant = 'secondary';
                                                    const fileType = (log.original_file_name || log.file_name || '').split('.').pop()?.toLowerCase();
                                                    if (fileType === 'pdf') {
                                                        fileIcon = FILE_ICONS.pdf;
                                                        badgeVariant = 'danger';
                                                    } else if (fileType === 'docx') {
                                                        fileIcon = FILE_ICONS.docx;
                                                        badgeVariant = 'primary';
                                                    }
                                                    return (
                                                        <tr key={index} style={{ height: 38 }}>
                                                            <td>
                                                                {log.user_email || 'Anonymous'}
                                                                {isActive && (
                                                                    <Badge bg="success" className="ms-2">Active now</Badge>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <span>{fileIcon}</span>
                                                                <Badge bg={badgeVariant} className="me-2">
                                                                    {fileType?.toUpperCase()}
                                                                </Badge>
                                                                {log.original_file_name || log.file_name || 'N/A'}
                                                            </td>
                                                            <td>{formattedTime}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </Table>
                                        {pageCount > 1 && (
                                            <div className="d-flex justify-content-center mt-3">
                                                <ReactPaginate
                                                    previousLabel={"← Prev"}
                                                    nextLabel={"Next →"}
                                                    breakLabel={"..."}
                                                    pageCount={pageCount}
                                                    marginPagesDisplayed={1}
                                                    pageRangeDisplayed={2}
                                                    onPageChange={handlePageClick}
                                                    containerClassName={"pagination"}
                                                    pageClassName={"page-item"}
                                                    pageLinkClassName={"page-link"}
                                                    previousClassName={"page-item"}
                                                    previousLinkClassName={"page-link"}
                                                    nextClassName={"page-item"}
                                                    nextLinkClassName={"page-link"}
                                                    breakClassName={"page-item"}
                                                    breakLinkClassName={"page-link"}
                                                    activeClassName={"active"}
                                                    forcePage={currentPage}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                    {/* Footer */}
                    <footer className="mt-5 pt-4 pb-2 text-center" style={{ borderTop: '1px solid #2e2e3e', color: '#b3b3b3', fontSize: 15 }}>
                        <div>DokuAI Admin Dashboard &copy; {new Date().getFullYear()} &mdash; <span style={{ color: '#25c2a0', fontWeight: 600 }}>AI-powered Markdown Conversion</span></div>
                        <div className="mt-2">
                            <a href="https://github.com/SharvilDhumal" target="_blank" rel="noopener noreferrer" style={{ color: '#b3b3b3', margin: '0 10px', fontSize: 20 }}><i className="bi bi-github"></i></a>
                            <a href="https://www.linkedin.com/in/sharvil-dhumal/" target="_blank" rel="noopener noreferrer" style={{ color: '#b3b3b3', margin: '0 10px', fontSize: 20 }}><i className="bi bi-linkedin"></i></a>
                        </div>
                    </footer>
                </Container>
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

// Add hover effect for metric cards
const style = document.createElement('style');
style.innerHTML = `
.metric-card:hover {
  transform: scale(1.03);
  box-shadow: 0 6px 24px rgba(36,40,62,0.18);
}
.pagination {
  display: flex;
  list-style: none;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}
.pagination .page-item .page-link {
  color: #25c2a0;
  background: #232946;
  border: 1px solid #2e8555;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 15px;
  transition: background 0.2s, color 0.2s;
}
.pagination .page-item.active .page-link {
  background: #25c2a0;
  color: #fff;
  border-color: #25c2a0;
}
.pagination .page-item .page-link:hover {
  background: #2e8555;
  color: #fff;
}
`;
document.head.appendChild(style);