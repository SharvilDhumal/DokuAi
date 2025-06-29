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
        setMessage({ text: 'Processing file with AI...', type: 'info' });

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('http://localhost:5000/api/convert', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                // Redirect to markdown preview page with markdown and filename
                history.push({
                    pathname: '/markdownpreview',
                    state: { markdown: data.markdown, filename: data.filename }
                });
            } else {
                setMessage({ text: data.error || 'Conversion failed', type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Error connecting to conversion service', type: 'error' });
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
                            {isProcessing ? 'Processing...' : file ? 'Convert with AI →' : 'Select a file first'}
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
                    </div>
                </div>
            </main>
        </Layout>
    );
}