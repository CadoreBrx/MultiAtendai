import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Divider } from 'primereact/divider';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if(email && password) {
      onLogin(email);
    }
  };

  return (
    <div className="flex align-items-center justify-content-center min-vh-100 bg-[#040406] overflow-hidden relative font-sans">
      {/* Prime Background Atmosphere */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
         <div className="absolute top-[-20%] left-[-10%] w-[60rem] h-[60rem] bg-indigo-900 rounded-full blur-[150px]"></div>
         <div className="absolute bottom-[-20%] right-[-10%] w-[50rem] h-[50rem] bg-purple-900 rounded-full blur-[150px]"></div>
      </div>

      <div className="z-10 w-full max-w-[28rem] p-4">
        <div className="text-center mb-6">
          <div className="inline-flex align-items-center justify-content-center bg-indigo-600 w-16 h-16 border-round-2xl shadow-4 mb-4">
            <i className="pi pi-whatsapp text-4xl text-white"></i>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">MultiAtendimento<span className="text-indigo-500">.ai</span></h1>
          <p className="text-text-muted text-sm font-medium">Gestão Profissional de Canais</p>
        </div>

        <div className="surface-card p-6 shadow-2 border-round-3xl border-1 border-white/5 bg-[#0d0d12]/80 backdrop-blur-xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white">Login</h2>
            <p className="text-text-muted text-xs mt-1">Insira suas credenciais para acessar o painel</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-xs font-bold text-white/70 ml-1">E-mail Corporativo</label>
              <span className="p-input-icon-left">
                <i className="pi pi-envelope text-indigo-400" />
                <InputText 
                  id="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="exemplo@empresa.com" 
                  className="w-full h-[3rem] bg-black/30 border-white/10 text-white rounded-xl focus:border-indigo-500"
                  required
                />
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="pass" className="text-xs font-bold text-white/70 ml-1">Senha de Acesso</label>
              <span className="p-input-icon-left">
                <i className="pi pi-lock text-indigo-400" />
                <Password 
                  id="pass"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  toggleMask 
                  feedback={false}
                  placeholder="Sua senha secreta"
                  className="w-full"
                  inputClassName="w-full h-[3rem] bg-black/30 border-white/10 text-white rounded-xl focus:border-indigo-500 pl-10"
                  required
                />
              </span>
            </div>

            <div className="flex align-items-center justify-content-between px-1">
              <div className="flex align-items-center">
                <Checkbox id="remember" onChange={e => setRememberMe(e.checked)} checked={rememberMe} className="mr-2" />
                <label htmlFor="remember" className="text-xs text-white/60 cursor-pointer">Lembrar acesso</label>
              </div>
              <a className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">Esqueceu a senha?</a>
            </div>

            <Button 
              label="Acessar Plataforma" 
              icon="pi pi-sign-in" 
              className="w-full h-14 border-round-xl font-bold bg-indigo-600 border-none hover:bg-indigo-700 shadow-lg mt-3" 
              type="submit"
            />
            
            <Divider align="center" className="my-4">
              <span className="text-xs text-white/30 font-medium px-3 uppercase tracking-widest">Enterprise Security</span>
            </Divider>

            <div className="text-center">
              <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.3em]">Built for high-scale operations</p>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-white/30 mt-8">
          Versão 1.2.4 &bull; Distribuído por <span className="text-white/50">Auto Tec Sistemas</span>
        </p>
      </div>
    </div>
  );
}
