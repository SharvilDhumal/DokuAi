import React, { useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import { FaCopy, FaDownload, FaCheck, FaArrowLeft, FaSun, FaMoon } from 'react-icons/fa';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './index.module.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked
const renderer = new marked.Renderer();

// Custom image renderer to handle relative paths and ensure proper display
renderer.image = (href, title, text) => {
  try {
    if (!href) return '';
    let imageUrl = typeof href === 'string' ? href : href.url || href.data || '';
    // If the imageUrl is absolute and starts with the backend domain, convert to relative for preview
    if (imageUrl.startsWith('http://localhost:5000/uploads/')) {
      imageUrl = imageUrl.replace('http://localhost:5000', '');
    }
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
      if (!imageUrl.startsWith('/uploads/')) {
        imageUrl = `/uploads/${imageUrl.replace(/^[\\/]+/, '')}`;
      }
    }
    const altText = text ? String(text).replace(/^['"]|['"]$/g, '') : '';
    // Use a fallback error image on error
    return `
      <div class="${styles.imageContainer}" style="min-height:180px;display:flex;align-items:center;justify-content:center;">
        <img 
          src="${imageUrl}" 
          alt="${altText}" 
          ${title ? `title="${title}"` : ''} 
          class="${styles.markdownImage}"
          onerror="this.onerror=null;this.src='/static/img/image-error.png';"
        />
        ${altText ? `<div class="${styles.imageCaption}">${altText}</div>` : ''}
      </div>`;
  } catch (error) {
    console.error('Error rendering image:', { href, title, text, error });
    return `<div class="${styles.imageError}" style="min-height:180px;display:flex;align-items:center;justify-content:center;">Image failed to load</div>`;
  }
};

marked.setOptions({
  breaks: true,
  gfm: true,
  smartLists: true,
  smartypants: true
});

function cleanMarkdownContent(md) {
  if (!md) return '';
  // Only minimal cleaning: do not alter structure, just normalize line endings
  return md.replace(/\r\n?/g, '\n');
}

export default function MarkdownPreview() {
  const location = useLocation();
  const [markdown, setMarkdown] = useState('');
  const [filename, setFilename] = useState('');
  const [placeholderMap, setPlaceholderMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState('Copy Markdown');
  const [downloadStatus, setDownloadStatus] = useState('Download Markdown');
  const [darkMode, setDarkMode] = useState(true);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'light' : 'dark');
  };

  useEffect(() => {
    if (location.state) {
      setMarkdown(location.state.markdown || '');
      setFilename(location.state.filename || 'Untitled Document.md');
      setPlaceholderMap(location.state.placeholder_map || {});
    }
    setIsLoading(false);
  }, [location.state]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanMarkdownContent(markdown))
      .then(() => {
        setCopyStatus('Copied!');
        setTimeout(() => setCopyStatus('Copy Markdown'), 2000);
      })
      .catch(() => {
        setCopyStatus('Failed to copy');
        setTimeout(() => setCopyStatus('Copy Markdown'), 2000);
      });
  };

  const handleDownload = () => {
    const blob = new Blob([cleanMarkdownContent(markdown)], { type: 'text/markdown;charset=utf-8' });
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

  const renderMarkdown = () => {
    try {
      let cleaned = cleanMarkdownContent(markdown);
      // Replace any remaining placeholders with image tags using placeholderMap
      if (placeholderMap && typeof cleaned === 'string') {
        Object.entries(placeholderMap).forEach(([ph, url]) => {
          cleaned = cleaned.split(ph).join(`![](${url})`);
        });
      }
      // Let marked render the markdown as-is, preserving all structure
      const html = marked(cleaned);
      return DOMPurify.sanitize(html, {
        ADD_TAGS: ['img'],
        ADD_ATTR: ['src', 'alt', 'title', 'class', 'onerror']
      });
    } catch (error) {
      console.error('Error rendering markdown:', error);
      return '<p>Error rendering content. Please try again.</p>';
    }
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

  return (
    <Layout
      title={`Markdown Preview - ${filename}`}
      description="View your AI-converted Markdown document"
      wrapperClassName={styles.layoutWrapper}
    >
      <Head>
        <html data-theme="dark" />
      </Head>
      <div className={styles.previewWrapper}>
        <div className={styles.headerContainer}>
          <Link to="/upload" className={styles.backButton}>
            <FaArrowLeft className={styles.backIcon} /> Back to Upload
          </Link>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>
              <span className={styles.titleHighlight}>Markdown Preview</span>
            </h1>
            <p className={styles.filename}>
              <span className={styles.filenameLabel}>Document:</span>
              <span className={styles.filenameText}>{filename}</span>
            </p>
          </div>
          <div className={styles.buttonGroup}>
            <button
              onClick={handleCopy}
              className={clsx(styles.actionButton, styles.copyButton, {
                [styles.success]: copyStatus === 'Copied!'
              })}
              disabled={copyStatus === 'Copied!'}
            >
              {copyStatus === 'Copied!' ? (
                <FaCheck className={styles.buttonIcon} />
              ) : (
                <FaCopy className={styles.buttonIcon} />
              )}
              {copyStatus}
            </button>
            <button
              onClick={handleDownload}
              className={clsx(styles.actionButton, styles.downloadButton, {
                [styles.success]: downloadStatus === 'Downloaded!'
              })}
              disabled={downloadStatus === 'Downloaded!'}
            >
              <FaDownload className={styles.buttonIcon} />
              {downloadStatus}
            </button>
          </div>
        </div>
        <div
          className={styles.markdownPreview}
          dangerouslySetInnerHTML={{ __html: renderMarkdown() }}
        />
      </div>
    </Layout>
  );
}