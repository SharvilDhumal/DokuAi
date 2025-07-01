import React from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import { useLocation } from '@docusaurus/router';
import Link from '@docusaurus/Link';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
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

  // Update the renderers and add error boundaries
  const renderers = {
    img: ({ src, alt }) => {
      if (!src) return null;

      return (
        <div className={styles.imageContainer}>
          <img
            src={src}
            alt={alt || 'Document image'}
            className={styles.extractedImage}
            onError={(e) => {
              e.target.alt = 'Failed to load image';
              e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23333"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="10">Image failed to load</text></svg>';
            }}
          />
          {alt && <p className={styles.imageCaption}>{alt}</p>}
        </div>
      );
    },
    // Add custom renderers for other elements
    code: ({ node, inline, className, children, ...props }) => {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    table: ({ children }) => (
      <div className={styles.tableWrapper}>
        <table className={styles.markdownTable}>{children}</table>
      </div>
    ),
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

          {/* Display extracted images in a gallery */}
          {images.length > 0 && (
            <div className={styles.imageGallery}>
              <h3>Extracted Images</h3>
              <div className={styles.imagesContainer}>
                {images.map((img, idx) => (
                  <div key={idx} className={styles.imageWrapper}>
                    <img
                      src={`data:${img.type};base64,${img.data}`}
                      alt={img.description}
                      className={styles.extractedImage}
                    />
                    <p className={styles.imageCaption}>{img.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Markdown content */}
          <div className={styles.markdownPreview}>
            <ReactMarkdown
              components={renderers}
              rehypePlugins={[rehypeRaw]}
              skipHtml={false}
            >
              {markdown}
            </ReactMarkdown>
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