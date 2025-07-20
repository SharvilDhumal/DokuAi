import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, OverlayTrigger, Tooltip, Button } from 'react-bootstrap';
import { Bar, Line } from 'react-chartjs-2';
import ReactPaginate from 'react-paginate';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

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

const METRIC_ICONS = {
    Users: '👤',
    'Active Users': '🟦',
    Conversions: '🔥',
    Visits: '👁',
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

function getUserInitials(email) {
    if (!email) return '?';
    const [name] = email.split('@');
    return name
        .split(/[._-]/)
        .map(part => part[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 2);
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
    const [timeRange, setTimeRange] = useState('month');
    const [search, setSearch] = useState('');
    const [fileTypeFilter, setFileTypeFilter] = useState('all');
    const [userFilter, setUserFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');

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

    // --- Monthly Site Views Chart Data ---
    // Define all months for the x-axis
    const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']; // Add more if you want a full year
    // Map backend data to a {month: count} object
    const monthDataMap = {};
    monthlyViews.forEach(row => {
        const [year, month] = row.month.split('-');
        const monthIdx = parseInt(month, 10) - 1;
        if (monthIdx >= 0 && monthIdx < allMonths.length) {
            monthDataMap[allMonths[monthIdx]] = Number(row.views);
        }
    });
    // Fill missing months with zero
    const chartLabels = allMonths;
    const chartDataArr = allMonths.map(m => monthDataMap[m] || 0);
    const isAllZero = chartDataArr.every(v => v === 0);
    // Data labels plugin for Chart.js
    const dataLabelsPlugin = {
        id: 'dataLabels',
        afterDatasetsDraw(chart) {
            const { ctx, data, chartArea } = chart;
            ctx.save();
            data.datasets.forEach((dataset, i) => {
                chart.getDatasetMeta(i).data.forEach((bar, j) => {
                    const value = dataset.data[j];
                    if (value > 0) {
                        ctx.font = 'bold 14px Inter, sans-serif';
                        ctx.fillStyle = '#fff';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(value, bar.x, bar.y - 6);
                    }
                });
            });
            ctx.restore();
        },
    };
    // Chart.js options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                enabled: true,
                callbacks: {
                    title: ctx => ctx[0].label,
                    label: ctx => `Visits: ${ctx.parsed.y}`,
                },
                backgroundColor: '#232946',
                titleColor: '#25c2a0',
                bodyColor: '#fff',
                borderColor: '#25c2a0',
                borderWidth: 1,
            },
        },
        animation: {
            duration: 1200,
            easing: 'easeOutQuart',
        },
        scales: {
            x: {
                grid: { display: true, color: 'rgba(200,200,200,0.10)' },
                title: { display: true, text: 'Month', font: { size: 18, weight: 'bold' }, color: '#fff' },
                ticks: { color: '#fff', font: { weight: 'bold', size: 16 } },
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(200,200,200,0.18)' },
                title: { display: true, text: 'Site Visits', font: { size: 18, weight: 'bold' }, color: '#fff' },
                ticks: {
                    color: '#fff',
                    font: { weight: 'bold', size: 16 },
                    stepSize: 100,
                },
                min: 0,
                max: Math.ceil(Math.max(...chartDataArr, 100) / 100) * 100,
            },
        },
    };
    // Chart.js data
    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                label: 'Site Visits',
                data: chartDataArr,
                backgroundColor: ctx => {
                    const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 320);
                    gradient.addColorStop(0, '#25c2a0');
                    gradient.addColorStop(1, '#457b9d');
                    return gradient;
                },
                borderRadius: 12,
                borderSkipped: false,
                barPercentage: 0.6,
                categoryPercentage: 0.7,
                shadowOffsetX: 0,
                shadowOffsetY: 2,
                shadowBlur: 8,
                shadowColor: 'rgba(36,40,62,0.18)',
            },
        ],
    };
    // --- Chart Type Toggle and Filters ---
    // Remove chartType, set chartType to 'bar' always, and remove chartTypeToggle
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
    const filteredLogs = logs.filter(log => {
        const searchLower = search.toLowerCase();
        const email = (log.user_email || '').toLowerCase();
        const file = (log.original_file_name || log.file_name || '').toLowerCase();
        return (
            searchLower === '' ||
            email.includes(searchLower) ||
            file.includes(searchLower)
        );
    });
    const sortedLogs = sortTable(filteredLogs);
    const pageCount = Math.ceil(sortedLogs.length / rowsPerPage);
    const paginatedLogs = sortedLogs.slice(currentPage * rowsPerPage, (currentPage + 1) * rowsPerPage);
    function handlePageClick({ selected }) {
        setCurrentPage(selected);
    }

    // --- Recent Activity Table Filters ---
    const uniqueUsers = Array.from(new Set(logs.map(l => l.user_email).filter(Boolean)));
    // In the Recent Activity Table Filters section, remove the dropdowns and only keep the search bar.
    // const filteredLogs = logs.filter(log => {
    //     const searchLower = search.toLowerCase();
    //     const email = (log.user_email || '').toLowerCase();
    //     const file = (log.original_file_name || log.file_name || '').toLowerCase();
    //     return (
    //         searchLower === '' ||
    //         email.includes(searchLower) ||
    //         file.includes(searchLower)
    //     );
    // });

    return (
        <Layout title="Admin Panel" description="Admin Dashboard">
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #181c2f 0%, #232946 100%)', paddingBottom: 40 }}>
                <Container fluid className="py-4">
                    <h1 className="mb-4 fw-bold" style={{ fontSize: '2.5rem', letterSpacing: '0.01em', color: '#fff', textShadow: '0 2px 8px #181c2f, 0 1px 0 #2e8555' }}>Admin Dashboard</h1>
                    {/* Stats Cards */}
                    <Row className="g-4 mb-4">
                        {[{ title: 'Users', value: stats?.users || 0, tip: 'Total registered users', color: METRIC_COLORS.Users }, { title: 'Active Users', value: stats?.activeUsers || 0, tip: 'Active in last 10 min', color: METRIC_COLORS['Active Users'] }, { title: 'Conversions', value: stats?.conversions || 0, tip: 'Total document conversions', color: METRIC_COLORS.Conversions }, { title: 'Visits', value: stats?.visits || 0, tip: 'Total site visits', color: METRIC_COLORS.Visits }].map((card, i) => (
                            <Col xs={12} sm={6} md={3} key={card.title}>
                                <OverlayTrigger placement="top" overlay={<Tooltip>{card.tip}</Tooltip>}>
                                    <Card className="text-center shadow-sm border-0 h-100 metric-card metric-card-ux" style={{ background: 'linear-gradient(135deg, #232946 60%, #181c2f 100%)', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 2px 16px rgba(36,40,62,0.18)' }}>
                                        <Card.Body className="py-4">
                                            <div style={{ fontSize: '2.2rem', marginBottom: 6, color: card.color, filter: 'drop-shadow(0 2px 4px #0002)' }} aria-label={card.title + ' icon'}>{METRIC_ICONS[card.title]}</div>
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
                            <Card className="shadow-sm border-0" style={{ background: 'linear-gradient(135deg, #232946 60%, #232946 100%)', border: '1.5px solid #2e8555', borderRadius: 18, boxShadow: '0 4px 24px rgba(36,40,62,0.18)' }}>
                                <Card.Body>
                                    <Card.Title className="mb-3 fw-bold" style={{ fontSize: '1.5rem', color: METRIC_COLORS.Visits, letterSpacing: '0.01em' }}>Monthly Site Views</Card.Title>
                                    <div style={{ height: 320, minHeight: 220 }}>
                                        {isAllZero ? (
                                            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted fw-semibold" style={{ fontSize: 18 }}>
                                                <NoDataSVG />
                                                <div style={{ marginTop: 8, color: '#b3b3b3', fontWeight: 500 }}>No data available</div>
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
                        <Col xs={12} style={{ maxWidth: 1100, margin: '0 auto' }}>
                            <Card className="shadow-sm border-0" style={{ background: 'rgba(44,48,70,0.98)', border: '1.5px solid #e63946', borderRadius: 18, boxShadow: '0 4px 24px rgba(36,40,62,0.18)' }}>
                                <Card.Body>
                                    <Card.Title className="mb-3 fw-bold" style={{ fontSize: '1.5rem', color: METRIC_COLORS.Conversions, letterSpacing: '0.01em' }}>Recent Activity</Card.Title>
                                    {/* --- Table Filters --- */}
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <input type="text" placeholder="Search by email or file..." value={search} onChange={e => setSearch(e.target.value)} style={{ borderRadius: 8, padding: '4px 12px', border: '1px solid #2e8555', background: '#232946', color: '#fff', fontWeight: 600, minWidth: 220, width: 320 }} />
                                    </div>
                                    <div className="table-responsive" style={{ maxHeight: 480, overflowY: 'auto' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {paginatedLogs.map((log, index) => {
                                                const formattedTime = log.created_at
                                                    ? new Date(log.created_at).toLocaleString()
                                                    : 'N/A';
                                                const relativeTime = log.created_at ? dayjs(log.created_at).fromNow() : '';
                                                const isToday = dayjs(log.created_at).isSame(dayjs(), 'day');
                                                let fileIcon = null;
                                                let fileType = (log.original_file_name || log.file_name || '').split('.').pop()?.toLowerCase();
                                                if (fileType === 'pdf') fileIcon = <span style={{ display: 'inline-block', background: '#e63946', color: '#fff', borderRadius: 6, padding: '2px 8px', fontWeight: 700, fontSize: 15, marginRight: 6 }}>PDF</span>;
                                                else if (fileType === 'docx') fileIcon = <span style={{ display: 'inline-block', background: '#457b9d', color: '#fff', borderRadius: 6, padding: '2px 8px', fontWeight: 700, fontSize: 15, marginRight: 6 }}>DOCX</span>;
                                                // User avatar/initials
                                                const userInitials = getUserInitials(log.user_email);
                                                return (
                                                    <div key={index} className="activity-row-card" style={{
                                                        background: isToday ? 'rgba(255,214,0,0.10)' : (index % 2 === 0 ? 'rgba(36,40,62,0.98)' : 'rgba(44,48,70,0.98)'),
                                                        borderRadius: 14,
                                                        boxShadow: '0 2px 8px rgba(36,40,62,0.10)',
                                                        padding: 16,
                                                        marginBottom: 8,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 16,
                                                        border: isToday ? '1.5px solid #FFD600' : '1.5px solid #232946',
                                                        transition: 'background 0.2s, border 0.2s',
                                                    }}>
                                                        <span style={{ display: 'inline-block', width: 40, height: 40, borderRadius: '50%', background: '#232946', color: '#25c2a0', textAlign: 'center', lineHeight: '40px', fontWeight: 700, fontSize: 18, border: '2px solid #25c2a0' }}>{userInitials}</span>
                                                        <div style={{ flex: 2, fontWeight: 600, color: '#fff' }}>{log.user_email || 'Anonymous'}</div>
                                                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            {fileIcon}
                                                            <span style={{ color: '#fff', textDecoration: 'underline', cursor: 'pointer', marginLeft: 8 }} title="Preview/Download (coming soon)">{log.original_file_name || log.file_name || 'N/A'}</span>
                                                            {isToday && <Badge bg="warning" text="dark" style={{ marginLeft: 8 }}>New</Badge>}
                                                        </div>
                                                        <div style={{ flex: 2, color: '#b3b3b3', fontWeight: 500, fontSize: 15, textAlign: 'right' }}>
                                                            <span>{relativeTime}</span>
                                                            <span style={{ marginLeft: 8, color: '#888', fontSize: 13 }}>({formattedTime})</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
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

// Add improved hover effect for metric cards and activity row cards
const style = document.createElement('style');
style.innerHTML = `
.metric-card-ux {
  box-shadow: 0 2px 16px rgba(36,40,62,0.18), 0 1.5px 8px rgba(36,40,62,0.10);
  background: linear-gradient(135deg, #232946 60%, #181c2f 100%);
  border-radius: 18px;
}
.metric-card-ux:hover {
  transform: scale(1.045);
  box-shadow: 0 8px 32px rgba(36,40,62,0.28), 0 2px 12px rgba(36,40,62,0.18);
  z-index: 2;
}
.activity-row-card:hover {
  background: rgba(37,194,160,0.10) !important;
  border: 1.5px solid #25c2a0 !important;
  transition: background 0.2s, border 0.2s;
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
  border-radius: 12px;
  padding: 6px 16px;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(36,40,62,0.10);
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}
.pagination .page-item.active .page-link {
  background: #25c2a0;
  color: #fff;
  border-color: #25c2a0;
  box-shadow: 0 4px 16px rgba(37,194,160,0.18);
}
.pagination .page-item .page-link:hover {
  background: #2e8555;
  color: #fff;
  box-shadow: 0 4px 16px rgba(46,136,85,0.18);
}
`;
document.head.appendChild(style);