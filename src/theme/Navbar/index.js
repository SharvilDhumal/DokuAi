import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import { useAuth } from '../../context/AuthContext';
import styles from './CustomNavbar.module.css';

export default function CustomNavbar() {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <nav className={styles.navbar + ' ' + (menuOpen ? styles.open : '')}>
            <div className={styles.navInner}>
                <div className={styles.leftGroup}>
                    <Link to="/" className={styles.brand} aria-label="DokuAI Home">
                        <img src={require('@site/static/img/DokuAI_img.png').default} alt="DokuAI Logo" className={styles.logo} />
                        <span className={styles.brandText}>DokuAI</span>
                    </Link>
                    <Link
                        to="/upload"
                        className={styles.uploadLink}
                        aria-label="Upload"
                    >
                        Upload
                    </Link>
                    {user && user.role === 'admin' && (
                        <Link
                            to="/admin-panel"
                            className={styles.uploadLink}
                            aria-label="Admin Panel"
                            style={{ marginLeft: 16 }}
                        >
                            Admin Panel
                        </Link>
                    )}
                </div>
                <button
                    className={styles.hamburger}
                    aria-label="Toggle menu"
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    <span className={styles.hamburgerBar}></span>
                    <span className={styles.hamburgerBar}></span>
                    <span className={styles.hamburgerBar}></span>
                </button>
                <div className={styles.rightGroup + ' ' + (menuOpen ? styles.show : '')}>
                    <button
                        className={styles.authButton}
                        onClick={user ? logout : () => window.dispatchEvent(new Event('open-auth-modal'))}
                        aria-label={user ? 'Logout' : 'Login'}
                    >
                        {user ? 'Logout' : 'Login'}
                    </button>
                </div>
            </div>
        </nav>
    );
} 