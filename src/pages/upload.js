// upload.js
import React, { useState } from 'react';
import Layout from '@theme/Layout';
import styles from './index.module.css';
import Head from '@docusaurus/Head';
import { useHistory } from 'react-router-dom';

export default function UploadDashboard() {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [message, setMessage] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [markdownOutput, setMarkdownOutput] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
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
        setUploadProgress(0);
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

            return new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('file', file);

                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const progress = Math.round((e.loaded / e.total) * 100);
                        setUploadProgress(progress);
                        setMessage({
                            text: `Uploading... ${progress}%`,
                            type: 'info'
                        });
                    }
                });

                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            try {
                                const data = JSON.parse(xhr.responseText);
                                resolve(data);
                            } catch (error) {
                                reject(new Error('Failed to parse response'));
                            }
                        } else {
                            try {
                                const errorData = JSON.parse(xhr.responseText);
                                reject(new Error(
                                    errorData.error ||
                                    `Conversion failed (${xhr.status} ${xhr.statusText})`
                                ));
                            } catch {
                                reject(new Error(
                                    `Conversion failed (${xhr.status} ${xhr.statusText})`
                                ));
                            }
                        }
                    }
                };

                xhr.onerror = () => {
                    reject(new Error('Network error occurred'));
                };

                xhr.open('POST', `${API_URL}/api/convert`);
                xhr.setRequestHeader('Accept', 'application/json');
                xhr.send(formData);
            })
                .then(data => {
                    // Navigate to markdownpreview page instead of downloading
                    history.push('/markdownpreview', {
                        markdown: data.markdown,
                        filename: data.filename,
                        images: data.images
                    });
                })
                .catch(error => {
                    throw error;
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
            setUploadProgress(0);
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
                    <h2 className={styles.uploadTitle}>Document Conversion</h2>
                    <p className={styles.uploadSubtitle}>Convert to Markdown with embedded images</p>

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
                            {isProcessing ? 'Processing...' : 'Convert with AI'}
                        </button>
                    </form>

                    <div className={styles.fileNote}>
                        <div className={styles.noteItem}>
                            <span className={styles.noteIcon}>✅</span>
                            <span>Images will be embedded in the Markdown</span>
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
                        <div className={styles.noteItem}>
                            <span className={styles.noteIcon}>ℹ️</span>
                            <span>For best results, use documents with clear headings and images</span>
                        </div>
                    </div>
                </div>
            </main>
        </Layout>
    );
}