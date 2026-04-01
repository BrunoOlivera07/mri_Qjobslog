import React from 'react';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="navbar animate-fade">
      <div className="navbar-brand">
        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--primary)" width="28">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        PAINEL BATE-PONTO | by SnowDeve
      </div>
      <div className="user-profile" onClick={handleLogout} title="Sair">
        <span style={{ fontWeight: 500 }}>{user.username}</span>
        <img 
            src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
            alt="Avatar" 
        />
        <LogOut size={18} color="var(--text-muted)" style={{marginLeft: '8px'}} />
      </div>
    </nav>
  );
}
