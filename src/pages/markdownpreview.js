import React, { useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import { FaCopy, FaDownload, FaCheck, FaArrowLeft, FaSun, FaMoon } from 'react-icons/fa'; // updated import
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './index.module.css';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
  smartLists: true,
  smartypants: true,
});

function cleanMarkdownContent(md) {
  if (!md) return '';

  let lines = md.split('\n');
  let cleaned = [];
  let inCodeBlock = false;
  let inNoteBlock = false;
  let currentImage = null;

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

    // Handle image descriptions from the backend
    if (line.toLowerCase().includes('image') && line.toLowerCase().includes('path:')) {
      // This is an image description line, try to extract the path
      const pathMatch = line.match(/path:\s*([^\s]+)/i);
      if (pathMatch && pathMatch[1]) {
        let src = pathMatch[1].trim();
        // Clean up the path
        src = src.replace(/^['"]|['"]$/g, '');
        // Make sure the path is properly formatted
        if (!src.startsWith('http') && !src.startsWith('data:')) {
          if (!src.startsWith('/uploads/') && !src.startsWith('uploads/')) {
            src = `/uploads/${src}`;
          }
          // Add the image to the cleaned output
          cleaned.push(`![](${src})`);
          continue;
        }
      }
    }
    
    // Handle standard markdown image syntax
    if (line.startsWith('![') && line.includes('](') && line.includes(')')) {
      try {
        const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
        if (imgMatch && imgMatch[2]) {
          let [_, alt, src] = imgMatch;
          if (src && typeof src === 'string') {
            src = src.trim().replace(/^['"]|['"]$/g, '');
            if (!src.startsWith('http') && !src.startsWith('data:')) {
              if (!src.startsWith('/uploads/') && !src.startsWith('uploads/')) {
                src = `/uploads/${src}`;
              }
              line = `![${alt || ''}](${src})`;
            }
          }
        }
      } catch (error) {
        console.warn('Error processing image line:', line, error);
      }
      cleaned.push(line);
      continue;
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
  const [isLoading, setIsLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState('Copy Markdown');
  const [downloadStatus, setDownloadStatus] = useState('Download Markdown');
  const [darkMode, setDarkMode] = useState(true); // theme state

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.setAttribute('data-theme', darkMode ? 'light' : 'dark');
  };

  useEffect(() => {
    if (location.state) {
      setMarkdown(location.state.markdown || '');
      setFilename(location.state.filename || 'Untitled Document.md');
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
      // First, clean the markdown but preserve images
      const cleaned = cleanMarkdownContent(markdown);
      
      // Configure marked to handle images properly
      const renderer = new marked.Renderer();
      
      // Custom image renderer to ensure proper image paths
      renderer.image = (href, title, text) => {
        try {
          // Handle undefined or null href
          if (!href) {
            console.warn('Image has no source (href is undefined or null)');
            return ''; // Return empty string if no href
          }
          
          // Convert href to string and clean it up
          let imageUrl = String(href).trim();
          
          // If this is just a filename without a path, add the uploads directory
          if (!imageUrl.includes('/') && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            imageUrl = `/uploads/${imageUrl}`;
          }
          
          // Make sure the image path is absolute if it's in the uploads folder
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            // If it's a relative path, make it absolute from the root
            if (imageUrl.startsWith('/uploads/')) {
              imageUrl = `http://localhost:5000${imageUrl}`;
            } else if (imageUrl.startsWith('uploads/')) {
              imageUrl = `http://localhost:5000/${imageUrl}`;
            } else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
              // If it's a relative path without the uploads prefix, add it
              imageUrl = `http://localhost:5000/uploads/${imageUrl}`;
            }
          }
          
          // Clean up the alt text
          const altText = text ? String(text).replace(/^['"]|['"]$/g, '') : '';
          
          // Create the image tag with error handling
          return `<img 
            src="${imageUrl}" 
            alt="${altText}" 
            ${title ? `title="${title}"` : ''} 
            class="markdown-image"
            onerror="this.style.display='none'; console.error('Failed to load image: ${imageUrl}')"
          />`;
        } catch (error) {
          console.error('Error rendering image:', { href, title, text, error });
          return `<div class="image-error">[Image failed to load: ${String(href).substring(0, 30)}...]</div>`;
        }
      };
      
      // Use the custom renderer
      const html = marked(cleaned, { renderer });
      
      // Sanitize the HTML but allow images
      return DOMPurify.sanitize(html, {
        ADD_TAGS: ['img'],
        ADD_ATTR: ['src', 'alt', 'title', 'class']
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