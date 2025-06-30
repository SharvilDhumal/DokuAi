// index.js
import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';
import Head from '@docusaurus/Head';

export default function Home() {
  return (
    <Layout
      title="DokuAI - AI-Powered Documentation"
      description="Convert PDF/DOCX to structured Markdown with AI. Secure role-based access for teams."
    >
      <Head>        <html data-theme="dark" />
      </Head>
      <main className={styles.heroContainer}>
        <div className={styles.heroContent}>
          <div className={styles.logoContainer}>
            <img
              src="/img/DokuAi_img.png"
              alt="DokuAI Logo"
              className={styles.logo}
            />
            <span className={styles.logoText}>DokuAI</span>
          </div>
          <h1 className={styles.title}>Welcome to <span className={styles.titleHighlight}>DokuAI</span></h1>
          <p className={styles.subtitle}>
            Transform <span className={styles.highlight}>PDF/DOCX</span> documents into perfectly structured <span className={styles.highlight}>Markdown</span> using AI.
            <br />Enterprise-grade security with <span className={styles.highlight}>role-based access control</span>.
          </p>
          <Link to="/upload" className={styles.ctaButton}>
            Get Started →
          </Link>
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
      </main>
    </Layout>
  );
}