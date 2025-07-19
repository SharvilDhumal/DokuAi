import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AUTH_API_URL } from '../env-config';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // DEBUG: Force loading to false after 2 seconds
    useEffect(() => {
        setTimeout(() => setIsLoading(false), 2000);
    }, []);

    // Check if user is logged in on app start
    useEffect(() => {
        const token = sessionStorage.getItem('authToken');
        const savedUser = sessionStorage.getItem('user');

        if (token && savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                setUser(userData);
                setIsAuthenticated(true);

                // Verify token with backend
                verifyToken(token);
            } catch (error) {
                console.error('Error parsing saved user data:', error);
                logout();
            }
        } else {
            setIsLoading(false);
        }
    }, []);

    // Update last_active timestamp periodically for logged-in users
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        // Function to ping the auth server to update last_active
        const updateActivity = async () => {
            try {
                const token = sessionStorage.getItem('authToken');
                if (!token) return;

                // Add a random delay between 0-1000ms to avoid all tabs pinging at once
                const randomDelay = Math.floor(Math.random() * 1000);
                await new Promise(resolve => setTimeout(resolve, randomDelay));

                await axios.post(`${AUTH_API_URL}/ping`, null, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                console.log('Activity status updated');
            } catch (error) {
                // Only log detailed errors in development
                if (process.env.NODE_ENV === 'development') {
                    console.error('Failed to update activity status:', error);
                }
            }
        };

        // Update immediately on login
        updateActivity();

        // Then update every 5 minutes (reduced frequency to avoid rate limiting)
        const interval = setInterval(updateActivity, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [isAuthenticated, user]);

    const verifyToken = async (token) => {
        try {
            const response = await axios.get(`${AUTH_API_URL}/verify-token`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                setUser(response.data.user);
                setIsAuthenticated(true);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            logout();
        } finally {
            setIsLoading(false);
        }
    };

    const login = (token, userData) => {
        sessionStorage.setItem('authToken', token);
        sessionStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
        // Redirect to home page after successful login
        window.location.href = '/';
    };

    const logout = () => {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
        // Redirect to home page after logout
        window.location.href = '/';
    };

    const updateUser = (userData) => {
        setUser(userData);
        sessionStorage.setItem('user', JSON.stringify(userData));
    };

    const value = {
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 