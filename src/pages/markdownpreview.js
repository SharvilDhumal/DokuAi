import { useLocation } from '@docusaurus/router';
import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import { FaCopy, FaDownload } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import styles from './index.module.css';


// Utility to remove lines like "Image 1", "Image 2", etc.
function removeImageTextLines(md) {
  return md
    .split('\n')
    // Remove lines like "Image 1", "Image 2", etc.
    .filter(line => !/^Image\s+\d+\s*$/.test(line.trim()))
    // Remove lines like "Images" or "## Images"
    .filter(line => !/^#+\s*Images\s*$/.test(line.trim()) && line.trim() !== "Images")
    // Remove markdown image lines ![...](...)
    .filter(line => !/^!\[.*\]\(.*\)$/.test(line.trim()))
    .join('\n');
}

export default function MarkdownPreview() {
  const location = useLocation();
  const [markdown, setMarkdown] = useState('');
  const [filename, setFilename] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState('Copy Markdown');
  const [downloadStatus, setDownloadStatus] = useState('Download Markdown');

  useEffect(() => {
    if (location.state) {
      setMarkdown(location.state.markdown || '');
      setFilename(location.state.filename || 'Untitled Document.md');
    }
    setIsLoading(false);
  }, [location.state]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown)
      .then(() => {
        setCopyStatus('Copied!');
        setTimeout(() => setCopyStatus('Copy Markdown'), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        setCopyStatus('Failed to copy');
        setTimeout(() => setCopyStatus('Copy Markdown'), 2000);
      });
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace(/\.[^/.]+$/, '')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadStatus('Downloaded!');
    setTimeout(() => setDownloadStatus('Download Markdown'), 2000);
  };

  if (isLoading) {
    return (
      <Layout title="Loading..." description="Loading document preview">
        <div className={styles.loadingContainer}>
          <p>Loading document preview...</p>
        </div>
      </Layout>
    );
  }

  // Clean the markdown before rendering
  const cleanedMarkdown = removeImageTextLines(markdown);

  return (
    <Layout
      title={`Markdown Preview - ${filename}`}
      description="View your AI-converted Markdown document"
    >
      <Head>
        <html data-theme="dark" />
      </Head>
      <main className={styles.previewContainer}>
        <div className={styles.previewWrapper}>
          {/* Header section */}
          <div className={styles.header}>
            <h1 className={styles.title}>
              <span className={styles.titleHighlight}>Markdown Preview</span>
            </h1>
            <p className={styles.subtitle}>
              Document: <span className={styles.highlight}>{filename}</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className={styles.buttonGroup}>
            <button
              onClick={handleCopy}
              className={styles.actionButton}
            >
              <FaCopy className={styles.buttonIcon} />
              {copyStatus}
            </button>
            <button
              onClick={handleDownload}
              className={`${styles.actionButton} ${styles.downloadButton}`}
            >
              <FaDownload className={styles.buttonIcon} />
              {downloadStatus}
            </button>
          </div>

          {/* Markdown preview */}
          <div className={styles.previewContent}>
            <div className={styles.markdownPreview}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  table: ({ node, ...props }) => (
                    <div className={styles.tableWrapper}>
                      <table {...props} className={styles.markdownTable} />
                    </div>
                  ),
                  code: ({ node, inline, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline ? (
                      <pre className={styles.codeBlock}>
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    ) : (
                      <code className={styles.inlineCode} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {cleanedMarkdown}
              </ReactMarkdown>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footerActions}>
            <Link to="/upload" className={styles.footerLink}>
              ← Upload another document
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}