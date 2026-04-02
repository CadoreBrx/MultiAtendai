<script setup>
import { ref, onMounted } from 'vue';
import { apiFetch } from '@/services/api';
import Sidebar from '@/components/Sidebar.vue';
import { 
  PhTrendUp, 
  PhUsers, 
  PhChatCircleText, 
  PhCalendarBlank, 
  PhLightning,
  PhWhatsappLogo,
  PhClock,
  PhArrowsClockwise
} from '@phosphor-icons/vue';

const stats = ref({
    msgCount: 0,
    contactCount: 0,
    agendamentoCount: 0
});
const loading = ref(false);

const fetchStats = async () => {
    try {
        loading.value = true;
        const response = await apiFetch('/api/dashboard/stats');
        stats.value = await response.json();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchStats);
</script>

<template>
  <div class="flex h-screen w-full bg-[#040406] overflow-hidden text-[#e2e8f0]">
    <Sidebar active="dashboard" />
    
    <main class="flex-1 overflow-y-auto custom-scroll p-8 sm:p-12 relative">
        <!-- Abstract Glows -->
        <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full -mr-32 -mt-32"></div>
        <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] rounded-full -ml-32 -mb-32"></div>

        <div class="max-w-[1400px] mx-auto space-y-12 relative z-10">
            <!-- Hero Header -->
            <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                <div>
                   <h1 class="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic">Painel Principal<span class="text-primary">.</span></h1>
                   <p class="text-gray-500 font-medium mt-2 flex items-center gap-2">
                     <PhClock :size="16" /> Visão geral do dia {{ new Date().toLocaleDateString('pt-BR') }}
                   </p>
                </div>
                <button @click="fetchStats" class="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all">
                    <PhArrowsClockwise :size="24" :class="{'animate-spin': loading}" />
                </button>
            </header>

            <!-- Main Stats Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <!-- Card -->
                <div class="p-8 bg-[#0d0d0f]/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] flex flex-col gap-6 shadow-2xl relative overflow-hidden group">
                   <div class="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 group-hover:scale-110 transition-transform">
                       <PhChatCircleText :size="100" />
                   </div>
                   <span class="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Fluxo de Mensagens</span>
                   <div class="flex flex-col">
                       <h2 class="text-4xl font-black text-white italic tracking-tighter">{{ stats.msgCount }}</h2>
                       <p class="text-[10px] font-bold text-green-500 mt-1 flex items-center gap-1"><PhTrendUp :size="14" /> Processadas pelo sistema</p>
                   </div>
                </div>

                <!-- Card -->
                <div class="p-8 bg-[#0d0d0f]/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] flex flex-col gap-6 shadow-2xl relative overflow-hidden group">
                   <div class="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 group-hover:scale-110 transition-transform">
                       <PhUsers :size="100" />
                   </div>
                   <span class="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Base de Clientes</span>
                   <div class="flex flex-col">
                       <h2 class="text-4xl font-black text-white italic tracking-tighter">{{ stats.contactCount }}</h2>
                       <p class="text-[10px] font-bold text-indigo-400 mt-1 uppercase tracking-widest">Leads catalogados</p>
                   </div>
                </div>

                <!-- Card -->
                <div class="p-8 bg-primary border border-primary/20 rounded-[2.5rem] flex flex-col gap-6 shadow-[0_15px_40px_rgba(99,102,241,0.2)] relative overflow-hidden group">
                   <div class="absolute top-0 right-0 p-8 opacity-20 scale-150 rotate-12 group-hover:scale-110 transition-transform">
                       <PhCalendarBlank :size="100" />
                   </div>
                   <span class="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Agenda de Hoje</span>
                   <div class="flex flex-col">
                       <h2 class="text-4xl font-black text-white italic tracking-tighter">{{ stats.agendamentoCount }}</h2>
                       <p class="text-[10px] font-bold text-white uppercase tracking-widest">Compromissos marcados</p>
                   </div>
                </div>

                <!-- Card -->
                <div class="p-8 bg-[#0d0d0f]/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] flex flex-col gap-6 shadow-2xl relative overflow-hidden group">
                   <div class="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 group-hover:scale-110 transition-transform">
                       <PhLightning :size="100" />
                   </div>
                   <span class="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Status Operacional</span>
                   <div class="flex flex-col">
                       <h2 class="text-4xl font-black text-white italic tracking-tighter">100%</h2>
                       <p class="text-[10px] font-bold text-green-500 mt-1 uppercase tracking-widest flex items-center gap-2">
                           <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Atendimento Ativo
                       </p>
                   </div>
                </div>
            </div>

            <!-- Dashboard Content Areas -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 space-y-6">
                    <div class="p-8 bg-white/5 border border-white/5 rounded-[3rem]">
                        <div class="flex items-center justify-between mb-8">
                            <h3 class="text-xl font-bold text-white tracking-tight uppercase italic">Integração WhatsApp</h3>
                            <button class="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest">Ver Status Detalhado</button>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="p-6 bg-black/40 rounded-3xl border border-white/5 flex items-center gap-5">
                                <div class="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20">
                                    <PhWhatsappLogo :size="24" class="text-green-500" weight="fill" />
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Instância Ativa</p>
                                    <p class="text-white font-bold">Conexão Estável</p>
                                </div>
                            </div>
                            <div class="p-6 bg-black/40 rounded-3xl border border-white/5 flex items-center gap-5">
                                <div class="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                                    <PhUsers :size="24" class="text-indigo-400" />
                                </div>
                                <div>
                                    <p class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Atendentes Online</p>
                                    <p class="text-white font-bold">4 Operadores</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="p-10 bg-indigo-600 rounded-[3rem] text-white flex flex-col justify-between relative overflow-hidden group shadow-[0_30px_60px_rgba(79,70,229,0.3)]">
                    <div class="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent"></div>
                    <div class="space-y-6 relative z-10">
                        <PhLightning :size="48" weight="fill" />
                        <div>
                            <h2 class="text-3xl font-black tracking-tighter uppercase italic leading-none">Impulsione<br/>suas Vendas</h2>
                            <p class="text-sm text-white/70 font-medium mt-4">Acompanhe seu pipeline no CRM e não perca nenhum compromisso na agenda.</p>
                        </div>
                    </div>
                    <router-link to="/crm" class="relative z-10 w-full h-14 bg-white text-primary rounded-2xl flex items-center justify-center font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                        Ver Pipeline CRM
                    </router-link>
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
</style>
