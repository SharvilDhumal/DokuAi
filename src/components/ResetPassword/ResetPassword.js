import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import styles from './ResetPassword.module.css';
import { AUTH_API_URL } from '../../env-config';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isValidToken, setIsValidToken] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const token = searchParams.get('token');
    const isPopup = searchParams.get('isPopup') === 'true';

    useEffect(() => {
        if (!token) {
            toast.error('Invalid reset link');
            navigate('/');
            return;
        }

        validateToken();
    }, [token, navigate]);

    const validateToken = async () => {
        try {
            const response = await axios.get(`${AUTH_API_URL}/verify-reset-token`, {
                params: { token }
            });

            if (response.data.success) {
                setIsValidToken(true);
            } else {
                setIsValidToken(false);
                toast.error('Invalid or expired reset link');
            }
        } catch (error) {
            setIsValidToken(false);
            toast.error('Invalid or expired reset link');
        } finally {
            setIsValidating(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        if (!formData.newPassword || !formData.confirmPassword) {
            toast.error('Please fill in all fields');
            return false;
        }

        if (formData.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return false;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const response = await axios.post(`${AUTH_API_URL}/reset-password`, {
                token,
                newPassword: formData.newPassword
            });

            if (response.data.success) {
                toast.success('Password reset successful! You can now login with your new password.');

                if (isPopup) {
                    // Close popup and redirect
                    window.close();
                } else {
                    // Redirect to login
                    navigate('/');
                }
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to reset password. Please try again.';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isValidating) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>Validating reset link...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isValidToken) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.error}>
                        <h2>Invalid Reset Link</h2>
                        <p>The password reset link is invalid or has expired.</p>
                        <button
                            className={styles.backButton}
                            onClick={() => navigate('/')}
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1>Reset Your Password</h1>
                    <p>Enter your new password below</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="newPassword">New Password</label>
                        <div className={styles.passwordInput}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="newPassword"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleInputChange}
                                placeholder="Enter your new password"
                                required
                                minLength="8"
                            />
                            <button
                                type="button"
                                className={styles.passwordToggle}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <div className={styles.passwordInput}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="Confirm your new password"
                                required
                                minLength="8"
                            />
                            <button
                                type="button"
                                className={styles.passwordToggle}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p>Remember your password?</p>
                    <button
                        className={styles.loginButton}
                        onClick={() => navigate('/')}
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword; 