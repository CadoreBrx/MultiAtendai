import React, { useState, useEffect } from 'react';
import { 
  WhatsappLogo, Plus, Trash, QrCode as QrCodeIcon, CheckCircle, WarningCircle, Info
} from 'phosphor-react';
import Sidebar from '../components/Sidebar';
import { QRCodeSVG } from 'qrcode.react';
import { socket } from '../services/socket';

export default function Instances({ user, onLogout }) {
  const [instances, setInstances] = useState([
    { id: 'suporte_principal', name: 'Suporte Principal', status: 'disconnected', number: 'Aguardando inicialização' }
  ]);

  useEffect(() => {
    fetchInstances();
    socket.connect();

    socket.on('whatsapp_qr', (payload) => {
      setInstances(prev => prev.map(inst => 
        inst.id === payload.clientId ? { ...inst, status: 'qr', qrData: payload.qr } : inst
      ));
    });

    socket.on('whatsapp_ready', (payload) => {
      setInstances(prev => prev.map(inst => 
        inst.id === payload.clientId ? { ...inst, status: 'connected', qrData: null, number: 'Número Conectado' } : inst
      ));
    });

    socket.on('whatsapp_authenticated', (payload) => {
      setInstances(prev => prev.map(inst => 
        inst.id === payload.clientId ? { ...inst, status: 'connected' } : inst
      ));
    });

    socket.on('whatsapp_auth_failure', (payload) => {
      setInstances(prev => prev.map(inst => 
        inst.id === payload.clientId ? { ...inst, status: 'disconnected', qrData: null } : inst
      ));
    });

    return () => {
      socket.off('whatsapp_qr');
      socket.off('whatsapp_ready');
      socket.off('whatsapp_authenticated');
      socket.off('whatsapp_auth_failure');
    };
  }, []);

  const fetchInstances = async () => {
    try {
      const res = await fetch('http://206.183.129.197:3000/api/instances');
      const data = await res.json();
      if (data && data.length > 0) {
        setInstances(data.map(d => ({
          id: d.id,
          name: d.id === 'suporte_principal' ? 'Suporte Principal' : d.id,
          status: d.status,
          number: d.number || 'Aguardando'
        })));
      }
    } catch (e) {
      console.error('Falha ao buscar instancias', e);
    }
  };

  const handleGenerateQR = async (id) => {
    setInstances(prev => prev.map(inst => 
      inst.id === id ? { ...inst, status: 'loading', number: 'Iniciando WhatsApp...' } : inst
    ));
    try {
      await fetch('http://206.183.129.197:3000/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.error('Erro ao gerar qr', e);
    }
  };

  return (
    <div className="flex h-screen w-full bg-bg-color">
      <Sidebar user={user} onLogout={onLogout} active="instances" />
      
      <main className="flex-1 p-8 overflow-y-auto w-full">
        <header className="flex justify-between items-center mb-10 border-b border-surface-border pb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-xl">
                <WhatsappLogo size={32} className="text-success" />
              </div>
              Conexões & Instâncias
            </h1>
            <p className="text-text-muted text-sm px-1">Gerencie seus números de WhatsApp e monitore o status em tempo real.</p>
          </div>
          <button className="btn btn-primary bg-gradient-to-r from-success to-primary border-none text-white shadow-glow">
            <Plus size={20} weight="bold" />
            Nova Instância
          </button>
        </header>

        <div className="flex flex-wrap gap-8 w-full">
          {instances.map(inst => (
            <div key={inst.id} className="glass-panel p-6 flex flex-col gap-6 w-[380px] hover:shadow-glow transition-all">
              <div className="flex justify-between items-start w-full">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${inst.status === 'connected' ? 'bg-success shadow-glow' : inst.status === 'qr' ? 'bg-primary animate-pulse shadow-glow' : 'bg-warning animate-pulse'}`}></div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${inst.status === 'connected' ? 'text-success' : inst.status === 'qr' ? 'text-primary' : 'text-warning'}`}>
                      {inst.status === 'connected' ? 'Online' : inst.status === 'qr' ? 'Aguardando QR' : 'Desconectado'}
                    </span>
                  </div>
                  <h3 className="font-bold text-xl text-white">{inst.name}</h3>
                </div>
                <button className="p-2 hover:bg-danger/10 text-text-muted hover:text-danger rounded-xl transition-colors">
                  <Trash size={22} />
                </button>
              </div>
              
              <div className="bg-bg-secondary/50 p-4 rounded-2xl border border-surface-border flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[10px] text-text-muted font-bold uppercase tracking-wider">
                  <Info size={14} /> Canal de Conexão
                </div>
                <p className="font-mono text-sm text-text-main truncate">{inst.number}</p>
              </div>

              {inst.status === 'disconnected' && (
                <button onClick={() => handleGenerateQR(inst.id)} className="btn btn-primary w-full shadow-none hover:shadow-glow py-4 rounded-2xl">
                  <QrCodeIcon size={24} />
                  Vincular WhatsApp
                </button>
              )}

              {inst.status === 'loading' && (
                <div className="w-full p-4 bg-bg-secondary border border-surface-border rounded-2xl flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-text-muted">Iniciando serviços...</span>
                </div>
              )}

              {inst.status === 'qr' && (
                <div className="flex flex-col items-center gap-4 animate-fade-in p-2 bg-qr-white rounded-3xl shadow-glow">
                  <div className="p-4 rounded-2xl">
                    <QRCodeSVG value={inst.qrData || ''} size={200} level="H" />
                  </div>
                  <div className="w-full bg-primary/10 border-t border-primary/20 p-4 flex flex-col items-center gap-1 rounded-b-2xl">
                    <p className="text-primary font-bold text-sm tracking-tight flex items-center gap-2">
                      <QrCodeIcon size={18} /> Escaneie no WhatsApp
                    </p>
                    <p className="text-[10px] text-primary/70 font-medium">Configurações &gt; Aparelhos Conectados</p>
                  </div>
                </div>
              )}

              {inst.status === 'connected' && (
                <div className="w-full p-4 bg-success/10 border border-success/30 text-success rounded-2xl flex justify-center items-center gap-3 font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <CheckCircle size={24} weight="fill" /> 
                  <span className="tracking-tight">Sessão Ativa</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
