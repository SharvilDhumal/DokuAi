// upload.js
import React, { useState } from 'react';
import Layout from '@theme/Layout';
import styles from './index.module.css';
import Head from '@docusaurus/Head';
import { useHistory } from '@docusaurus/router';

export default function UploadDashboard() {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [message, setMessage] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [markdownOutput, setMarkdownOutput] = useState('');
    const history = useHistory();

    // Use environment variable for API URL with fallback to localhost
    const API_URL = 'http://localhost:5000';

    const handleChange = (e) => {
        const selectedFile = e.target.files[0];
        validateFile(selectedFile);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        validateFile(droppedFile);
    };

    const validateFile = (file) => {
        if (file && (file.type === 'application/pdf' || file.name.endsWith('.docx'))) {
            setFile(file);
            setFileName(file.name);
            setMessage({ text: 'File ready for conversion', type: 'success' });
        } else {
            setMessage({ text: 'Only PDF or DOCX files are allowed', type: 'error' });
            setFile(null);
            setFileName('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setMessage({ text: 'Please select a valid file before uploading', type: 'error' });
            return;
        }

        setIsProcessing(true);
        setMessage({ text: 'Checking server status...', type: 'info' });

        try {
            // First check if backend is reachable
            setMessage({ text: 'Checking server availability...', type: 'info' });
            const healthCheck = await fetch(`${API_URL}/api/health`);

            if (!healthCheck.ok) {
                const healthData = await healthCheck.json().catch(() => ({}));
                throw new Error(
                    healthData.error || 'Backend service is unavailable. Please try again later.'
                );
            }

            // Server is healthy, proceed with conversion
            setMessage({ text: 'Starting conversion...', type: 'info' });

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/api/convert`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error ||
                    `Conversion failed (${response.status} ${response.statusText})`
                );
            }

            const data = await response.json();

            const processedImages = data.images?.map(img => ({
                ...img,
                src: `data:${img.type};base64,${img.data}`
            })) || [];

            history.push({
                pathname: '/markdownpreview',
                state: {
                    markdown: data.markdown,
                    filename: data.filename,
                    images: processedImages
                }
            });
        } catch (error) {
            console.error('Conversion error:', error);

            let userMessage = error.message;

            // Network error (backend not running)
            if (error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError')) {
                userMessage = 'Cannot connect to conversion service. Please ensure the backend is running.';
            }
            // Backend service error
            else if (error.message.includes('Backend service')) {
                userMessage = error.message;
            }

            setMessage({
                text: userMessage,
                type: 'error'
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Layout title="Upload Document | DokuAI" description="Upload and convert documents with AI">
            <Head>
                <html data-theme="dark" />
            </Head>
            <main className={styles.uploadContainer}>
                <div className={`${styles.uploadCard} ${isDragging ? styles.dragging : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}>
                    <h2 className={styles.uploadTitle}>Upload Documentation</h2>
                    <p className={styles.uploadSubtitle}>Convert PDF/DOCX to structured Markdown with AI</p>

                    <form onSubmit={handleSubmit} className={styles.uploadForm}>
                        <div className={styles.dropZone}>
                            <input
                                type="file"
                                id="file-upload"
                                accept=".pdf,.docx"
                                onChange={handleChange}
                                className={styles.fileInput}
                            />
                            <label htmlFor="file-upload" className={styles.dropZoneLabel}>
                                <div className={styles.uploadIcon}>📄</div>
                                <p>{fileName || 'Drag & drop your file here or click to browse'}</p>
                                {fileName && (
                                    <div className={styles.fileInfo}>
                                        <span className={styles.fileName}>{fileName}</span>
                                    </div>
                                )}
                            </label>
                        </div>

                        {message && (
                            <p className={`${styles.message} ${styles[message.type]}`}>
                                {message.text}
                            </p>
                        )}

                        <button
                            type="submit"
                            className={styles.uploadButton}
                            disabled={!file || isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    Processing...
                                </>
                            ) : file ? (
                                'Convert with AI →'
                            ) : (
                                'Select a file first'
                            )}
                        </button>
                    </form>

                    <div className={styles.fileNote}>
                        <div className={styles.noteItem}>
                            <span className={styles.noteIcon}>✅</span>
                            <span>Supports PDF and DOCX formats</span>
                        </div>
                        <div className={styles.noteItem}>
                            <span className={styles.noteIcon}>⚡</span>
                            <span>AI-powered Markdown conversion</span>
                        </div>
                        <div className={styles.noteItem}>
                            <span className={styles.noteIcon}>🔒</span>
                            <span>Secure document processing</span>
                        </div>
                        <div className={styles.noteItem}>
                            <span className={styles.noteIcon}>⚠️</span>
                            <span>Backend must be running at {API_URL}</span>
                        </div>
                    </div>
                </div>
            </main>
        </Layout>
    );
}