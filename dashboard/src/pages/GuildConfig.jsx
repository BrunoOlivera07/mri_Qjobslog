import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, Image as ImageIcon, Upload } from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';

export default function GuildConfig() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ job_name: '', webhook: '', log_title: '', icon_url: '', icon_file: null, color: '', panel_channel_id: '', report_channel_id: '', send_panel: false });

  useEffect(() => {
    fetchConfigs();
  }, [guildId]);

  const fetchConfigs = () => {
    api.get(`/guilds/${guildId}/config`)
      .then(res => setConfigs(res.data))
      .catch(err => {
        if (err.response?.status === 403) navigate('/dashboard');
      })
      .finally(() => setLoading(false));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'icon_file' && formData[key]) {
          data.append('icon_file', formData[key]);
        } else if (key !== 'icon_file') {
          data.append(key, formData[key]);
        }
      });

      const res = await api.post(`/guilds/${guildId}/config`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setConfigs(res.data.configs);
      setShowForm(false);
      setFormData({ job_name: '', webhook: '', log_title: '', icon_url: '', icon_file: null, color: '', panel_channel_id: '', report_channel_id: '', send_panel: false });
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (jobName) => {
     if(!window.confirm(`Tem Certeza que deseja Apagar a configuração da org ${jobName.toUpperCase()}? Os usuários continuarão batendo ponto, mas nenhum webhook visual chegará mais.`)) return;
     try {
         await api.delete(`/guilds/${guildId}/config/${jobName}`);
         fetchConfigs();
     } catch (err) {
         alert('Erro ao excluir');
     }
  };

  const openEdit = (conf) => {
      setFormData({ ...conf, icon_file: null });
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <> <Navbar/> <div className="page-container" style={{color: 'var(--text-muted)'}}>Extraindo dados do Discord...</div></>;

  return (
    <>
      <Navbar />
      <div className="page-container animate-fade">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <button onClick={() => navigate('/dashboard')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-main)', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowLeft size={24} />
            </button>
            <h1 className="page-title" style={{ marginBottom: 0 }}>Cargos & Webhooks</h1>
        </div>
        <p className="page-subtitle" style={{ marginLeft: '54px' }}>Configure os canais de log de bate-ponto do seu servidor.</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', marginLeft: '54px' }}>
            <h3 style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{configs.length} organizações configuradas</h3>
            <button className="btn-primary" onClick={() => { setFormData({ job_name: '', webhook: '', log_title: '', icon_url: '', icon_file: null, color: '', panel_channel_id: '', report_channel_id: '', send_panel: false }); setShowForm(true); }}>
                <Plus size={18} /> Cadastrar Nova Org
            </button>
        </div>

        {showForm && (
            <motion.form 
                onSubmit={handleSave} 
                className="glass-panel" 
                style={{ padding: '30px', marginBottom: '32px', marginLeft: '54px', border: '1px solid var(--primary)' }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 2fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label className="label">Tag da Organização (job)</label>
                        <input className="input-field" required placeholder="ex: police ou hp" value={formData.job_name} onChange={e => setFormData({...formData, job_name: e.target.value})} disabled={configs.some(c => c.job_name === formData.job_name) && formData.job_name !== ''} />
                        <small style={{color:'var(--text-muted)', fontSize: '12px', marginTop: '6px', display: 'block'}}>Nome exato do script do jogo</small>
                    </div>
                    <div>
                        <label className="label">URL do Webhook de Relatórios Ponto</label>
                        <input className="input-field" required type="url" placeholder="https://discord.com/api/webhooks/..." value={formData.webhook} onChange={e => setFormData({...formData, webhook: e.target.value})} />
                    </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                        <label className="label">Título do Embed (Opcional)</label>
                        <input className="input-field" placeholder="DEPARTAMENTO DE POLÍCIA DE LOS SANTOS" value={formData.log_title || ''} onChange={e => setFormData({...formData, log_title: e.target.value})} />
                    </div>
                    <div>
                        <label className="label">Ícone do Bate-Ponto (Link ou Upload)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input className="input-field" type="url" placeholder="https://i.imgur.com/brasao.png" value={formData.icon_url || ''} onChange={e => setFormData({...formData, icon_url: e.target.value})} style={{ flex: 1 }} />
                            <input type="file" accept="image/*" onChange={e => setFormData({...formData, icon_file: e.target.files[0]})} style={{ display: 'none' }} id="icon_upload" />
                            <label htmlFor="icon_upload" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                <Upload size={16} style={{ marginRight: '6px' }} /> Upar Imagem
                            </label>
                        </div>
                        {formData.icon_file && <small style={{color:'var(--primary)', marginTop: '4px', display:'block'}}>Arquivo selecionado: {formData.icon_file.name}</small>}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
                    <div>
                        <label className="label">ID do Canal do Painel (Botões)</label>
                        <input className="input-field" type="text" placeholder="1023948192301X..." value={formData.panel_channel_id || ''} onChange={e => setFormData({...formData, panel_channel_id: e.target.value})} />
                        <small style={{color:'var(--text-muted)', fontSize: '12px', marginTop: '6px', display: 'block'}}>Se preenchido e marcado abaixo, instalará os botões nesta sala</small>
                    </div>
                    <div>
                        <label className="label">ID do Canal p/ Arquivo de Relatórios</label>
                        <input className="input-field" type="text" placeholder="1098888219..." value={formData.report_channel_id || ''} onChange={e => setFormData({...formData, report_channel_id: e.target.value})} />
                        <small style={{color:'var(--text-muted)', fontSize: '12px', marginTop: '6px', display: 'block'}}>Onde o arquivo excel irá cair após o comando /relatorio_org</small>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.95rem' }}>
                        <input type="checkbox" style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} checked={formData.send_panel || false} onChange={e => setFormData({...formData, send_panel: e.target.checked})} />
                        Instalar ou Reinstalar os botões no Canal do Painel IMEDIATAMENTE ao salvar
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <button type="button" className="btn-danger" onClick={() => setShowForm(false)}>Cancelar</button>
                    <button type="submit" className="btn-primary"><Save size={18}/> Salvar Definições</button>
                </div>
            </motion.form>
        )}

        <div style={{ marginLeft: '54px', display: 'grid', gap: '16px' }}>
            {configs.map(conf => (
                <div key={conf.job_name} className="glass-panel" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        {conf.icon_url ? (
                            <img src={conf.icon_url} alt="icon" style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                        ) : (
                            <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <ImageIcon size={24} />
                            </div>
                        )}
                        <div>
                            <h3 style={{ fontSize: '1.3rem', marginBottom: '6px', fontWeight: 600 }}>{conf.job_name.toUpperCase()}</h3>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{conf.log_title || `Título Padrão (Sistema de Ponto)`}</span>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.95rem', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} onClick={() => openEdit(conf)}>
                            Editar
                        </button>
                        <button className="btn-danger" style={{ padding: '10px 14px' }} onClick={() => handleDelete(conf.job_name)}>
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            ))}
            
            {configs.length === 0 && !showForm && (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '16px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" width="48" style={{ marginBottom: '16px', opacity: 0.5 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p style={{ fontSize: '1.1rem' }}>Você ainda não configurou nenhuma organização neste servidor.</p>
                    <p style={{ fontSize: '0.9rem', marginTop: '8px', opacity: 0.7 }}>Clique em "Cadastrar Nova Org" acima para começar.</p>
                </div>
            )}
        </div>

      </div>
    </>
  );
}
