import React from 'react';
import { Users as UsersIcon, Plus, PencilSimple, Trash } from 'phosphor-react';
import Sidebar from '../components/Sidebar';

export default function Users({ user, onLogout }) {
  const team = [
    { id: 1, name: 'João Silva', email: 'joao@autotec.com', role: 'Administrador', status: 'Ativo' },
    { id: 2, name: 'Maria Souza', email: 'maria@autotec.com', role: 'Atendente', status: 'Ativo' },
    { id: 3, name: 'Carlos Santos', email: 'carlos@autotec.com', role: 'Atendente', status: 'Inativo' },
  ];

  return (
    <div className="flex h-screen w-full bg-bg-color">
      <Sidebar user={user} onLogout={onLogout} active="users" />
      
      <main className="flex-1 p-8 overflow-y-auto w-full relative">
        <header className="flex justify-between items-center mb-10 border-b border-surface-border pb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <UsersIcon size={28} className="text-primary" />
              Gestão de Equipe
            </h1>
            <p className="text-text-muted">Gerencie os atendentes e permissões do sistema.</p>
          </div>
          <button className="btn btn-primary bg-gradient-to-r from-primary to-primary-hover border-none text-white shadow-glow">
            <Plus size={20} weight="bold" />
            Adicionar Membro
          </button>
        </header>

        <section className="w-full">
          <div className="glass-panel overflow-hidden w-full">
            <table className="w-full text-left border-collapse">
              <thead className="bg-bg-secondary border-b border-surface-border text-text-muted text-sm uppercase tracking-wider">
                <tr>
                  <th className="p-5 font-semibold">Nome</th>
                  <th className="p-5 font-semibold">Email</th>
                  <th className="p-5 font-semibold">Perfil</th>
                  <th className="p-5 font-semibold">Status</th>
                  <th className="p-5 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-text-main text-sm">
                {team.map((member) => (
                  <tr key={member.id} className="border-b border-surface-border hover:bg-surface/50 transition-colors">
                    <td className="p-5 font-medium flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold shadow-sm">
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      {member.name}
                    </td>
                    <td className="p-5">{member.email}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${member.role === 'Administrador' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-surface border border-surface-border text-text-muted'}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${member.status === 'Ativo' ? 'bg-success shadow-glow' : 'bg-danger'}`}></div>
                        {member.status}
                      </div>
                    </td>
                    <td className="p-5 text-right flex items-center justify-end gap-3">
                      <button className="text-text-muted hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface" title="Editar">
                        <PencilSimple size={20} />
                      </button>
                      <button className="text-text-muted hover:text-danger transition-colors p-2 rounded-lg hover:bg-danger/10" title="Remover">
                        <Trash size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
