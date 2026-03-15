<script setup>
import { useAuthStore } from '@/stores/auth';
import { useRoute } from 'vue-router';
import { 
  PhHouse, 
  PhWhatsappLogo, 
  PhFlowArrow, 
  PhKanban, 
  PhUsers, 
  PhSignOut, 
  PhChatCircleText,
  PhGear,
  PhCalendarBlank
} from '@phosphor-icons/vue';

const props = defineProps({
  active: String
});

const auth = useAuthStore();
const route = useRoute();

const isActive = (name) => {
  return props.active === name || route.name === name;
};

const navItems = [
  { id: 'dashboard', icon: PhHouse, title: 'Painel', path: '/' },
  { id: 'chat', icon: PhChatCircleText, title: 'Atendimento', path: '/chat' },
  { id: 'instances', icon: PhWhatsappLogo, title: 'Conexões', path: '/instances' },
  { id: 'departaments', icon: PhFlowArrow, title: 'Automação', path: '/departaments' },
  { id: 'crm', icon: PhKanban, title: 'CRM', path: '/crm' },
  { id: 'schedule', icon: PhCalendarBlank, title: 'Agenda', path: '/schedule' },
  { id: 'users', icon: PhUsers, title: 'Usuários', path: '/users' },
];
</script>

<template>
  <nav class="hidden sm:flex w-[88px] h-screen bg-[#111118]/80 backdrop-blur-3xl border-r border-white/5 flex-col items-center py-8 justify-between z-50">
    <div class="flex flex-col items-center gap-10 w-full">
      <!-- High-end Logo Container -->
      <router-link to="/" class="relative mb-2">
        <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-[0_8px_16px_-4px_rgba(255,255,255,0.2)]">
          <PhChatCircleText :size="28" weight="fill" color="#0d0d12" />
        </div>
      </router-link>

      <!-- Clean Navigation -->
      <div class="flex flex-col gap-4 items-center w-full">
        <router-link 
          v-for="item in navItems" 
          :key="item.id" 
          :to="item.path" 
          class="relative w-12 h-12 rounded-2xl transition-all flex items-center justify-center group"
          :class="isActive(item.id) 
            ? 'bg-primary text-white shadow-[0_4px_12px_rgba(99,102,241,0.4)]' 
            : 'text-gray-500 hover:text-white hover:bg-white/5'"
        >
          <component :is="item.icon" :size="24" :weight="isActive(item.id) ? 'fill' : 'regular'" />
          
          <!-- Tooltip Aura Style -->
          <div class="absolute left-full ml-4 px-3 py-2 bg-[#1a1a24] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all border border-white/5 z-[100] whitespace-nowrap shadow-2xl">
            {{ item.title }}
          </div>
        </router-link>
      </div>
    </div>

    <!-- Bottom Actions -->
    <div class="flex flex-col gap-4 items-center w-full">
      <button class="w-12 h-12 rounded-2xl text-gray-500 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center">
        <PhGear :size="24" />
      </button>

      <!-- Profile Aura Style -->
      <div class="relative mt-2 border-t border-white/5 pt-6 flex flex-col items-center gap-4">
        <div class="w-10 h-10 rounded-full border-2 border-indigo-500/30 p-[2px] cursor-pointer">
            <div class="bg-indigo-600 w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase">
              {{ auth.user?.nome?.substring(0, 2) || 'AD' }}
            </div>
        </div>
        
        <button 
          @click="auth.logout" 
          class="w-10 h-10 text-gray-600 hover:text-red-400 transition-colors flex items-center justify-center"
        >
          <PhSignOut :size="24" weight="regular" />
        </button>
      </div>
    </div>
  </nav>

  <!-- Mobile Bottom Nav Clean Aura -->
  <nav class="sm:hidden fixed bottom-4 left-4 right-4 h-16 bg-[#111118]/90 backdrop-blur-2xl border border-white/10 rounded-3xl flex items-center justify-around px-4 z-[99] shadow-2xl">
    <router-link 
      v-for="item in navItems" 
      :key="item.id" 
      :to="item.path" 
      class="p-2 transition-all"
      :class="isActive(item.id) ? 'text-primary' : 'text-gray-500'"
    >
      <component :is="item.icon" :size="24" :weight="isActive(item.id) ? 'fill' : 'regular'" />
    </router-link>
    <button @click="auth.logout" class="p-2 text-gray-500 hover:text-red-400">
      <PhSignOut :size="24" weight="regular" />
    </button>
  </nav>
</template>
