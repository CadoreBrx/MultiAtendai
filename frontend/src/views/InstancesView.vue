<script setup>
import { ref, onMounted } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import { useWhatsappStore } from '@/stores/whatsapp';
import { apiFetch } from '@/services/api';
import QrcodeVue from 'qrcode.vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';

import { 
  PhWhatsappLogo, 
  PhCheckCircle, 
  PhWarningCircle, 
  PhQrCode, 
  PhTrash, 
  PhArrowsClockwise,
  PhPlus
} from '@phosphor-icons/vue';

const wpStore = useWhatsappStore();
const instances = ref([]);

const qrData = ref(null);
const loading = ref(false);
const socketConnected = ref(false);
const instanceErrors = ref({});

// Dialog Controls
const showAddDialog = ref(false);
const showRenameDialog = ref(false);
const instanceForm = ref({ id: '', name: '' });
const activeInstance = ref(null);

const fetchInstances = async () => {
    try {
        const response = await apiFetch('/api/instances');
        const data = await response.json();
        instances.value = data;
    } catch (e) {
        console.error("Erro ao buscar instancias", e);
    }
};

const openAddDialog = () => {
    instanceForm.value = { id: '', name: '' };
    showAddDialog.value = true;
};

const addInstance = async () => {
    if (!instanceForm.value.name) return;
    
    // Convert name to an id (lowercase, no spaces)
    const id = instanceForm.value.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    try {
        loading.value = true;
        await apiFetch('/api/instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name: instanceForm.value.name })
        });
        showAddDialog.value = false;
        await fetchInstances();
    } catch (e) {
        console.error("Erro ao adicionar", e);
    } finally {
        loading.value = false;
    }
};

const deleteInstance = async (id) => {
    if (!confirm(`Tem certeza que deseja excluir a conexão ${id}?`)) return;
    
    try {
        loading.value = true;
        await apiFetch(`/api/instances/${id}`, {
            method: 'DELETE'
        });
        await fetchInstances();
    } catch (e) {
        console.error("Erro ao deletar", e);
    } finally {
         loading.value = false;
    }
};

const openRenameDialog = (inst) => {
    activeInstance.value = inst;
    instanceForm.value.name = inst.name;
    showRenameDialog.value = true;
};

const saveRename = async () => {
    if (!instanceForm.value.name || !activeInstance.value) return;

    try {
        loading.value = true;
        await apiFetch('/api/instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: activeInstance.value.id, name: instanceForm.value.name })
        });
        showRenameDialog.value = false;
        await fetchInstances();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    socketConnected.value = wpStore.socket.connected;
    wpStore.socket.on('connect',    () => { socketConnected.value = true; });
    wpStore.socket.on('disconnect', () => { socketConnected.value = false; });

    wpStore.socket.on('whatsapp_qr', (data) => {
        const inst = instances.value.find(i => i.id === data.clientId);
        if (inst) {
            inst.qr = data.qr;
            delete instanceErrors.value[data.clientId];
        }
    });

    wpStore.socket.on('whatsapp_ready', (data) => {
        const inst = instances.value.find(i => i.id === data.clientId);
        if (inst) { inst.status = 'connected'; inst.qr = null; }
        delete instanceErrors.value[data.clientId];
        loading.value = false;
    });

    wpStore.socket.on('whatsapp_authenticated', (data) => {
        const inst = instances.value.find(i => i.id === data.clientId);
        if (inst) { inst.status = 'connected'; inst.qr = null; }
    });

    wpStore.socket.on('whatsapp_auth_failure', (data) => {
        const inst = instances.value.find(i => i.id === data.clientId);
        if (inst) { inst.status = 'disconnected'; inst.qr = null; }
        instanceErrors.value[data.clientId] = 'Falha na autenticação. Tente novamente.';
        loading.value = false;
    });

    wpStore.socket.on('whatsapp_disconnected', (data) => {
        const inst = instances.value.find(i => i.id === data.clientId);
        if (inst) { inst.status = 'disconnected'; inst.qr = null; }
    });

    wpStore.socket.on('whatsapp_error', (data) => {
        const inst = instances.value.find(i => i.id === data.clientId);
        if (inst) { inst.status = 'disconnected'; inst.qr = null; }
        instanceErrors.value[data.clientId] = data.error || 'Erro ao inicializar. Verifique os logs do servidor.';
        loading.value = false;
    });

    fetchInstances();
});

const connect = async (id) => {
    if (!socketConnected.value) {
        instanceErrors.value[id] = 'Sem conexão com o servidor. Verifique se o backend está online e a porta está aberta no firewall.';
        return;
    }
    loading.value = true;
    delete instanceErrors.value[id];
    const inst = instances.value.find(i => i.id === id);
    if (inst) inst.qr = null;

    wpStore.socket.emit('whatsapp_initialize', { clientId: id });

    // Timeout: se em 30s não chegou QR nem ready, mostra erro
    setTimeout(() => {
        const current = instances.value.find(i => i.id === id);
        if (current && !current.qr && current.status !== 'connected') {
            instanceErrors.value[id] = 'Tempo esgotado sem resposta. Verifique os logs do servidor (pm2 logs multi-backend).';
        }
        loading.value = false;
    }, 30000);
};
</script>

<template>
  <div class="flex h-screen w-full bg-[#040406] overflow-hidden">
    <Sidebar active="instances" />
    
    <main class="flex-1 w-full flex flex-col overflow-hidden">
        <header class="px-6 sm:px-10 py-8 sm:py-10 bg-[#0a0a0c]/40 backdrop-blur-xl border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <div class="flex items-center gap-4 mb-2">
              <div class="p-3 bg-green-500/20 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                <PhWhatsappLogo :size="36" class="text-green-500" weight="duotone" />
              </div>
              <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tighter">Canais & PDV</h1>
            </div>
            <p class="text-gray-500 text-sm font-medium">Gerencie suas conexões oficiais e integração API.</p>
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold"
              :class="socketConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'">
              <div class="w-2 h-2 rounded-full" :class="socketConnected ? 'bg-green-500' : 'bg-red-500'"></div>
              {{ socketConnected ? 'Servidor conectado' : 'Sem conexão com servidor' }}
            </div>
            <button @click="fetchInstances" class="w-full sm:w-auto px-8 h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold text-sm transition-all flex items-center justify-center gap-3">
               <PhArrowsClockwise :size="20" :class="{'animate-spin': loading}" /> Atualizar Status
            </button>
          </div>
        </header>

        <div class="flex-1 p-6 sm:p-10 overflow-y-auto custom-scroll relative">
            <div v-if="loading" class="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                 <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 max-w-[1400px]">
                
                <div v-for="inst in instances" :key="inst.id" class="bg-[#0d0d0f] rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden group shadow-2xl">
                    <!-- Status Badge -->
                    <div class="flex justify-between items-start mb-8">
                        <div class="flex flex-col gap-1">
                            <span class="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">Instância Ativa</span>
                            <h3 class="text-xl font-bold text-white">{{ inst.name }}</h3>
                        </div>
                        <div 
                          class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border"
                          :class="inst.status === 'connected' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'"
                        >
                           <div class="w-2 h-2 rounded-full" :class="inst.status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'"></div>
                           {{ inst.status === 'connected' ? 'Online' : 'Desconectado' }}
                        </div>
                    </div>

                    <!-- Connection Visualization -->
                    <div class="bg-black/40 rounded-[2rem] p-8 border border-white/5 flex flex-col items-center justify-center gap-6 min-h-[300px] mb-8 relative">
                        <template v-if="inst.status === 'connected'">
                            <div class="text-center space-y-4">
                                <div class="w-24 h-24 bg-green-500/20 rounded-[2rem] flex items-center justify-center mx-auto border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                                    <PhCheckCircle :size="54" class="text-green-500" weight="fill" />
                                </div>
                                <div class="space-y-1">
                                    <p class="text-sm font-bold text-white">Pronto para operação</p>
                                    <p class="text-xs text-gray-500 font-medium tracking-tight">{{ inst.number }}</p>
                                </div>
                            </div>
                        </template>
                        <template v-else-if="inst.qr">
                            <div class="p-4 bg-white rounded-2xl shadow-2xl scale-110 flex items-center justify-center">
                                <QrcodeVue :value="inst.qr" :size="192" level="M" />
                            </div>
                            <p class="text-xs font-bold text-gray-400 mt-4 animate-pulse uppercase tracking-widest">Escaneie para conectar</p>
                        </template>
                        <template v-else>
                            <div class="text-center space-y-6 w-full">
                                <PhWarningCircle :size="64" class="text-gray-700 mx-auto" weight="thin" />
                                <button
                                  @click="connect(inst.id)"
                                  class="px-10 h-14 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-3 mx-auto"
                                  :disabled="loading || !socketConnected"
                                >
                                    <PhQrCode :size="20" /> Gerar QR Code
                                </button>
                                <div v-if="instanceErrors[inst.id]" class="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium text-left leading-relaxed">
                                    {{ instanceErrors[inst.id] }}
                                </div>
                            </div>
                        </template>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-3 pt-6 border-t border-white/5">
                        <button @click="openRenameDialog(inst)" class="flex-1 h-12 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-xl border border-white/5 transition-all">Configurações</button>
                        <button @click="deleteInstance(inst.id)" class="w-12 h-12 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl flex items-center justify-center border border-red-500/10 transition-all">
                            <PhTrash :size="20" weight="fill" />
                        </button>
                    </div>
                </div>

                <!-- Add New Instance Card -->
                <div @click="openAddDialog" class="border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center p-12 gap-6 opacity-40 hover:opacity-100 hover:bg-white/[0.01] transition-all cursor-pointer group hover:border-indigo-500/30">
                    <div class="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/5 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 transition-all">
                        <PhPlus :size="32" class="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <div class="text-center">
                        <p class="text-sm font-bold text-white mb-1 group-hover:text-indigo-400">Adicionar Canal</p>
                        <p class="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Multi-agent support</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Dialog -->
        <Dialog v-model:visible="showAddDialog" modal header="Nova Conexão" :style="{ width: '400px' }" class="p-fluid">
            <div class="flex flex-col gap-4 py-4">
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-widest">Nome da Conexão</label>
                    <InputText v-model="instanceForm.name" placeholder="Ex: Atendimento Principal" autofocus class="bg-black/40 border-white/10 rounded-xl" />
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2">
                    <button @click="showAddDialog = false" class="px-6 py-3 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-xl">Cancelar</button>
                    <button @click="addInstance" class="px-6 py-3 bg-primary text-xs font-bold text-white rounded-xl shadow-lg shadow-primary/20">Criar Canal</button>
                </div>
            </template>
        </Dialog>

        <!-- Rename Dialog -->
        <Dialog v-model:visible="showRenameDialog" modal header="Renomear Conexão" :style="{ width: '400px' }" class="p-fluid">
            <div class="flex flex-col gap-4 py-4">
                <div class="flex flex-col gap-2">
                    <label class="text-xs font-bold text-gray-500 uppercase tracking-widest">Novo Nome</label>
                    <InputText v-model="instanceForm.name" placeholder="Novo nome..." autofocus class="bg-black/40 border-white/10 rounded-xl" />
                </div>
            </div>
            <template #footer>
                <div class="flex gap-2">
                    <button @click="showRenameDialog = false" class="px-6 py-3 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-xl">Cancelar</button>
                    <button @click="saveRename" class="px-6 py-3 bg-primary text-xs font-bold text-white rounded-xl shadow-lg shadow-primary/20">Salvar Alteração</button>
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
  border-radius: 2rem !important;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
}
:deep(.p-dialog-header) {
  background: transparent !important;
  color: white !important;
  padding: 2rem 2rem 1rem !important;
}
:deep(.p-dialog-content) {
  background: transparent !important;
  padding: 1rem 2rem 2rem !important;
}
:deep(.p-dialog-footer) {
  background: transparent !important;
  padding: 0 2rem 2rem !important;
  border-top: none !important;
}
:deep(.p-inputtext) {
  padding: 1rem !important;
}
</style>

