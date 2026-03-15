import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { 
  ChatCircleText, Users, Gear, SignOut, 
  PaperPlaneRight, QrCode, CheckCircle, WarningCircle, Paperclip, WhatsappLogo, MagnifyingGlass, House, Info, Chats
} from 'phosphor-react';
import { format } from 'date-fns';
import Sidebar from '../components/Sidebar';
import { useWhatsapp } from '../contexts/WhatsappContext';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';

export default function Dashboard({ user, onLogout }) {
  const { chats, setChats, activeChat, setActiveChat } = useWhatsapp();
  const [messageInput, setMessageInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat, chats]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageInput.trim() && !selectedFile) || !activeChat) return;

    const formData = new FormData();
    formData.append('number', activeChat.id.split('@')[0]);
    formData.append('message', messageInput);
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      await fetch('http://206.183.129.197:3000/api/send-message', {
        method: 'POST',
        body: formData,
      });
      setSelectedFile(null);
      setMessageInput('');
    } catch (error) {
      console.error('Falha ao enviar', error);
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.id.includes(searchTerm)
  );

  return (
    <div className="flex h-screen w-full bg-bg-color overflow-hidden">
      <Sidebar user={user} onLogout={onLogout} active="dashboard" />

      {/* Modern Conversation Hub */}
      <aside className="w-[380px] bg-bg-secondary border-r border-white/5 flex flex-col z-10">
        <div className="p-8 border-b border-white/5 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-white tracking-tighter">Atendimentos</h2>
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">{chats.length}</div>
          </div>
          <div className="relative group p-input-icon-left w-full mt-2">
            <i className="pi pi-search text-text-dim group-focus-within:text-primary transition-colors ml-4" />
            <InputText 
              placeholder="Pesquisar leads..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[46px] bg-black/30 border-white/5 text-sm pl-11 rounded-xl"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll">
          {filteredChats.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-4 opacity-30">
              <ChatCircleText size={48} weight="thin" />
              <p className="text-xs font-bold uppercase tracking-widest">Silêncio no hub</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <div 
                key={chat.id} 
                onClick={() => setActiveChat(chat)}
                className={`group px-6 py-5 border-b border-white/5 cursor-pointer transition-all flex items-center gap-4 relative ${
                  activeChat?.id === chat.id 
                    ? 'bg-primary/5 border-l-4 border-l-primary' 
                    : 'border-l-4 border-l-transparent hover:bg-white/[0.02]'
                }`}
              >
                <div className="relative flex-shrink-0">
                  {chat.profilePicUrl ? (
                    <img src={chat.profilePicUrl} className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-lg group-hover:scale-110 transition-transform" alt="" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-surface-border flex items-center justify-center text-2xl border border-white/10 group-hover:scale-110 transition-transform">👤</div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-bg-secondary shadow-sm"></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-sm text-white truncate tracking-tight">{chat.name}</h4>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-tighter">
                      {chat.timestamp ? format(new Date(chat.timestamp * 1000), 'HH:mm') : ''}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted truncate font-medium italic opacity-70 group-hover:opacity-100 transition-opacity">
                    {chat.lastMessage}
                  </p>
                </div>
                
                {activeChat?.id === chat.id && (
                  <div className="absolute right-2 w-1.5 h-1.5 bg-primary rounded-full shadow-glow"></div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Cinematic Main Chat Area */}
      <main className="flex-1 flex flex-col relative z-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.03),transparent)]">
        {activeChat ? (
          <>
            {/* High-End Header */}
            <header className="h-[80px] border-b border-white/5 bg-bg-secondary/60 backdrop-blur-2xl flex items-center px-8 justify-between absolute top-0 w-full z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {activeChat.profilePicUrl ? (
                    <img src={activeChat.profilePicUrl} className="w-11 h-11 rounded-2xl object-cover border border-primary/20 shadow-glow" alt="" />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-surface-border flex items-center justify-center text-xl border border-white/10">👤</div>
                  )}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border border-bg-secondary animate-pulse"></div>
                </div>
                <div>
                  <h3 className="font-black text-lg text-white tracking-tight">{activeChat.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-success bg-success/10 px-2 py-0.5 rounded border border-success/20 tracking-widest">Conectado</span>
                    <span className="text-[9px] font-bold text-text-muted">Direct Channel</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                   <div className="w-8 h-8 rounded-full border-2 border-bg-secondary bg-primary/20 flex items-center justify-center text-[8px] font-black text-white">OP</div>
                   <div className="w-8 h-8 rounded-full border-2 border-bg-secondary bg-secondary/20 flex items-center justify-center text-[8px] font-black text-white">AI</div>
                </div>
                <Button 
                  label="Gerenciar Ticket" 
                  className="p-button-sm p-button-outlined rounded-xl font-bold h-10 px-4 border-indigo-500 text-indigo-400 hover:bg-indigo-500/10"
                />
              </div>
            </header>

            {/* Content: Messages with Cinematic Styling */}
            <div className="flex-1 overflow-y-auto p-8 pt-[100px] pb-[100px] flex flex-col gap-6 custom-scroll">
              {activeChat.messages.map((msg, index) => {
                const isMe = msg.from === 'me' || msg.fromMe;
                return (
                  <div key={index} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[65%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`p-5 rounded-[2rem] text-sm shadow-xl relative overflow-hidden group ${
                        isMe 
                          ? 'bg-gradient-to-br from-primary via-primary-hover to-primary text-white rounded-tr-sm shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]' 
                          : 'bg-surface border border-white/5 text-text-main rounded-tl-sm'
                      }`}>
                        {/* Mesh background for sent messages */}
                        {isMe && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>}
                        
                        {msg.hasMedia && msg.mediaData && (
                          <div className="mb-3 rounded-[1.5rem] overflow-hidden border border-white/10 shadow-inner bg-black/20">
                            {msg.mediaData.mimetype.startsWith('image/') ? (
                              <img 
                                src={`data:${msg.mediaData.mimetype};base64,${msg.mediaData.data}`} 
                                alt="Mídia" 
                                className="w-full max-h-[400px] object-cover cursor-pointer hover:scale-110 transition-transform duration-700" 
                              />
                            ) : msg.mediaData.mimetype.startsWith('video/') ? (
                              <video controls className="w-full max-h-[400px]">
                                <source src={`data:${msg.mediaData.mimetype};base64,${msg.mediaData.data}`} type={msg.mediaData.mimetype} />
                              </video>
                            ) : msg.mediaData.mimetype.startsWith('audio/') ? (
                              <div className="p-4 bg-black/40">
                                <audio controls className="w-full h-8 opacity-80 contrast-125">
                                  <source src={`data:${msg.mediaData.mimetype};base64,${msg.mediaData.data}`} type={msg.mediaData.mimetype} />
                                </audio>
                              </div>
                            ) : (
                              <div className="p-4 bg-white/5 flex items-center gap-4">
                                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20">
                                  <Paperclip size={20} className="text-primary" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-white truncate max-w-[200px]">{msg.mediaData.filename || 'Documento Base64'}</span>
                                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Size optimized</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {msg.body && <p className="leading-relaxed text-[15px] font-medium tracking-tight whitespace-pre-wrap">{msg.body}</p>}
                        
                        <div className={`mt-2 text-[9px] font-black opacity-50 flex items-center gap-1 uppercase tracking-widest ${isMe ? 'text-white' : 'text-text-muted'}`}>
                          {msg.timestamp ? format(new Date(msg.timestamp * 1000), 'HH:mm') : 'now'}
                          {isMe && <CheckCircle size={10} weight="fill" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Advanced Input Terminal */}
            <div className="absolute bottom-6 left-8 right-8 z-10">
              <div className="glass-panel p-3 rounded-[2rem] border-white/10 shadow-2xl bg-bg-secondary/80 backdrop-blur-3xl">
                {selectedFile && (
                  <div className="flex items-center gap-3 px-5 py-3 bg-primary/10 border border-primary/20 rounded-2xl mb-2 animate-fade-in">
                    <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center">
                      <Paperclip size={18} className="text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-primary font-black uppercase tracking-widest leading-none mb-1">Upload Stage</span>
                      <span className="text-xs text-white font-bold truncate max-w-[300px]">{selectedFile.name}</span>
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="ml-auto w-8 h-8 flex items-center justify-center bg-danger/10 hover:bg-danger/20 text-danger rounded-xl transition-all">
                      <Trash size={16} weight="fill" />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all border ${
                      selectedFile 
                        ? 'bg-primary border-primary shadow-glow text-white' 
                        : 'bg-white/5 border-white/5 text-text-muted hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Paperclip size={24} weight="bold" />
                  </button>
                  
                  <form onSubmit={handleSendMessage} className="flex-1 flex gap-3 h-14">
                    <input 
                      type="text" 
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={selectedFile ? "Legenda inteligente para o arquivo..." : "Envie uma mensagem via MultiAtendimento.ai..."}
                      className="input-glass border-none bg-white/5 h-full rounded-2xl px-6 text-sm font-medium focus:bg-white/10"
                    />
                    <button type="submit" className="w-14 h-14 bg-gradient-to-br from-primary to-primary-hover rounded-2xl flex items-center justify-center text-white shadow-glow hover:scale-105 transform active:scale-95 transition-all">
                      <PaperPlaneRight size={26} weight="fill" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-text-muted animate-fade-in relative">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
               <WhatsappLogo size={800} weight="fill" />
            </div>
            
            <div className="glass-panel p-16 rounded-[4rem] flex flex-col items-center gap-8 border-white/5 shadow-2xl max-w-lg text-center relative overflow-visible">
               <div className="absolute -top-12 w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-3xl shadow-[0_0_50px_var(--primary-glow)] flex items-center justify-center animate-bounce duration-[4s]">
                  <Chats size={48} color="#fff" weight="fill" />
               </div>
               
               <div className="space-y-3 pt-6">
                 <h2 className="text-3xl font-black text-white tracking-tighter">Central de Comando</h2>
                 <p className="text-sm font-medium leading-relaxed px-4">Conecte-se aos seus clientes através da interface MultiAtendimento v1.2. Ative as sessões no menu ao lado para começar.</p>
               </div>
               
               <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black uppercase text-text-muted tracking-widest">SLA Ativo</span>
                    <span className="text-xs font-bold text-success">99.9% Up</span>
                  </div>
                  <div className="w-[1px] h-8 bg-white/10"></div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black uppercase text-text-muted tracking-widest">Criptografia</span>
                    <span className="text-xs font-bold text-primary">AES-256</span>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
