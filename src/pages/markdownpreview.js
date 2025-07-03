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
  let inNoteBlock = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Convert ○ or o to -
    //     line = line.replace(/^[○o]\s*/, '- ');

    // Handle note blocks: Only the first line after Note: is included in the blockquote
    if (/^Note:/i.test(line.trim())) {
      cleaned.push('> **Note:** ' + line.replace(/^Note:/i, '').trim());
      inNoteBlock = true;
      continue;
    } else if (inNoteBlock && line.trim() !== '') {
      // If the next line is a list or blank, end the note block
      if (/^(\d+\.\s+|-|\*|\+)\s+/.test(line) || line.trim() === '') {
        inNoteBlock = false;
        cleaned.push(line);
      } else {
        // Otherwise, treat as normal text (not part of the note)
        inNoteBlock = false;
        cleaned.push(line);
      }
      continue;
    }

    // If this line is a bullet and previous line is not empty and not a bullet, insert a blank line
    if (/^-\s+/.test(line) && i > 0 && lines[i - 1].trim() !== '' && !/^(\d+\.\s+|-|\*|\+)\s+/.test(lines[i - 1])) {
      cleaned.push('');
    }

    cleaned.push(line);
  }

  return cleaned
    .filter(line => !/^Image\s+\d+\s*$/.test(line.trim()))
    .filter(line => !/^#+\s*Images\s*$/.test(line.trim()))
    .filter(line => !/^!\[.*\]\(.*\)$/.test(line.trim()))
    .filter(line => line.trim() !== '' || line === '\n')
    .join('\n')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
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
    const cleaned = cleanMarkdownContent(markdown);
    const html = marked(cleaned);
    return DOMPurify.sanitize(html);
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
      <button
        className={styles.themeToggle}
        onClick={toggleTheme}
        aria-label="Toggle dark mode"
      >
        {darkMode ? <FaSun /> : <FaMoon />}
      </button>
    </Layout>
  );
}