<script setup>
import { ref, onMounted } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Password from 'primevue/password';

import { 
  PhUsers, 
  PhPlus, 
  PhMagnifyingGlass, 
  PhTrash, 
  PhUserGear, 
  PhShieldCheck,
  PhDotsThreeVertical 
} from '@phosphor-icons/vue';

const team = ref([]);
// Dialog Controls
const showInviteDialog = ref(false);
const userForm = ref({ nome: '', email: '', senha: '' });
const isEditing = ref(false);
const editingId = ref(null);
const loading = ref(false);

const fetchTeam = async () => {
    try {
        loading.value = true;
        const res = await fetch('http://206.183.129.197:3000/api/users');
        team.value = await res.json();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const openInviteDialog = (user = null) => {
    if (user && user.id) {
        isEditing.value = true;
        editingId.value = user.id;
        userForm.value = { nome: user.nome, email: user.email, senha: '' };
    } else {
        isEditing.value = false;
        editingId.value = null;
        userForm.value = { nome: '', email: '', senha: '' };
    }
    showInviteDialog.value = true;
};

const saveAgent = async () => {
    if (!userForm.value.nome || !userForm.value.email) return;
    if (!isEditing.value && !userForm.value.senha) return;

    try {
        loading.value = true;
        const method = isEditing.value ? 'PATCH' : 'POST';
        const url = isEditing.value 
            ? `http://206.183.129.197:3000/api/users/${editingId.value}` 
            : 'http://206.183.129.197:3000/api/users';

        // Prepare data (exclude empty password on edit)
        const payload = { ...userForm.value };
        if (isEditing.value && !payload.senha) {
            delete payload.senha;
        }

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showInviteDialog.value = false;
        fetchTeam();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const deleteAgent = async (id) => {
    if (!confirm('Deseja realmente remover este agente?')) return;
    try {
        loading.value = true;
        await fetch(`http://206.183.129.197:3000/api/users/${id}`, { method: 'DELETE' });
        fetchTeam();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchTeam);
</script>

<template>
  <div class="flex h-screen w-full bg-[#040406] overflow-hidden">
    <Sidebar active="users" />
    
    <main class="flex-1 flex flex-col h-full overflow-hidden">
        <header class="px-6 sm:px-10 py-8 sm:py-10 bg-[#0a0a0c]/40 backdrop-blur-xl border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div class="flex items-center gap-4 mb-2">
              <div class="p-3 bg-blue-500/20 rounded-2xl shadow-lg">
                <PhUsers :size="36" class="text-blue-400" weight="duotone" />
              </div>
              <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tighter">Equipe & Permissões</h1>
            </div>
            <p class="text-gray-500 text-sm font-medium">Controle o acesso e papéis dos seus agentes.</p>
          </div>
          <Button 
            icon="pi pi-user-plus" 
            label="Convidar Agente" 
            @click="openInviteDialog"
            class="w-full sm:w-auto px-8 h-14 bg-blue-600 border-none rounded-2xl font-bold" 
          />
        </header>

        <div class="flex-1 p-6 sm:p-10 overflow-y-auto custom-scroll relative">
            <div v-if="loading" class="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                 <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            
            <div class="max-w-[1200px] mx-auto space-y-6">
                <!-- Toolbar -->
                <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                    <div class="relative group w-full sm:w-[350px]">
                        <PhMagnifyingGlass :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400" />
                        <InputText placeholder="Filtrar por nome ou e-mail..." class="w-full pl-12 h-[52px] bg-black/40 border-white/5 rounded-2xl" />
                    </div>
                    <div class="flex items-center gap-2 text-xs font-bold text-gray-500 bg-white/5 px-4 py-2 rounded-xl border border-white/5 uppercase tracking-widest">
                        Total de Agentes: {{ team.length }}
                    </div>
                </div>

                <!-- User Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                    <div v-for="member in team" :key="member.id" class="p-6 sm:p-8 bg-[#0d0d0f] rounded-[2.5rem] border border-white/5 hover:border-blue-500/20 transition-all group relative overflow-hidden">
                        <div class="flex items-start justify-between mb-6">
                            <div class="flex items-center gap-4">
                                <div class="w-16 h-16 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center text-xl font-black text-white shadow-xl">
                                    {{ member.nome.substring(0, 2).toUpperCase() }}
                                </div>
                                <div class="flex flex-col">
                                    <h4 class="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{{ member.nome }}</h4>
                                    <span class="text-xs text-gray-500">{{ member.email }}</span>
                                </div>
                            </div>
                            <button class="text-gray-500 hover:text-white"><PhDotsThreeVertical :size="24" weight="bold" /></button>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="p-4 bg-black/40 rounded-2xl border border-white/5">
                                <span class="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1">Papel</span>
                                <div class="flex items-center gap-2">
                                    <PhUserGear :size="14" class="text-blue-400" />
                                    <span class="text-xs font-bold text-white">Agente</span>
                                </div>
                            </div>
                            <div class="p-4 bg-black/40 rounded-2xl border border-white/5">
                                <span class="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1">Status</span>
                                <div class="flex items-center gap-2">
                                    <PhShieldCheck :size="14" class="text-green-500" />
                                    <span class="text-xs font-bold text-green-500">Ativo</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 mt-6 pt-6 border-t border-white/5">
                            <button @click="openInviteDialog(member)" class="flex-1 h-12 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-xl transition-all border border-white/5">Editar Agente</button>
                            <button 
                              @click="deleteAgent(member.id)"
                              class="w-12 h-12 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center transition-all border border-red-500/10"
                            >
                                <PhTrash :size="20" weight="fill" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Invite Modal -->
        <Dialog v-model:visible="showInviteDialog" modal :header="isEditing ? 'Editar Agente' : 'Convidar Novo Agente'" :style="{ width: '450px' }" class="p-fluid">
            <div class="flex flex-col gap-6 py-4">
                <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome Completo</label>
                    <InputText v-model="userForm.nome" placeholder="Ex: João Silva" class="bg-black/40 border-white/10 rounded-xl h-12" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                    <InputText v-model="userForm.email" placeholder="joao@empresa.com" class="bg-black/40 border-white/10 rounded-xl h-12" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Senha Temporária</label>
                    <Password v-model="userForm.senha" :feedback="false" toggleMask placeholder="••••••••" inputClass="bg-black/40 border-white/10 rounded-xl h-12 w-full" />
                </div>
            </div>
            <template #footer>
                <div class="flex gap-3 pt-4">
                    <button @click="showInviteDialog = false" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-2xl transition-all">Cancelar</button>
                    <button @click="saveAgent" class="flex-1 py-4 bg-blue-600 text-xs font-bold text-white rounded-2xl shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all">
                        {{ isEditing ? 'Salvar Alterações' : 'Criar Acesso' }}
                    </button>
                </div>
            </template>
        </Dialog>
    </main>
  </div>
</template>

<style scoped>
:deep(.p-dialog) {
  background: #0f0f12 !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  border-radius: 2.5rem !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
}
:deep(.p-dialog-header) {
  background: transparent !important;
  color: white !important;
  padding: 2.5rem 2.5rem 1rem !important;
}
:deep(.p-dialog-title) {
    font-weight: 900 !important;
    letter-spacing: -0.025em !important;
}
:deep(.p-dialog-content) {
  background: transparent !important;
  padding: 1rem 2.5rem 2rem !important;
}
:deep(.p-dialog-footer) {
  background: transparent !important;
  padding: 0 2.5rem 2.5rem !important;
  border-top: none !important;
}
</style>
