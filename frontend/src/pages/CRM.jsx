import React from 'react';
import { 
  Users, Kanban as KanbanIcon, MagnifyingGlass, Plus, WhatsappLogo, CalendarBlank, Chats, CheckCircle, DotsThreeVertical, Tag, CurrencyDollar, TrendUp
} from 'phosphor-react';
import { format } from 'date-fns';
import Sidebar from '../components/Sidebar';
import { useWhatsapp } from '../contexts/WhatsappContext';

export default function CRM({ user, onLogout }) {
  const { chats } = useWhatsapp();

  return (
    <div className="flex h-screen w-full bg-bg-color overflow-hidden">
      <Sidebar user={user} onLogout={onLogout} active="crm" />
      
      <main className="flex-1 w-full flex flex-col overflow-hidden">
        {/* Modern Header */}
        <header className="px-10 py-10 flex justify-between items-end bg-bg-secondary/40 backdrop-blur-xl border-b border-surface-border">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-primary/20 rounded-2xl shadow-glow">
                <KanbanIcon size={36} className="text-primary" weight="duotone" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter">Fluxo de Oportunidades</h1>
            </div>
            <p className="text-text-muted text-sm px-1 font-medium tracking-wide">Converta conversas em faturamento real.</p>
          </div>
          
          <div className="flex gap-6 items-center">
            <div className="flex gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Pipe Value</span>
                  <span className="text-xl font-black text-success">R$ 145.200</span>
               </div>
               <div className="w-[1px] bg-white/10 h-full mx-2"></div>
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Conversion</span>
                  <span className="text-xl font-black text-primary">24.5%</span>
               </div>
            </div>
            <div className="relative group">
              <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
              <input type="text" className="input-glass pl-12 h-[52px] text-sm w-[280px] bg-black/40" placeholder="Buscar no CRM..." />
            </div>
            <button className="btn btn-primary h-[52px] px-8 rounded-2xl">
              <Plus size={20} weight="bold" />
              Novo Negócio
            </button>
          </div>
        </header>

        {/* Kanban Horizontal Container */}
        <div className="flex-1 p-10 flex gap-10 overflow-x-auto w-full items-start scrollbar-hide bg-gradient-to-b from-bg-secondary/20 to-transparent">
          
          {/* Column 1: NOVOS LEADS */}
          <section className="flex flex-col gap-6 min-w-[380px] w-[380px] h-full flex-shrink-0">
            <div className="flex justify-between items-center px-4 py-3 bg-primary/5 border border-primary/10 rounded-2xl">
              <h3 className="font-black text-[11px] text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-glow"></div> 
                Entrada (WPP)
              </h3>
              <span className="bg-primary/20 border border-primary/30 text-primary font-black text-[10px] px-3 py-1 rounded-lg">{chats.length}</span>
            </div>
            
            <div className="flex flex-col gap-4 overflow-y-auto h-full pr-2 custom-scroll pb-20">
              {chats.length === 0 ? (
                <div className="w-full p-12 border-2 border-dashed border-white/5 rounded-[2.5rem] text-center flex flex-col items-center gap-4 bg-white/[0.02]">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center opacity-30">
                    <WhatsappLogo size={32} />
                  </div>
                  <p className="text-xs text-text-muted font-bold tracking-wide leading-relaxed">Nenhum lead capturado<br/>nas últimas 24h.</p>
                </div>
              ) : (
                chats.map(chat => (
                  <div key={chat.id} className="glass-panel group p-6 rounded-[2rem] border-white/5 hover:border-primary/30 shadow-xl">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_var(--success)]"></div>
                        <span className="text-[10px] text-success font-black uppercase tracking-widest">New Lead</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted font-black px-2 py-1 bg-white/5 rounded-lg">
                        <CalendarBlank size={12} weight="bold" />
                        {chat.timestamp ? format(new Date(chat.timestamp * 1000), 'HH:mm') : 'Hj'}
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="font-extrabold text-lg text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors tracking-tight">{chat.name}</h4>
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5 shadow-inner">
                        <p className="text-xs text-text-muted leading-relaxed line-clamp-2 italic font-medium">"{chat.lastMessage}"</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <div className="flex -space-x-3">
                         {chat.profilePicUrl ? (
                           <img src={chat.profilePicUrl} className="w-9 h-9 rounded-xl border-2 border-bg-secondary object-cover shadow-md" alt="" />
                         ) : (
                           <div className="w-9 h-9 rounded-xl bg-surface-border flex items-center justify-center text-[10px] font-black text-text-muted border-2 border-bg-secondary">👤</div>
                         )}
                         <div className="w-9 h-9 rounded-xl bg-bg-secondary flex items-center justify-center text-[10px] font-black text-primary border-2 border-white/10 shadow-md">+</div>
                      </div>
                      <button className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary hover:text-white px-5 py-2.5 rounded-xl transition-all border border-primary/20 shadow-sm">
                        Assumir Lead
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Column 2: EM NEGOCIAÇÃO */}
          <section className="flex flex-col gap-6 min-w-[380px] w-[380px] h-full flex-shrink-0">
            <div className="flex justify-between items-center px-4 py-3 bg-warning/5 border border-warning/10 rounded-2xl">
              <h3 className="font-black text-[11px] text-warning uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-warning shadow-[0_0_15px_var(--warning)]"></div> 
                Em Negociação
              </h3>
              <span className="bg-warning/20 border border-warning/30 text-warning font-black text-[10px] px-3 py-1 rounded-lg">1</span>
            </div>
            
             <div className="glass-panel p-8 rounded-[2rem] border-white/5 hover:border-warning/30 relative flex flex-col gap-6 group">
              <div className="absolute top-4 right-4 text-text-muted hover:text-white cursor-pointer p-2 transition-colors">
                <DotsThreeVertical size={24} weight="bold" />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 rounded-xl border border-warning/20">
                  <Tag size={12} className="text-warning" weight="fill" />
                  <span className="text-[10px] text-warning font-black uppercase tracking-widest">Apresentação</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-black text-text-muted">
                  <TrendUp size={14} className="text-success" />
                  Hot
                </div>
              </div>

              <div>
                <h4 className="font-black text-xl text-white mb-2 group-hover:text-warning transition-colors tracking-tight">Distribuidora LTDA</h4>
                <p className="text-xs text-text-muted leading-relaxed font-medium">Apresentação do ecossistema MultiAtendimento.ai integrada ao ERP legado.</p>
              </div>

              <div className="bg-black/40 rounded-3xl p-5 border border-white/5 shadow-inner flex justify-between items-center">
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-1.5">
                    <CurrencyDollar size={14} className="text-success" weight="bold" />
                    <span className="text-[10px] text-text-muted uppercase font-black tracking-widest">Previsão</span>
                   </div>
                   <span className="text-2xl font-black text-white">R$ 12.000</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-sm font-black text-white shadow-[0_10px_20px_rgba(217,70,239,0.3)]">JR</div>
              </div>
            </div>
          </section>

          {/* Column 3: FECHADO */}
          <section className="flex flex-col gap-6 min-w-[380px] w-[380px] h-full flex-shrink-0">
             <div className="flex justify-between items-center px-4 py-3 bg-success/5 border border-success/10 rounded-2xl">
              <h3 className="font-black text-[11px] text-success uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_15px_var(--success)]"></div> 
                Fechado / Ganho
              </h3>
              <span className="bg-success/20 border border-success/30 text-success font-black text-[10px] px-3 py-1 rounded-lg">0</span>
            </div>

            <div className="w-full h-[260px] border-2 border-dashed border-white/5 rounded-[3rem] text-center flex flex-col justify-center items-center gap-6 bg-white/[0.01] opacity-60 hover:opacity-100 transition-all group">
              <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/5 shadow-inner group-hover:border-success/30 group-hover:bg-success/10 transition-all">
                <CheckCircle size={44} className="text-text-muted group-hover:text-success" weight="duotone" />
              </div>
              <p className="text-xs font-bold text-text-muted leading-relaxed px-14 tracking-wide text-center uppercase">Arraste aqui para<br/>concretizar o faturamento</p>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
