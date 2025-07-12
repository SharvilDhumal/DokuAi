import React, { useEffect, useState } from 'react';

export default function VerifyEmail() {
    const [status, setStatus] = useState('Verifying...');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
            setStatus('Invalid verification link.');
            return;
        }

        fetch('http://localhost:5001/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setStatus('Email verified! Redirecting to login...');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    setStatus(data.message || 'Verification failed.');
                }
            })
            .catch(() => setStatus('Verification failed. Please try again later.'));
    }, []);

    return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1>Email Verification</h1>
            <p>{status}</p>
        </div>
    );
} 