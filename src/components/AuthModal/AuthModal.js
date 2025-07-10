import React, { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import styles from './AuthModal.module.css';
import { AUTH_API_URL } from '../../env-config';

const AuthModal = ({ isOpen, onClose, onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        if (!formData.email || !formData.password) {
            toast.error('Please fill in all required fields');
            return false;
        }

        if (!isLogin && !formData.name) {
            toast.error('Please enter your name');
            return false;
        }

        if (!isLogin && formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return false;
        }

        if (formData.password.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const endpoint = isLogin ? '/login' : '/register';
            const payload = isLogin
                ? { email: formData.email, password: formData.password }
                : { name: formData.name, email: formData.email, password: formData.password };

            const response = await axios.post(`${AUTH_API_URL}${endpoint}`, payload);

            if (response.data.success) {
                if (isLogin) {
                    // Store token and user data
                    localStorage.setItem('authToken', response.data.token);
                    localStorage.setItem('user', JSON.stringify(response.data.user));

                    toast.success('Login successful!');
                    onLoginSuccess(response.data.user);
                    onClose();
                } else {
                    toast.success('Registration successful! Please check your email to verify your account.');
                    setIsLogin(true);
                    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                }
            }
        } catch (error) {
            const message = error.response?.data?.message || 'An error occurred. Please try again.';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!formData.email) {
            toast.error('Please enter your email address');
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post(`${AUTH_API_URL}/forgot-password`, {
                email: formData.email
            });

            if (response.data.success) {
                toast.success('If this email exists in our system, you\'ll receive a reset link');
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to send reset email';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    ×
                </button>

                <div className={styles.modalHeader}>
                    <h2>{isLogin ? 'Login' : 'Register'}</h2>
                    <p>{isLogin ? 'Welcome back to DokuAI' : 'Create your DokuAI account'}</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {!isLogin && (
                        <div className={styles.inputGroup}>
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>
                    )}

                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <div className={styles.passwordInput}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Enter your password"
                                required
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

                    {!isLogin && (
                        <div className={styles.inputGroup}>
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="Confirm your password"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
                    </button>
                </form>

                {isLogin && (
                    <button
                        type="button"
                        className={styles.forgotPasswordButton}
                        onClick={handleForgotPassword}
                        disabled={isLoading}
                    >
                        Forgot Password?
                    </button>
                )}

                <div className={styles.switchMode}>
                    <p>
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            type="button"
                            className={styles.switchButton}
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                            }}
                        >
                            {isLogin ? 'Register' : 'Login'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthModal; 