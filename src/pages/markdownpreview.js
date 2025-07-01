import React from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import { useLocation } from '@docusaurus/router';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

export default function MarkdownPreview() {
  const location = useLocation();
  const markdown = location.state?.markdown || '';
  const filename = location.state?.filename || '';
  const images = location.state?.images || [];

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown)
      .then(() => {
        alert('Markdown copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <Layout
      title={`Markdown Preview - ${filename}`}
      description="View your AI-converted Markdown document"
    >
      <Head>
        <html data-theme="dark" />
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
          <h1 className={styles.title}>
            <span className={styles.titleHighlight}>Markdown Preview</span>
          </h1>
          <p className={styles.subtitle}>
            AI-converted document: <span className={styles.highlight}>{filename}</span>
          </p>

          {/* Display extracted images */}
          {images.length > 0 && (
            <div className={styles.imageGallery}>
              <h3>Extracted Images:</h3>
              <div className={styles.imagesContainer}>
                {images.map((img, index) => (
                  <div key={index} className={styles.imageWrapper}>
                    <img
                      src={img.src}
                      alt={img.description}
                      className={styles.extractedImage}
                    />
                    <p className={styles.imageCaption}>{img.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.markdownPreview}>
            <pre>{markdown}</pre>
          </div>

          <button onClick={handleCopy} className={styles.copyButton}>
            Copy Markdown
          </button>

          <div className={styles.fileNote} style={{ marginTop: '2rem' }}>
            <div className={styles.noteItem}>
              <span className={styles.noteIcon}>↩️</span>
              <Link to="/upload" className={styles.noteLink}>
                Upload another document
              </Link>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}