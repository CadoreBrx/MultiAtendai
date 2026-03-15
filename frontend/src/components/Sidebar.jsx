import React from 'react';
import { 
  ChatCircleText, Users, Kanban, WhatsappLogo, SignOut, FlowArrow, House
} from 'phosphor-react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ user, onLogout, active }) {
  const location = useLocation();
  
  const getActiveClass = (item) => {
    const isActive = active === item;
    return isActive 
      ? "relative p-3.5 bg-primary/15 rounded-2xl text-primary shadow-[0_0_20px_rgba(99,102,241,0.2)] border border-primary/20 transition-all scale-110" 
      : "p-3.5 hover:bg-white/5 rounded-2xl text-text-muted hover:text-white transition-all hover:scale-105 active:scale-95";
  };

  return (
    <nav className="w-[100px] h-full bg-bg-secondary border-r border-white/5 flex flex-col items-center py-10 justify-between z-50">
      <div className="flex flex-col items-center gap-12 w-full">
        {/* Animated Brand Pulse */}
        <Link to="/" className="relative group">
          <div className="absolute inset-0 bg-primary/40 blur-2xl rounded-full animate-pulse group-hover:bg-primary/60 transition-all"></div>
          <div className="relative w-14 h-14 bg-gradient-to-br from-primary to-primary-hover rounded-2xl flex items-center justify-center shadow-glow cursor-pointer transform transition-transform group-hover:rotate-12">
            <ChatCircleText size={30} color="#fff" weight="fill" />
          </div>
        </Link>

        {/* Navigation Icons */}
        <div className="flex flex-col gap-8 w-full items-center">
          <Link to="/" className={getActiveClass('dashboard')} title="Atendimento">
            <House size={30} weight={active === 'dashboard' ? "fill" : "bold"} />
            {active === 'dashboard' && <div className="absolute -left-10 w-1.5 h-6 bg-primary rounded-r-full shadow-glow"></div>}
          </Link>
          
          <Link to="/instances" className={getActiveClass('instances')} title="Conexões">
            <WhatsappLogo size={30} weight={active === 'instances' ? "fill" : "bold"} />
            {active === 'instances' && <div className="absolute -left-10 w-1.5 h-6 bg-primary rounded-r-full shadow-glow"></div>}
          </Link>
          
          <Link to="/departaments" className={getActiveClass('departaments')} title="Bot & Setores">
            <FlowArrow size={30} weight={active === 'departaments' ? "fill" : "bold"} />
            {active === 'departaments' && <div className="absolute -left-10 w-1.5 h-6 bg-primary rounded-r-full shadow-glow"></div>}
          </Link>
          
          <Link to="/crm" className={getActiveClass('crm')} title="CRM Kanban">
            <Kanban size={30} weight={active === 'crm' ? "fill" : "bold"} />
            {active === 'crm' && <div className="absolute -left-10 w-1.5 h-6 bg-primary rounded-r-full shadow-glow"></div>}
          </Link>
          
          <Link to="/users" className={getActiveClass('users')} title="Sua Equipe">
            <Users size={30} weight={active === 'users' ? "fill" : "bold"} />
            {active === 'users' && <div className="absolute -left-10 w-1.5 h-6 bg-primary rounded-r-full shadow-glow"></div>}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6 items-center w-full">
        <div className="relative group cursor-pointer">
          <div className="absolute inset-0 bg-secondary/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-secondary/20 to-primary/20 p-[1px] border border-white/10 group-hover:border-primary/40 transition-all">
            <div className="bg-bg-secondary w-full h-full rounded-2xl flex items-center justify-center text-xs font-black text-white tracking-widest">
              {user?.substring(0,2).toUpperCase() || 'AT'}
            </div>
          </div>
        </div>

        <button 
          onClick={onLogout} 
          title="Sair do Sistema" 
          className="p-4 text-text-dim hover:text-danger hover:bg-danger/10 rounded-2xl transition-all hover:rotate-12 active:scale-75"
        >
          <SignOut size={28} weight="bold" />
        </button>
      </div>
    </nav>
  );
}
