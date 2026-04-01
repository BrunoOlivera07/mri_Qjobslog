import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/guilds')
      .then(res => setGuilds(res.data))
      .catch(err => {
        if (err.response?.status === 401) navigate('/login');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <>
      <Navbar />
      <div className="page-container animate-fade">
        <h1 className="page-title">Seus Servidores</h1>
        <p className="page-subtitle">Selecione uma comunidade para gerenciar os webhooks de ponto.</p>

        {loading ? (
          <div style={{ color: 'var(--text-muted)' }}>Carregando servidores do Discord...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {guilds.map((g, i) => (
              <motion.div 
                key={g.id} 
                className="glass-panel"
                style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', cursor: g.botIsPresent ? 'pointer' : 'default', transition: 'all 0.2s', opacity: g.botIsPresent ? 1 : 0.6 }}
                whileHover={g.botIsPresent ? { y: -5, boxShadow: '0 8px 30px rgba(0,0,0,0.6)', borderColor: 'rgba(88, 101, 242, 0.4)' } : {}}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: g.botIsPresent ? 1 : 0.6, y: 0 }}
                transition={{ delay: i * 0.05, ease: 'easeOut' }}
                onClick={() => g.botIsPresent && navigate(`/dashboard/${g.id}`)}
              >
                <img 
                  src={g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                  alt={g.name}
                  style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--border-color)' }}
                />
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', fontWeight: 600 }}>{g.name}</h3>
                  {g.botIsPresent ? (
                    <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--success)', borderRadius: '50%', boxShadow: '0 0 8px var(--success)' }} />
                      Configurar Orgs
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--danger)', borderRadius: '50%' }} />
                      Bot Ausente
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
            
            {guilds.length === 0 && (
                <div style={{ color: 'var(--text-muted)' }}>Você não possui permissão administrativa em nenhum servidor ou ocorreu um erro de sincronização com o Discord.</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
