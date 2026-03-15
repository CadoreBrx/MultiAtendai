import React, { useState } from 'react';
import { 
  Plus, Trash, Chats, Robot, UserGear, FlowArrow, Info, CheckCircle, Gear
} from 'phosphor-react';
import Sidebar from '../components/Sidebar';

export default function Departaments({ user, onLogout }) {
  const [departaments, setDepartaments] = useState([
    { id: 1, name: 'Suporte Técnico', agents: ['JR', 'MA'], color: 'var(--primary)', description: 'Atendimento para dúvidas técnicas e bugs.' },
    { id: 2, name: 'Comercial / Vendas', agents: ['CB', 'AL'], color: 'var(--secondary)', description: 'Novas vendas, planos e orçamentos.' }
  ]);

  return (
    <div className="flex h-screen w-full bg-bg-color overflow-hidden">
      <Sidebar user={user} onLogout={onLogout} active="departaments" />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header Section */}
        <header className="px-10 py-8 flex justify-between items-center bg-bg-secondary/40 backdrop-blur-xl border-b border-surface-border z-20">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-secondary/20 rounded-2xl shadow-[0_0_20px_rgba(217,70,239,0.2)]">
                <Robot size={36} className="text-secondary" weight="duotone" />
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter">Setores & Automatação</h1>
            </div>
            <p className="text-text-muted text-sm px-1 font-medium italic opacity-80">Configure como o MultiAtendimento.ai deve distribuir seus leads.</p>
          </div>
          <button className="btn btn-secondary shadow-lg">
            <Plus size={20} weight="bold" />
            Criar Novo Departamento
          </button>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 p-10 overflow-y-auto custom-scroll">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-start max-w-[1600px] mx-auto">
            
            {/* Left Column: Department List */}
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between border-b border-surface-border pb-4">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <FlowArrow size={26} className="text-secondary" />
                  Fluxo de Filtro Atual
                </h3>
                <span className="text-[10px] bg-white/5 border border-white/10 px-3 py-1 rounded-full font-bold uppercase text-text-muted">Ativos: {departaments.length}</span>
              </div>
              
              <div className="grid gap-6">
                {departaments.map(dept => (
                  <div key={dept.id} className="glass-panel group relative p-8 rounded-[2rem] border-white/5 transition-all overflow-visible">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl flex items-center justify-center font-black text-2xl shadow-inner relative overflow-hidden" 
                             style={{ backgroundColor: dept.color + '15', color: dept.color, border: `1px solid ${dept.color}30` }}>
                          <span className="relative z-10">{dept.id}</span>
                          <div className="absolute inset-0 bg-white/5 group-hover:bg-transparent transition-colors"></div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <h4 className="font-bold text-xl text-white group-hover:text-secondary transition-colors">{dept.name}</h4>
                          <p className="text-xs text-text-muted font-medium pr-4">{dept.description}</p>
                          <div className="flex gap-2.5 mt-3 flex-wrap">
                            {dept.agents.map(agent => (
                              <div key={agent} className="flex items-center gap-1.5 bg-bg-color/80 px-3 py-1.5 rounded-xl border border-white/10 shadow-sm">
                                <div className="w-2 h-2 rounded-full bg-success"></div>
                                <span className="text-[10px] font-black uppercase text-text-main">{agent}</span>
                              </div>
                            ))}
                            <button className="w-10 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-text-muted transition-all">
                              <Plus size={14} weight="bold" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-row md:flex-col gap-2 justify-end">
                        <button className="btn-ghost px-5 py-3 rounded-2xl text-xs font-bold border-white/10 hover:bg-secondary/10 hover:text-secondary hover:border-secondary/20 transition-all">Configurar</button>
                        <button className="p-3 bg-danger/5 hover:bg-danger/20 text-danger/60 hover:text-danger rounded-2xl transition-all border border-danger/10">
                          <Trash size={22} weight="fill" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Bot Logic Config */}
            <div className="flex flex-col gap-8">
               <div className="flex items-center justify-between border-b border-surface-border pb-4">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <Chats size={26} className="text-primary" />
                  Experiência do Lead
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_10px_var(--success)]"></div>
                  <span className="text-[10px] font-bold text-success uppercase">Motor IA Ativo</span>
                </div>
              </div>

              <div className="glass-panel p-10 rounded-[2.5rem] border-white/10 shadow-2xl relative overflow-hidden group">
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Robot size={150} weight="fill" />
                </div>

                <div className="flex flex-col gap-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-text-muted uppercase tracking-[0.2em] ml-1 flex items-center gap-3">
                      <div className="w-6 h-6 bg-white/5 rounded-lg flex items-center justify-center border border-white/10"><Info size={14} /></div>
                      Saudação Inicial & Menu
                    </label>
                    <button className="text-[10px] font-bold text-primary hover:underline">Resetar para Padrão</button>
                  </div>
                  
                  <div className="relative">
                    <textarea 
                      className="input-glass min-h-[300px] text-sm leading-[1.8] bg-black/40 resize-none py-6 border-white/5 focus:border-primary/40 focus:bg-black/60 shadow-inner"
                      placeholder="Olá! ..."
                      defaultValue={`Olá! Bem-vindo à nossa central de inteligência. ⚡\n\nPor favor, escolha uma das opções abaixo para que nosso cérebro digital conecte você ao humano responsável:\n\n1️⃣ Suporte Técnico & bugs\n2️⃣ Comercial / Vendas & Planos\n\nEstamos aguardando sua interação!`}
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] text-text-dim font-bold uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-lg border border-white/5">
                      <Gear size={12} className="animate-spin" /> Live Edit
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 p-5 bg-primary/10 rounded-3xl border border-primary/20 shadow-[0_5px_20px_-10px_var(--primary-glow)]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shadow-inner">
                        <CheckCircle size={28} className="text-primary" weight="fill" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-bold text-white tracking-tight">Setores Mapeados com Sucesso</span>
                        <span className="text-xs text-text-muted font-medium">As teclas 1 e 2 estão prontas para disparar gatilhos.</span>
                      </div>
                    </div>
                  </div>

                  <button className="btn btn-primary w-full py-5 rounded-[1.5rem] text-lg shadow-glow hover:scale-[1.01] transform active:scale-95 transition-all">
                    Publicar Alterações no Robô
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
