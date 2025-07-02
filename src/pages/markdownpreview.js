import { useLocation } from '@docusaurus/router';
import styles from './index.module.css';
import React, { useState, useEffect } from 'react';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

// In markdownpreview.js, update the getImageUrl function
const getImageUrl = (url, BACKEND_URL) => {
  if (!url) return '';
  
  // If it's already a full URL, return as is
  if (url.startsWith('http')) {
    return url;
  }
  
  // Remove any leading slashes or uploads/ to prevent duplication
  const cleanPath = url.replace(/^\/+/, '').replace(/^uploads\//, '');
  return `${BACKEND_URL}/uploads/${cleanPath}`;
};

const MarkdownImage = ({ src, alt }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { siteConfig } = useDocusaurusContext();
  const BACKEND_URL = siteConfig.customFields?.BACKEND_URL || 'http://localhost:5000';
  
  // Process the image URL
  const processImageUrl = (url) => {
    if (!url) return '';
    
    // If it's already a full URL, use it as is
    if (url.startsWith('http')) {
      return url;
    }
    
    // Remove leading slashes and uploads/ to prevent duplication
    const cleanPath = url.replace(/^\/+/, '').replace(/^uploads\//, '');
    return `${BACKEND_URL}/uploads/${cleanPath}`;
  };
  
  const imageUrl = processImageUrl(src);
  
  return (
    <div className={styles.imageWrapper}>
      {!imageError ? (
        <img
          src={imageUrl}
          alt={alt || 'Document image'}
          className={`${styles.markdownImage} ${imageLoaded ? styles.loaded : ''}`}
          onLoad={() => {
            console.log('Image loaded successfully:', imageUrl);
            setImageLoaded(true);
          }}
          onError={(e) => {
            console.error('Error loading image:', imageUrl, e);
            setImageError(true);
          }}
          loading="lazy"
        />
      ) : (
        <div className={styles.imageError}>
          [Image: {alt || 'Document image'}]
        </div>
      )}
      {!imageLoaded && !imageError && (
        <div className={styles.imageLoading}>
          Loading image...
        </div>
      )}
    </div>
  );
};

export default function MarkdownPreview() {
  const { siteConfig } = useDocusaurusContext();
  const location = useLocation();
  const [markdown, setMarkdown] = useState('');
  const [filename, setFilename] = useState('');
  const [images, setImages] = useState([]);
  const BACKEND_URL = siteConfig.customFields?.BACKEND_URL || 'http://localhost:5000';
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Location state:', location.state); // Debug log
    
    if (location.state) {
      console.log('Markdown content:', location.state.markdown ? 'exists' : 'missing');
      console.log('Filename:', location.state.filename || 'not provided');
      console.log('Images:', location.state.images?.length || 0, 'images');
      
      setMarkdown(location.state.markdown || '');
      setFilename(location.state.filename || '');
      setImages(location.state.images || []);
    } else {
      console.log('No location state provided');
    }
    
    setIsLoading(false);
  }, [location.state]);

  // Process markdown to handle images
  const processMarkdown = (content, imageList) => {
    if (!content) return '';
    
    // Replace image placeholders with proper markdown image syntax
    let processed = content;
    imageList.forEach((img, idx) => {
      const imageUrl = getImageUrl(img.data, BACKEND_URL);
      processed = processed.replace(
        new RegExp(`\\[IMAGE_PLACEHOLDER_${idx}\\]`, 'g'),
        `![Image ${idx}](${imageUrl})`
      );
    });
    
    return processed;
  };

  const processedMarkdown = processMarkdown(markdown, images);

  if (isLoading) {
    return (
      <Layout title="Loading..." description="Loading document preview">
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <p>Loading document preview...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!markdown) {
    return (
      <Layout title="No Content" description="No document content available">
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <h1>No Document Content</h1>
            <p>Unable to load the document content. Please try converting the document again.</p>
            <a href="/" className={styles.primaryButton}>
              Back to Home
            </a>
          </div>
        </div>
      </Layout>
    );
  }

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
          <div className={styles.markdownContent}>
            <ReactMarkdown 
              rehypePlugins={[rehypeRaw]}
              components={{
                img: (props) => <MarkdownImage {...props} />,
                p: ({ node, ...props }) => {
                  // Check if the paragraph only contains an image
                  if (node.children.length === 1 && node.children[0].tagName === 'img') {
                    return <div {...props} />;
                  }
                  return <p {...props} />;
                }
              }}
            >
              {processedMarkdown}
            </ReactMarkdown>
          </div>

          <div className={styles.buttonGroup}>
            <button onClick={() => {
              navigator.clipboard.writeText(processedMarkdown)
                .then(() => {
                  alert('Markdown copied to clipboard!');
                })
                .catch(err => {
                  console.error('Failed to copy: ', err);
                });
            }} className={styles.primaryButton}>
              Copy Markdown
            </button>
            <button onClick={() => {
              const blob = new Blob([processedMarkdown], { type: 'text/markdown;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filename.replace(/\.[^/.]+$/, '')}.md`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }} className={styles.secondaryButton}>
              Download Markdown
            </button>
          </div>

          <div className={styles.fileNote} style={{ marginTop: '2rem' }}>
            <div className={styles.noteItem}>
              <span className={styles.noteIcon}>↩️</span>
              <a href="/upload" className={styles.noteLink}>
                Upload another document
              </a>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}