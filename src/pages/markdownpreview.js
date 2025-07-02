import { useLocation } from '@docusaurus/router';
import styles from './index.module.css';
import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function MarkdownPreview() {
  const { siteConfig } = useDocusaurusContext();
  const PROXY_URL = siteConfig.customFields?.PROXY_URL || 'http://localhost:3001/image';

  const location = useLocation();
  const markdown = location.state?.markdown || '';
  const filename = location.state?.filename || '';
  const images = location.state?.images || [];

  const MarkdownImage = ({ src, alt }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Get PocketBase URL from config or fallback
    const { siteConfig } = useDocusaurusContext();
    const POCKETBASE_URL = siteConfig.customFields?.POCKETBASE_URL || 'http://localhost:8090';

    const fixedSrc = React.useMemo(() => {
      if (!src) return '';
      // If it's already a full URL
      if (src.startsWith('http')) {
        return src;
      }
      // For PocketBase URLs, ensure they're complete and not already prefixed
      if (src.startsWith('/api/files') && !src.startsWith(POCKETBASE_URL)) {
        return `${POCKETBASE_URL}${src}`;
      }
      return src;
    }, [src, POCKETBASE_URL]);

    useEffect(() => {
      if (!fixedSrc) {
        setImageError(true);
        return;
      }
      const img = new window.Image();
      img.src = fixedSrc;
      img.onload = () => setImageLoaded(true);
      img.onerror = () => {
        console.error('Failed to load image:', fixedSrc);
        setImageError(true);
      };
    }, [fixedSrc]);

    return (
      <div className={styles.imageContainer}>
        {!imageError ? (
          <>
            <img
              src={fixedSrc}
              alt={alt || 'Document image'}
              className={styles.extractedImage}
              style={{ display: imageLoaded ? 'block' : 'none' }}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                console.error('Image load error:', fixedSrc);
                setImageError(true);
              }}
            />
            {!imageLoaded && !imageError && (
              <div className={styles.imageLoading}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: '70%' }} />
                </div>
                Loading image...
              </div>
            )}
          </>
        ) : (
          <div className={styles.imageError}>
            Failed to load image
            {fixedSrc && (
              <div className={styles.imageUrl}>
                <small>URL: {fixedSrc}</small>
                <button
                  onClick={() => window.open(fixedSrc, '_blank')}
                  className={styles.copyButton}
                  style={{ marginTop: '0.5rem' }}
                >
                  Open Image in New Tab
                </button>
              </div>
            )}
          </div>
        )}
        {alt && <p className={styles.imageCaption}>{alt}</p>}
      </div>
    );
  };

  useEffect(() => {
    if (images && images.length > 0) {
      console.log('Received images:', images);
      images.forEach(img => {
        console.log('Image URL:', img.data);
        // Test loading the image
        const testImg = new window.Image();
        testImg.src = img.data;
        testImg.onload = () => console.log(`Image loaded: ${img.data}`);
        testImg.onerror = () => console.error(`Failed to load image: ${img.data}`);
      });
    }
  }, [images]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown)
      .then(() => {
        alert('Markdown copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/\.[^/.]+$/, '')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderers = {
    img: (props) => <MarkdownImage {...props} />,
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

          <div className={styles.buttonGroup}>
            <button onClick={handleCopy} className={styles.copyButton}>
              Copy Markdown
            </button>
            <button onClick={handleDownload} className={styles.downloadButton}>
              Download Markdown
            </button>
          </div>

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