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
  smartypants: true,
  renderer: renderer
});

function cleanMarkdownContent(md) {
  if (!md) return '';

  // First, handle any special image placeholders or formatting
  let cleanedMd = md;

  // Handle markdown image links that might have spaces or special characters
  cleanedMd = cleanedMd.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
    // If the source is already a full URL or data URI, leave it as is
    if (src.startsWith('http') || src.startsWith('data:')) {
      return match;
    }

    // Clean up the source path
    let cleanSrc = src.trim();

    // Remove any surrounding quotes
    cleanSrc = cleanSrc.replace(/^['"]|['"]$/g, '');

    // If it's a local path without the /uploads/ prefix, add it
    if (!cleanSrc.startsWith('/uploads/') && !cleanSrc.startsWith('uploads/')) {
      cleanSrc = `uploads/${cleanSrc}`.replace(/^\/+/, '');
    }

    return `![${alt}](${cleanSrc})`;
  });

  // Handle any remaining image placeholders that might have been missed
  const imagePlaceholderRegex = /\[IMAGE_\d+\]/g;
  cleanedMd = cleanedMd.replace(imagePlaceholderRegex, '');

  // Handle any image paths that might be wrapped in HTML tags
  const imgTagRegex = /<img[^>]+src="([^">]+)"/g;
  cleanedMd = cleanedMd.replace(imgTagRegex, (match, src) => {
    if (!src.startsWith('http') && !src.startsWith('data:')) {
      const cleanSrc = src.startsWith('/') ? src.substring(1) : src;
      return match.replace(src, `/uploads/${cleanSrc}`);
    }
    return match;
  });

  // Handle line breaks and empty lines
  let lines = cleanedMd.split('\n');
  let cleaned = [];
  let inCodeBlock = false;
  let inQuote = false;
  let inNoteBlock = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Skip empty lines at start of document
    if (cleaned.length === 0 && line === '') continue;

    // Handle code blocks
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      cleaned.push(line);
      continue;
    }

    // Skip processing inside code blocks
    if (inCodeBlock) {
      cleaned.push(line);
      continue;
    }

    // Handle blockquotes
    if (line.startsWith('>')) {
      if (!inQuote) {
        inQuote = true;
        cleaned.push(''); // Add an empty line before quote if needed
      }
      cleaned.push(line);
      continue;
    } else if (inQuote) {
      inQuote = false;
      cleaned.push(''); // Add an empty line after quote
    }

    // Handle note blocks with enhanced formatting
    if (/^> \*\*Note:\*\*/.test(line.trim())) {
      cleaned.push(`> **Note:** ${line.replace(/^> \*\*Note:\*\*/, '').trim()}`);
      inNoteBlock = true;
      continue;
    } else if (inNoteBlock && line.trim().startsWith('>')) {
      cleaned.push(line);
      continue;
    } else {
      inNoteBlock = false;
    }

    // Only normalize non-standard bullets (○, o, •) to '- ', but DO NOT touch standard Markdown bullets or headings!
    line = line.replace(/^([○o•])\s+/, '- ');

    // Ensure proper spacing before headings
    if (line.startsWith('#') && i > 0 && lines[i - 1].trim() !== '') {
      cleaned.push('');
    }

    // Remove duplicate empty lines
    if (line.trim() === '' && cleaned.length > 0 && cleaned[cleaned.length - 1].trim() === '') {
      continue;
    }

    cleaned.push(line);
  }

  return cleaned.join('\n');
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
          // Replace all occurrences of the placeholder with the image markdown
          cleaned = cleaned.split(ph).join(`![](${url})`);
        });
      }
      const renderer = new marked.Renderer();

      renderer.image = (href, title, text) => {
        try {
          if (!href) return '';

          // Handle both string URLs and image objects
          let imageUrl = typeof href === 'string' ? href : href.url || href.data || '';

          // Ensure the URL is properly formatted
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            if (!imageUrl.startsWith('/uploads/')) {
              imageUrl = `/uploads/${imageUrl.replace(/^[\\/]+/, '')}`;
            }
          }

          // Clean up alt text
          const altText = text ? String(text).replace(/^['"]|['"]$/g, '') : '';

          return `
            <div class="${styles.imageContainer}">
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

      const html = marked(cleaned, { renderer });

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