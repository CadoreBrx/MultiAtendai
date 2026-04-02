<script setup>
import { ref, onMounted, computed } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import { useAuthStore } from '@/stores/auth';
import { apiFetch } from '@/services/api';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker'; // Updated from Calendar to DatePicker
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  PhCalendarBlank, 
  PhPlus, 
  PhClock, 
  PhUser, 
  PhTrash, 
  PhCheckCircle, 
  PhArrowsClockwise,
  PhTimer
} from '@phosphor-icons/vue';

const authStore = useAuthStore();
const agendamentos = ref([]);
const loading = ref(false);
const showAddDialog = ref(false);

const newAgendamento = ref({
    titulo: '',
    descricao: '',
    dataHora: new Date(),
    contatoId: null,
});

const fetchAgendamentos = async () => {
    try {
        loading.value = true;
        const response = await apiFetch('/api/agendamentos');
        agendamentos.value = await response.json();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const createAgendamento = async () => {
    if (!newAgendamento.value.titulo || !newAgendamento.value.dataHora) return;
    
    if (!authStore.user?.id) {
        alert("Sua sessão expirou ou ocorreu um erro de identificação. Por favor, saia do sistema e faça login novamente para agendar.");
        return;
    }

    try {
        loading.value = true;
        const res = await apiFetch('/api/agendamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...newAgendamento.value,
                usuarioId: authStore.user.id
            })
        });
        
        if (!res.ok) throw new Error('Falha ao criar agendamento');
        
        showAddDialog.value = false;
        newAgendamento.value = { titulo: '', descricao: '', dataHora: new Date() };
        fetchAgendamentos();
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar compromisso. Verifique se você está logado corretamente.');
    } finally {
        loading.value = false;
    }
};

const updateStatus = async (id, status) => {
    try {
        await apiFetch(`/api/agendamentos/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        fetchAgendamentos();
    } catch (e) {
        console.error(e);
    }
};

const deleteAgendamento = async (id) => {
    if (!confirm('Excluir este agendamento?')) return;
    try {
        await apiFetch(`/api/agendamentos/${id}`, { method: 'DELETE' });
        fetchAgendamentos();
    } catch (e) {
        console.error(e);
    }
};

onMounted(fetchAgendamentos);

const groupedAgendamentos = computed(() => {
    const groups = {};
    agendamentos.value.forEach(a => {
        const dateKey = format(new Date(a.dataHora), 'dd/MM/yyyy');
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(a);
    });
    return groups;
});

const sortedDateKeys = computed(() => {
    return Object.keys(groupedAgendamentos.value).sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('/');
        const [dayB, monthB, yearB] = b.split('/');
        return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    });
});

const formatDateTitle = (dateStr) => {
    // dateStr is now dd/MM/yyyy
    const parts = dateStr.split('/');
    const date = new Date(parts[2], parts[1] - 1, parts[0], 12, 0, 0);
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
};
</script>

<template>
  <div class="flex h-screen w-full bg-[#040406] overflow-hidden text-[#e2e8f0]">
    <Sidebar active="schedule" />
    
    <main class="flex-1 flex flex-col h-full overflow-hidden relative">
        <!-- Background Accents -->
        <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full -mr-64 -mt-64"></div>
        <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full -ml-40 -mb-40"></div>

        <header class="px-6 sm:px-10 py-8 sm:py-12 bg-[#0a0a0c]/40 backdrop-blur-2xl border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 z-10">
          <div>
            <div class="flex items-center gap-5 mb-3">
              <div class="p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                <PhCalendarBlank :size="32" class="text-indigo-400" weight="duotone" />
              </div>
              <div>
                <h1 class="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic">Agenda<span class="text-indigo-500">.</span>Flow</h1>
                <div class="flex items-center gap-2 mt-1">
                    <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Sincronização em tempo real</p>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-3 w-full sm:w-auto">
              <button 
                @click="fetchAgendamentos"
                class="w-14 h-14 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center transition-all group"
              >
                  <PhArrowsClockwise :size="24" :class="{'animate-spin': loading}" class="text-gray-400 group-hover:text-white" />
              </button>
              <Button 
                icon="pi pi-plus" 
                label="Agendar Compromisso" 
                @click="showAddDialog = true"
                class="flex-1 sm:flex-none px-10 h-14 bg-indigo-600 border-none rounded-2xl font-bold shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:translate-y-[-2px] transition-all" 
              />
          </div>
        </header>

        <div class="flex-1 p-6 sm:p-12 overflow-y-auto custom-scroll relative z-10">
            <div class="max-w-[1200px] mx-auto space-y-16">
                
                <div v-if="agendamentos.length === 0 && !loading" class="flex flex-col items-center justify-center py-32 text-center">
                    <div class="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center mb-8 border border-white/5">
                        <PhCalendarBlank :size="64" weight="thin" class="text-gray-700" />
                    </div>
                    <h3 class="text-2xl font-black text-white italic uppercase tracking-tighter">Sua agenda está limpa</h3>
                    <p class="text-gray-500 mt-3 font-medium max-w-xs">Nenhum compromisso por enquanto. Que tal começar um novo agendamento?</p>
                </div>

                <div v-for="dateKey in sortedDateKeys" :key="dateKey" class="space-y-8">
                    <div class="flex items-center gap-6">
                        <div class="px-6 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                            <h2 class="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 whitespace-nowrap">{{ formatDateTitle(dateKey) }}</h2>
                        </div>
                        <div class="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div v-for="item in groupedAgendamentos[dateKey]" :key="item.id" 
                             class="p-8 bg-[#0d0d0f]/60 backdrop-blur-xl rounded-[2.5rem] border border-white/5 hover:border-indigo-500/40 transition-all group relative overflow-hidden shadow-xl"
                             :class="{'opacity-60 grayscale-[0.5]': item.status === 'concluído'}">
                            
                            <!-- Status Accent -->
                            <div class="absolute top-0 left-0 w-1 h-full bg-indigo-600" :class="{'bg-green-500': item.status === 'concluído'}"></div>
                            
                            <div class="flex flex-col justify-between h-full gap-8">
                                <div class="flex justify-between items-start gap-4">
                                    <div class="flex gap-6 items-start">
                                        <!-- Time Block -->
                                        <div class="flex flex-col items-center justify-center w-20 px-3 py-4 bg-black/60 rounded-[1.5rem] border border-white/10 shrink-0 shadow-2xl">
                                            <PhTimer :size="20" class="text-indigo-400 mb-2" />
                                            <span class="text-lg font-black text-white italic tracking-tighter">{{ format(new Date(item.dataHora), 'HH:mm', { locale: ptBR }) }}</span>
                                        </div>

                                        <div class="space-y-3">
                                            <div class="flex items-center gap-2">
                                                <div v-if="item.status === 'concluído'" class="bg-green-500/20 text-green-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-500/30">
                                                    Check-in Realizado
                                                </div>
                                                <div v-else class="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                                                    Pendente
                                                </div>
                                            </div>
                                            <h3 class="text-xl font-black text-white group-hover:text-indigo-400 transition-all truncate tracking-tight uppercase italic">{{ item.titulo }}</h3>
                                            <p v-if="item.descricao" class="text-sm text-gray-500 leading-relaxed line-clamp-2 font-medium">{{ item.descricao }}</p>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-white/5">
                                    <div class="flex -space-x-3">
                                        <div class="w-10 h-10 rounded-full bg-indigo-600 border-2 border-[#0d0d0f] flex items-center justify-center shadow-lg" title="Vendedor">
                                            <PhUser :size="18" weight="bold" class="text-white" />
                                        </div>
                                        <div v-if="item.contato" class="w-10 h-10 rounded-full bg-green-500 border-2 border-[#0d0d0f] flex items-center justify-center shadow-lg" title="Cliente">
                                            <PhUser :size="18" weight="bold" class="text-white" />
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-3 w-full sm:w-auto">
                                        <button 
                                            @click="updateStatus(item.id, 'concluído')"
                                            v-if="item.status !== 'concluído'"
                                            class="flex-1 sm:flex-none h-12 px-6 bg-white hover:bg-white/90 text-black text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg"
                                        >
                                            Finalizar
                                        </button>
                                        <button 
                                            @click="deleteAgendamento(item.id)"
                                            class="w-12 h-12 bg-red-500/5 hover:bg-red-500/20 text-red-500/30 hover:text-red-500 rounded-2xl flex items-center justify-center transition-all border border-white/5 group"
                                        >
                                            <PhTrash :size="22" class="group-hover:scale-110 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Create Dialog -->
        <Dialog v-model:visible="showAddDialog" modal header="Novo Compromisso" :style="{ width: '480px' }" class="p-fluid premium-dialog">
            <div class="flex flex-col gap-8 py-6">
                <!-- Header Decorative -->
                <div class="flex items-center gap-4 p-4 bg-indigo-500/5 rounded-3xl border border-indigo-500/10">
                    <div class="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
                        <PhPlus :size="24" class="text-indigo-400" />
                    </div>
                    <div>
                        <p class="text-[10px] font-black uppercase tracking-[.2em] text-indigo-400">Novo Agendamento</p>
                        <p class="text-sm text-gray-400 font-medium">Preencha os dados do evento.</p>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="flex flex-col gap-3">
                        <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Título do Evento</label>
                        <InputText v-model="newAgendamento.titulo" placeholder="Ex: Reunião de Fechamento" class="modern-input h-14 w-full" style="color: white !important; background: #1a1a1d !important;" />
                    </div>
                    
                    <div class="flex flex-col gap-3">
                        <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Data e Hora do Compromisso</label>
                        <DatePicker v-model="newAgendamento.dataHora" showTime hourFormat="24" dateFormat="dd/mm/yy" class="modern-datepicker" style="background: #1a1a1d !important;" />
                    </div>

                    <div class="flex flex-col gap-3">
                        <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Notas Estratégicas</label>
                        <Textarea v-model="newAgendamento.descricao" rows="3" placeholder="Qual o objetivo desse contato?" class="modern-input w-full" style="color: white !important; background: #1a1a1d !important;" />
                    </div>
                </div>
            </div>
            
            <template #footer>
                <div class="flex gap-4 pt-4">
                    <button @click="showAddDialog = false" class="flex-1 py-5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white rounded-3xl transition-all border border-white/5">Descartar</button>
                    <button @click="createAgendamento" class="flex-1 py-5 bg-indigo-600 text-[10px] font-black uppercase tracking-widest text-white rounded-3xl shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all">Confirmar Agenda</button>
                </div>
            </template>
        </Dialog>
    </main>
  </div>
</template>

<style scoped>
.modern-input {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 1.25rem !important;
    padding: 1rem 1.25rem !important;
    color: white !important;
    transition: all 0.3s ease;
}
.modern-input:focus {
    border-color: #6366f1 !important;
    background: rgba(99, 102, 241, 0.05) !important;
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.1) !important;
}

:deep(.p-dialog) {
  background: #0d0d0f !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 3rem !important;
  padding: 1rem !important;
}
:deep(.p-dialog-header) {
  background: transparent !important;
  color: white !important;
  padding: 2.5rem 2.5rem 0.5rem !important;
}
:deep(.p-dialog-title) {
    font-size: 1.5rem !important;
    font-weight: 900 !important;
    text-transform: uppercase;
    font-style: italic;
    letter-spacing: -0.05em;
}
:deep(.p-dialog-content) {
  background: transparent !important;
  padding: 1rem 2.5rem !important;
}
:deep(.p-dialog-footer) {
  background: transparent !important;
  padding: 1rem 2.5rem 2.5rem !important;
  border-top: none !important;
}

:deep(.modern-datepicker .p-inputtext) {
    background: rgba(255, 255, 255, 0.03) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 1.25rem !important;
    height: 3.5rem !important;
    color: white !important;
    padding-left: 1.25rem !important;
}

:deep(.p-datepicker) {
    background: #111114 !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 2rem !important;
    padding: 1.5rem !important;
    box-shadow: 0 30px 60px rgba(0,0,0,0.8) !important;
}
:deep(.p-datepicker-header) {
    background: transparent !important;
    border-bottom: 1px solid rgba(255,255,255,0.05) !important;
    padding-bottom: 1rem !important;
}
:deep(.p-datepicker table td > span) {
    border-radius: 1rem !important;
    font-weight: bold !important;
}
:deep(.p-datepicker table td > span.p-highlight) {
    background: #6366f1 !important;
    color: white !important;
}
</style>
