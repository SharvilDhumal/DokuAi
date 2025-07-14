import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import styles from '../components/ResetPassword/ResetPassword.module.css';
import { AUTH_API_URL } from '../env-config';

export default function ResetPasswordPage() {
    const [token, setToken] = useState('');
    const [isValid, setIsValid] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token');
        setToken(t || '');
        if (!t) {
            setIsValid(false);
            setIsLoading(false);
            setMessage('Invalid or missing reset token.');
            return;
        }
        // Validate token
        axios.get(`${AUTH_API_URL}/verify-reset-token`, { params: { token: t } })
            .then(res => {
                if (res.data.success) {
                    setIsValid(true);
                } else {
                    setIsValid(false);
                    setMessage('Invalid or expired reset link.');
                }
            })
            .catch(() => {
                setIsValid(false);
                setMessage('Invalid or expired reset link.');
            })
            .finally(() => setIsLoading(false));
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.newPassword || !formData.confirmPassword) {
            setMessage('Please fill in all fields.');
            return;
        }
        if (formData.newPassword.length < 8) {
            setMessage('Password must be at least 8 characters long.');
            return;
        }
        if (formData.newPassword !== formData.confirmPassword) {
            setMessage('Passwords do not match.');
            return;
        }
        setIsLoading(true);
        setMessage('');
        try {
            const res = await axios.post(`${AUTH_API_URL}/reset-password`, {
                token,
                newPassword: formData.newPassword
            });
            if (res.data.success) {
                setSuccess(true);
                setMessage('Password reset successful! You can now close this tab and return to the login page.');
            } else {
                setMessage(res.data.message || 'Failed to reset password.');
            }
        } catch (err) {
            setMessage('Failed to reset password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout title="Reset Password" description="Reset your DokuAI account password">
            <Head>
                <html data-theme="dark" />
            </Head>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h1>Reset Your Password</h1>
                        <p>Enter your new password below.</p>
                    </div>
                    {isLoading ? (
                        <div className={styles.loading}><p>Loading...</p></div>
                    ) : !isValid ? (
                        <div className={styles.error}><p>{message}</p></div>
                    ) : success ? (
                        <div className={styles.footer}><p>{message}</p></div>
                    ) : (
                        <form onSubmit={handleSubmit} className={styles.form} style={{ gap: '2rem' }}>
                            <div className={styles.inputGroup}>
                                <div className={styles.passwordInput} style={{ borderRadius: '8px', overflow: 'hidden', background: '#20233a' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="newPassword"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        onChange={handleInputChange}
                                        placeholder="Enter your new password"
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        style={{ borderRadius: '8px' }}
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>
                            <div className={styles.inputGroup}>
                                <div className={styles.passwordInput} style={{ borderRadius: '8px', overflow: 'hidden', background: '#20233a' }}>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        placeholder="Confirm your new password"
                                        required
                                        minLength={8}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        style={{ borderRadius: '8px' }}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>
                            {message && <div className={styles.error}><p>{message}</p></div>}
                            <button type="submit" className={styles.submitButton} disabled={isLoading}>
                                {isLoading ? 'Resetting...' : 'Reset Password'}
                            </button>
                            <div className={styles.footer}>
                                <p>After resetting, you can close this tab and return to the login page.</p>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </Layout>
    );
} 