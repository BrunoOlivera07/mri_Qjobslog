import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

export default function Callback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    if (code) {
      api.post('/auth/callback', { code })
        .then(response => {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          navigate('/dashboard');
        })
        .catch(err => {
          console.error(err);
          navigate('/login');
        });
    } else {
      navigate('/login');
    }
  }, [location, navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '20px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <h2 className="animate-fade" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Autenticando com Discord...</h2>
        <style>{`
            @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
    </div>
  );
}
