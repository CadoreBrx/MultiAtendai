<script setup>
import { ref, onMounted, computed } from 'vue';
import { useWhatsappStore } from '@/stores/whatsapp';
import Sidebar from '@/components/Sidebar.vue';
import InputText from 'primevue/inputtext';
import { 
  PhKanban, 
  PhMagnifyingGlass, 
  PhTrendUp, 
  PhCurrencyDollar, 
  PhWhatsappLogo,
  PhUser,
  PhCaretRight,
  PhCaretLeft,
  PhTrash,
  PhCheckCircle,
  PhXCircle,
  PhArrowsClockwise
} from '@phosphor-icons/vue';

const contacts = ref([]);
const loading = ref(false);
const searchTerm = ref('');

const stages = [
    { id: 'lead', title: 'Novos Leads', color: 'bg-indigo-500' },
    { id: 'qualificado', title: 'Qualificados', color: 'bg-amber-500' },
    { id: 'negociacao', title: 'Negociação', color: 'bg-blue-500' },
    { id: 'fechado', title: 'Fechado/Ganho', color: 'bg-green-500' },
    { id: 'perdido', title: 'Perdido', color: 'bg-red-500' }
];

const fetchContacts = async () => {
    try {
        loading.value = true;
        const response = await fetch('http://localhost:3000/api/contacts');
        contacts.value = await response.json();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const moveStage = async (contactId, newStatus) => {
    try {
        await fetch(`http://localhost:3000/api/contacts/${contactId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        fetchContacts();
    } catch (e) {
        console.error(e);
    }
};

const updateValue = async (contactId, valor) => {
    try {
        await fetch(`http://localhost:3000/api/contacts/${contactId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ valor: parseFloat(valor) })
        });
        fetchContacts();
    } catch (e) {
        console.error(e);
    }
};

const onDragStart = (event, contact) => {
    event.dataTransfer.setData('contactId', contact.id);
    event.dataTransfer.effectAllowed = 'move';
    event.target.classList.add('dragging');
};

const onDragEnd = (event) => {
    event.target.classList.remove('dragging');
};

const onDrop = async (event, newStatus) => {
    const contactId = event.dataTransfer.getData('contactId');
    if (contactId) {
        await moveStage(contactId, newStatus);
    }
};

onMounted(fetchContacts);

const filteredContacts = computed(() => {
    if (!searchTerm.value) return contacts.value;
    const term = searchTerm.value.toLowerCase();
    return contacts.value.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(term)) || 
        c.numero.includes(term)
    );
});

const pipelineData = computed(() => {
    const data = {};
    stages.forEach(s => data[s.id] = []);
    filteredContacts.value.forEach(c => {
        if (data[c.status]) data[c.status].push(c);
        else data['lead'].push(c);
    });
    return data;
});

const totalValue = computed(() => {
    return contacts.value.reduce((acc, c) => acc + (c.valor || 0), 0);
});

const conversionRate = computed(() => {
    if (contacts.value.length === 0) return 0;
    const closed = contacts.value.filter(c => c.status === 'fechado').length;
    return ((closed / contacts.value.length) * 100).toFixed(1);
});
</script>

<template>
  <div class="flex h-screen w-full bg-[#040406] overflow-hidden text-slate-200">
    <Sidebar active="crm" />
    
    <main class="flex-1 w-full flex flex-col overflow-hidden relative">
        <!-- Abstract Background -->
        <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full -mr-32 -mt-32"></div>

        <header class="px-8 py-10 flex flex-col gap-8 shrink-0 border-b border-white/5 bg-[#0a0a0c]/60 backdrop-blur-2xl z-20">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div class="space-y-1">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <PhKanban :size="24" class="text-indigo-400" weight="duotone" />
                    </div>
                    <h1 class="text-3xl font-black text-white tracking-tighter uppercase italic">CRM<span class="text-indigo-500">.</span>Pipeline</h1>
                </div>
                <p class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1">Gestão Estratégica de Leads</p>
             </div>

             <div class="flex items-center gap-4 w-full md:w-auto">
                 <div class="relative flex-1 md:w-80">
                      <PhMagnifyingGlass :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                      <InputText v-model="searchTerm" placeholder="Localizar lead ou número..." class="w-full pl-12 h-14 bg-white/5 border-white/5 text-sm rounded-2xl focus:border-indigo-500/50 transition-all font-medium" />
                 </div>
                 <button @click="fetchContacts" class="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                    <PhArrowsClockwise :size="20" :class="{'animate-spin': loading}" />
                 </button>
             </div>
          </div>

          <!-- Stats Quick View -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col gap-2">
                  <span class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Valor do Funil</span>
                  <div class="flex items-end justify-between">
                    <h2 class="text-2xl font-black text-white italic">R$ {{ totalValue.toLocaleString() }}</h2>
                    <PhCurrencyDollar :size="20" class="text-green-500 mb-1" />
                  </div>
              </div>
              <div class="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col gap-2">
                  <span class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Total de Leads</span>
                  <div class="flex items-end justify-between">
                    <h2 class="text-2xl font-black text-white italic">{{ contacts.length }}</h2>
                    <PhUser :size="20" class="text-indigo-400 mb-1" />
                  </div>
              </div>
              <div class="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col gap-2">
                  <span class="text-[9px] font-black text-gray-500 uppercase tracking-widest">Taxa Conversão</span>
                  <div class="flex items-end justify-between">
                    <h2 class="text-2xl font-black text-white italic">{{ conversionRate }}%</h2>
                    <PhTrendUp :size="20" class="text-primary mb-1" />
                  </div>
              </div>
              <div class="p-6 bg-indigo-600 rounded-3xl border border-indigo-500 flex flex-col gap-2 shadow-[0_10px_30px_rgba(79,70,229,0.2)]">
                  <span class="text-[9px] font-black text-white/60 uppercase tracking-widest">Oportunidades</span>
                  <div class="flex items-end justify-between">
                    <h2 class="text-2xl font-black text-white italic">{{ pipelineData.negociacao?.length }}</h2>
                    <PhWhatsappLogo :size="20" class="text-white mb-1" weight="fill" />
                  </div>
              </div>
          </div>
        </header>

        <!-- Kanban Board -->
        <div class="flex-1 p-8 overflow-x-auto custom-scroll-h flex gap-8 z-10">
            <div v-for="stage in stages" :key="stage.id" class="w-80 shrink-0 flex flex-col gap-6">
                <!-- Column Header -->
                <div class="flex items-center justify-between px-2">
                    <div class="flex items-center gap-3">
                        <div class="w-2.5 h-2.5 rounded-full" :class="stage.color"></div>
                        <h3 class="text-xs font-black uppercase tracking-[0.2em] text-gray-400">{{ stage.title }}</h3>
                    </div>
                    <span class="px-2 py-0.5 bg-white/5 rounded-lg text-[10px] font-bold text-gray-600">{{ pipelineData[stage.id].length }}</span>
                </div>

                <!-- Cards Container -->
                <div 
                    class="flex-1 flex flex-col gap-4 overflow-y-auto custom-scroll pr-2 pb-10 min-h-[500px]"
                    @dragover.prevent
                    @drop="onDrop($event, stage.id)"
                >
                    <div v-if="pipelineData[stage.id].length === 0" class="h-32 border-2 border-dashed border-white/5 rounded-3xl flex items-center justify-center opacity-20 pointer-events-none">
                        <PhKanban :size="32" weight="thin" />
                    </div>

                    <div v-for="contact in pipelineData[stage.id]" :key="contact.id" 
                         draggable="true"
                         @dragstart="onDragStart($event, contact)"
                         @dragend="onDragEnd($event)"
                         class="p-5 bg-[#0d0d0f]/80 backdrop-blur-xl rounded-[2rem] border border-white/5 hover:border-indigo-500/30 transition-all group shadow-lg cursor-grab active:cursor-grabbing">
                        
                        <div class="flex items-center gap-4 mb-5">
                            <div class="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shrink-0 shadow-inner">
                                <img v-if="contact.fotoPerfil" :src="contact.fotoPerfil" class="w-full h-full object-cover" />
                                <div v-else class="w-full h-full bg-slate-800 flex items-center justify-center text-gray-500"><PhUser :size="20" /></div>
                            </div>
                            <div class="flex flex-col min-w-0">
                                <span class="text-sm font-black text-white truncate uppercase tracking-tight">{{ contact.nome || 'Sem Nome' }}</span>
                                <span class="text-[10px] text-gray-500 font-bold truncate">{{ contact.numero.split('@')[0] }}</span>
                            </div>
                        </div>

                        <!-- Last Message Preview -->
                        <div v-if="contact.mensagens?.[0]" class="mb-5 p-3 bg-white/[0.02] rounded-xl border border-white/5 italic">
                            <p class="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">"{{ contact.mensagens[0].corpo }}"</p>
                        </div>

                        <!-- Value Entry -->
                        <div class="flex items-center gap-2 mb-6 px-1">
                            <span class="text-[9px] font-black text-indigo-400">R$</span>
                            <input 
                                type="number" 
                                v-model.lazy="contact.valor" 
                                @change="updateValue(contact.id, contact.valor)"
                                class="bg-transparent border-none text-xs font-black text-white w-full focus:ring-0 p-0 placeholder-gray-700"
                                placeholder="Definir Valor..."
                            />
                        </div>

                        <!-- Drag/Move Actions -->
                        <div class="flex items-center justify-between pt-4 border-t border-white/5">
                            <div class="flex gap-1">
                                <button 
                                    v-if="stages.indexOf(stages.find(s => s.id === contact.status)) > 0"
                                    @click="moveStage(contact.id, stages[stages.indexOf(stages.find(s => s.id === contact.status)) - 1].id)"
                                    class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all"
                                >
                                    <PhCaretLeft :size="16" />
                                </button>
                                <button 
                                    v-if="stages.indexOf(stages.find(s => s.id === contact.status)) < stages.length - 1"
                                    @click="moveStage(contact.id, stages[stages.indexOf(stages.find(s => s.id === contact.status)) + 1].id)"
                                    class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-all"
                                >
                                    <PhCaretRight :size="16" />
                                </button>
                            </div>
                            
                            <div class="flex gap-2">
                                <button 
                                    @click="moveStage(contact.id, 'fechado')"
                                    v-if="contact.status !== 'fechado' && contact.status !== 'perdido'"
                                    class="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center border border-green-500/20 hover:bg-green-500 transition-all hover:text-white"
                                >
                                    <PhCheckCircle :size="16" weight="bold" />
                                </button>
                                <button 
                                    @click="moveStage(contact.id, 'perdido')"
                                    v-if="contact.status !== 'fechado' && contact.status !== 'perdido'"
                                    class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 hover:bg-red-500 transition-all hover:text-white"
                                >
                                    <PhXCircle :size="16" weight="bold" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
  </div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-track { background: transparent; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }

.custom-scroll-h::-webkit-scrollbar { height: 6px; }
.custom-scroll-h::-webkit-scrollbar-track { background: transparent; }
.custom-scroll-h::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }

.dragging {
    opacity: 0.5;
    transform: scale(0.95);
    cursor: grabbing;
}

[draggable="true"] {
    user-select: none;
}
</style>
