// index.js
import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';
import Head from '@docusaurus/Head';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthModal from '../components/AuthModal/AuthModal';
import { useAuth } from '../context/AuthContext';
// At the top of index.js
import DokuAILogo from '@site/static/img/DokuAI_img.png';

const ReactLogoSVG = (
  <svg width="44" height="44" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="6" fill="#25c2a0" stroke="#fff" strokeWidth="2" />
    <ellipse cx="14" cy="14" rx="12" ry="4.5" stroke="#25c2a0" strokeWidth="2" fill="none" />
    <ellipse cx="14" cy="14" rx="12" ry="4.5" stroke="#25c2a0" strokeWidth="2" fill="none" transform="rotate(60 14 14)" />
    <ellipse cx="14" cy="14" rx="12" ry="4.5" stroke="#25c2a0" strokeWidth="2" fill="none" transform="rotate(120 14 14)" />
  </svg>
);

export default function Home() {
  const [showPreloader, setShowPreloader] = useState(false);

  useEffect(() => {
    const hasShownPreloader = sessionStorage.getItem('hasShownPreloader');
    if (!hasShownPreloader) {
      setShowPreloader(true);
      const timer = setTimeout(() => {
        setShowPreloader(false);
        sessionStorage.setItem('hasShownPreloader', 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const { user, isAuthenticated, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const handler = () => setIsAuthModalOpen(true);
    window.addEventListener('open-auth-modal', handler);
    return () => window.removeEventListener('open-auth-modal', handler);
  }, []);

  const handleLoginSuccess = (userData) => {
    console.log('Login successful:', userData);
    // Close the auth modal
    setIsAuthModalOpen(false);
    
    // Redirect based on user role
    if (userData.role === 'admin') {
      window.location.href = "/admin-panel";
    }
    // You can add additional logic here after successful login
  };

  const handleLogout = () => {
    logout();
    // You can add additional logic here after logout
  };

  return (
    <>
      {/* Always render landing page content */}
      <Layout
        title="DokuAI - AI-Powered Documentation"
        description="Convert PDF/DOCX to structured Markdown with AI. Secure role-based access for teams."
      >
        <Head>
          <html data-theme="dark" />
        </Head>
        <main className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <div className={styles.logoContainer}>
              <img
                src="/img/DokuAI_img.png"
                alt="DokuAI Logo"
                className={styles.logo}
              />
              <span className={styles.logoText}>DokuAI</span>
            </div>

            {/* Authentication Status */}
            {/* Removed authStatus block to avoid duplicate login/logout button under navbar */}

            <h1 className={styles.title}>Welcome to <span className={styles.titleHighlight}>DokuAI</span></h1>
            <p className={styles.subtitle}>
              Transform <span className={styles.highlight}>PDF/DOCX</span> documents into perfectly structured <span className={styles.highlight}>Markdown</span> using AI.
              <br />Enterprise-grade security with <span className={styles.highlight}>role-based access control</span>.
            </p>

            {isAuthenticated ? (
              <Link to="/upload" className={styles.ctaButton}>
                Get Started →
              </Link>
            ) : null}
          </div>

          <section className={styles.features}>
            <div className={styles.featuresInner}>
              <h2 className={styles.featuresTitle}>Key Features</h2>
              <div className={styles.featureGrid}>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>🤖</div>
                  <h3>AI-Powered Conversion</h3>
                  <p>Advanced NLP transforms documents into clean, structured Markdown with perfect formatting.</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>🔑</div>
                  <h3>Role-Based Access</h3>
                  <p>Granular permissions for Admins, Editors, and Viewers with audit logging.</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>🔄</div>
                  <h3>Multi-Framework</h3>
                  <p>Unified dashboard supporting Angular and Docusaurus workflows.</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>🏷️</div>
                  <h3>Smart Tagging</h3>
                  <p>Auto-categorization of content as API, Tutorial, or Guide documentation.</p>
                </div>
                <div className={styles.featureCard}>
                  <div className={styles.featureIcon}>🗄️</div>
                  <h3>PostgreSQL Backend</h3>
                  <p>Enterprise-grade database with full version history and rollback.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Authentication Modal */}
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />

          {/* Toast Container */}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </main>
      </Layout>
      {/* Overlay preloader on top of landing page */}
      {showPreloader && (
        <div className="preloader-overlay" style={{ background: 'rgba(24,28,47,0.55)', backdropFilter: 'blur(10px)', position: 'fixed', inset: 0, zIndex: 9999 }}>
          <div className="atom-spinner">
            <div className="spinner-inner">
              <div className="spinner-line"></div>
              <div className="spinner-line"></div>
              <div className="spinner-line"></div>
              <div className="spinner-circle" style={{ fontSize: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ReactLogoSVG}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}