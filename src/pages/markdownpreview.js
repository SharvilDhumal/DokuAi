import React, { useState, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import { FaCopy, FaDownload, FaCheck, FaArrowLeft } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
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

const ImageGuide = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-8 w-full max-w-2xl mx-auto">
      <button
        className="w-full flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900 rounded-t-lg border border-b-0 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-200 font-semibold focus:outline-none"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>How to include images in your markdown</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border border-blue-200 dark:border-blue-700 rounded-b-lg bg-white dark:bg-slate-800 px-6 py-4 text-sm text-slate-700 dark:text-slate-200">
          <p>
            You can include images in your markdown using the following syntax:
          </p>
          <pre className="bg-slate-100 dark:bg-slate-900 rounded p-2 my-2 overflow-x-auto">
            <code>![Alt text](image-url)</code>
          </pre>
          <p>For example:</p>
          <pre className="bg-slate-100 dark:bg-slate-900 rounded p-2 my-2 overflow-x-auto">
            <code>![Example Logo](https://example.com/logo.png)</code>
          </pre>
          <p>Or for local images (relative to your markdown file):</p>
          <pre className="bg-slate-100 dark:bg-slate-900 rounded p-2 my-2 overflow-x-auto">
            <code>![Local Image](./images/example.jpg)</code>
          </pre>
          <p>
            <b>Supported image formats:</b> JPG, PNG, GIF, SVG, WebP
            <br />
            <b>Note:</b> Images are not displayed in this preview. You can add or edit image links in your markdown file as needed.
          </p>
        </div>
      )}
    </div>
  );
};

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
    navigator.clipboard.writeText(removeImageTextLines(markdown))
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
    const blob = new Blob([removeImageTextLines(markdown)], { type: 'text/markdown;charset=utf-8' });
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

  const cleanedMarkdown = removeImageTextLines(markdown);

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
        <div className={styles.markdownCard}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({ node, ...props }) => <h1 className={styles.markdownH1} {...props} />,
              h2: ({ node, ...props }) => <h2 className={styles.markdownH2} {...props} />,
              h3: ({ node, ...props }) => <h3 className={styles.markdownH3} {...props} />,
              h4: ({ node, ...props }) => <h4 className={styles.markdownH4} {...props} />,
              p: ({ node, ...props }) => <p className={styles.markdownP} {...props} />,
              ul: ({ node, ...props }) => <ul className={styles.markdownUl} {...props} />,
              ol: ({ node, ...props }) => <ol className={styles.markdownOl} {...props} />,
              li: ({ node, ordered, ...props }) => (
                <li className={ordered ? styles.markdownLiOrdered : styles.markdownLi} {...props} />
              ),
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline ? (
                  <div className={styles.codeBlockWrapper}>
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match ? match[1] : 'text'}
                      showLineNumbers={true}
                      wrapLines={true}
                      customStyle={{
                        margin: 0,
                        borderRadius: '0.5rem',
                        fontSize: '0.9em',
                        lineHeight: '1.6',
                        background: 'rgba(0, 0, 0, 0.4)'
                      }}
                      codeTagProps={{
                        style: {
                          fontFamily: '"Fira Code", monospace',
                          fontSize: '0.9em',
                        },
                      }}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={styles.inlineCode} {...props}>
                    {children}
                  </code>
                );
              },
              table: ({ node, ...props }) => (
                <div className={styles.tableWrapper}>
                  <table className={styles.markdownTable} {...props} />
                </div>
              ),
              th: ({ node, ...props }) => <th className={styles.markdownTh} {...props} />,
              td: ({ node, ...props }) => <td className={styles.markdownTd} {...props} />,
              blockquote: ({ node, ...props }) => (
                <blockquote className={styles.markdownBlockquote} {...props} />
              ),
              hr: ({ node, ...props }) => <hr className={styles.markdownHr} {...props} />,
              a: ({ node, ...props }) => <a className={styles.markdownLink} {...props} />,
              img: () => null,
            }}
          >
            {cleanedMarkdown}
          </ReactMarkdown>
        </div>
      </div>
    </Layout>
  );
}