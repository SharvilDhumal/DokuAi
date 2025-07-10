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

    // Check if user is logged in on app start
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const savedUser = localStorage.getItem('user');

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
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
    };

    const updateUser = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
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