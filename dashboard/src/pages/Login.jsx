import React from 'react';
import { motion } from 'framer-motion';

export default function Login() {
  const handleLogin = () => {
    window.location.href = 'http://localhost:3001/api/auth/login';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100%' }}>
      <motion.div 
        className="glass-panel" 
        style={{ padding: '50px 40px', textAlign: 'center', maxWidth: '420px', width: '100%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ marginBottom: '40px' }}>
             <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--primary)" width="72" style={{ marginBottom: '16px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
             </svg>
             <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>PAINEL BATE-PONTO <br /> by SnowDeve</h1>
             <p style={{ color: 'var(--text-muted)', marginTop: '12px', fontSize: '15px', lineHeight: '1.5' }}>
                Administre webhooks, canais e logs de todas as suas cidades em um único local.
             </p>
        </div>
        
        <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleLogin}>
          Entrar via Discord
        </button>
      </motion.div>
    </div>
  );
}
