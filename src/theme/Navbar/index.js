import React, { useState, useCallback } from 'react';
import Navbar from '@theme-original/Navbar';
import { useAuth } from '../../context/AuthContext';
import AuthModal from '../../components/AuthModal/AuthModal';

export default function NavbarWrapper(props) {
    const { user, isAuthenticated, isLoading, logout } = useAuth();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const handleLoginClick = useCallback(() => setIsAuthModalOpen(true), []);
    const handleCloseModal = useCallback(() => setIsAuthModalOpen(false), []);

    if (isLoading) return <Navbar {...props} />;

    return (
        <>
            <Navbar {...props} />
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                height: 56,
                display: 'flex',
                alignItems: 'center',
                zIndex: 2000,
                paddingRight: 24,
            }}>
                {isAuthenticated ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: '#4f8cff', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18
                        }}>
                            {user?.name ? user.name[0].toUpperCase() : 'U'}
                        </div>
                        <button
                            onClick={logout}
                            style={{
                                background: 'transparent', color: '#fff', border: 'none', borderRadius: '4px',
                                padding: '0.25rem 0.75rem', cursor: 'pointer', fontWeight: 500
                            }}
                            aria-label="Logout"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <button
                        style={{
                            background: '#4f8cff', color: '#fff', border: 'none', borderRadius: '999px',
                            padding: '0.5rem 1.5rem', marginLeft: '0.5rem', cursor: 'pointer', fontWeight: 600,
                            boxShadow: '0 2px 8px rgba(79,140,255,0.15)'
                        }}
                        onClick={handleLoginClick}
                        aria-label="Login"
                    >
                        Login
                    </button>
                )}
                <AuthModal
                    isOpen={isAuthModalOpen}
                    onClose={handleCloseModal}
                    onLoginSuccess={handleCloseModal}
                />
            </div>
        </>
    );
} 