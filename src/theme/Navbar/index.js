import React, { useEffect } from 'react';
import Navbar from '@theme-original/Navbar';
import { useAuth } from '../../context/AuthContext';

export default function NavbarWrapper(props) {
    const { user, logout } = useAuth();

    useEffect(() => {
        // Wait for navbar to render, then inject the button
        const interval = setInterval(() => {
            const rightSection = document.querySelector('.navbar__items--right');
            if (rightSection && !rightSection.querySelector('.custom-auth-btn')) {
                const btn = document.createElement('button');
                btn.className = 'custom-auth-btn';
                btn.style.background = 'none';
                btn.style.border = 'none';
                btn.style.color = '#2e8555';
                btn.style.cursor = 'pointer';
                btn.style.fontFamily = 'Poppins, Space Grotesk, sans-serif';
                btn.style.fontWeight = 600;
                btn.style.marginLeft = '1rem';
                btn.innerText = user ? 'Logout' : 'Login';
                btn.onclick = user
                    ? logout
                    : () => window.dispatchEvent(new Event('open-auth-modal'));
                rightSection.appendChild(btn);
            } else if (rightSection && rightSection.querySelector('.custom-auth-btn')) {
                // Update button text and handler if user state changes
                const btn = rightSection.querySelector('.custom-auth-btn');
                btn.innerText = user ? 'Logout' : 'Login';
                btn.onclick = user
                    ? logout
                    : () => window.dispatchEvent(new Event('open-auth-modal'));
            }
        }, 100);
        return () => clearInterval(interval);
    }, [user, logout]);

    return <Navbar {...props} />;
} 