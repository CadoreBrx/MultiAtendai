<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import Message from 'primevue/message';
import { PhChatCircleText, PhShieldCheck } from '@phosphor-icons/vue';

const auth = useAuthStore();
const router = useRouter();

const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const error = ref('');

const handleLogin = async () => {
  if (email.value && password.value) {
    try {
        const response = await fetch('http://206.183.129.197:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.value, password: password.value })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            auth.login(data.user);
            router.push('/');
        } else {
            error.value = data.error || 'Falha na autenticação.';
        }
    } catch (e) {
        error.value = 'Erro ao conectar ao servidor.';
    }
  } else {
    error.value = 'Por favor, preencha todos os campos.';
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-color p-4 relative overflow-hidden">
    <!-- Subtle Aura Atmosphere -->
    <div class="absolute inset-0 pointer-events-none opacity-20">
      <div class="absolute top-[-20%] left-[-10%] w-[60rem] h-[60rem] bg-primary rounded-full blur-[150px] opacity-10"></div>
      <div class="absolute bottom-[-20%] right-[-10%] w-[50rem] h-[50rem] bg-indigo-900 rounded-full blur-[150px] opacity-10"></div>
    </div>

    <div class="w-full max-w-[420px] z-10 animate-fade-in">
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgba(255,255,255,0.15)] mb-6 transform hover:scale-105 transition-all">
          <PhChatCircleText :size="32" weight="fill" color="#0d0d12" />
        </div>
        <h1 class="text-4xl font-bold text-white tracking-tight">MultiAtend<span class="text-primary">.ai</span></h1>
        <p class="text-gray-500 text-xs font-bold uppercase tracking-[0.3em] mt-3">Enterprise Ecosystem</p>
      </div>

      <div class="bg-bg-secondary/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] shadow-2xl relative">
        <div class="absolute -top-[1px] left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
        
        <div class="mb-10 text-center">
          <h2 class="text-2xl font-bold text-white tracking-tight">Login</h2>
          <p class="text-gray-500 text-sm mt-1">Acesse sua central de comando.</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <div v-if="error">
            <Message severity="error" variant="simple" size="small">{{ error }}</Message>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
            <div class="p-input-icon-left w-full">
              <i class="pi pi-envelope text-primary/60 ml-1" />
              <InputText 
                v-model="email" 
                placeholder="agente@empresa.com" 
                class="w-full h-14 bg-black/40 border-surface-border text-sm rounded-2xl"
                required
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
            <div class="p-input-icon-left w-full">
              <i class="pi pi-lock text-primary/60 ml-1" />
              <Password 
                v-model="password" 
                placeholder="••••••••" 
                :feedback="false" 
                toggleMask
                class="w-full"
                inputClass="w-full h-14 bg-black/40 border-surface-border text-sm rounded-2xl pl-12"
                required
              />
            </div>
          </div>

          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2 cursor-pointer group">
              <Checkbox v-model="rememberMe" :binary="true" id="rem" />
              <label for="rem" class="text-xs text-gray-500 select-none cursor-pointer group-hover:text-gray-300 transition-colors">Lembrar acesso</label>
            </div>
            <a href="#" class="text-xs font-bold text-primary hover:text-white transition-colors">Esqueceu?</a>
          </div>

          <Button 
            type="submit" 
            label="Entrar na Plataforma" 
            class="w-full h-14 bg-primary border-none font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
          />
        </form>
      </div>

      <!-- Security Footer Inspired by professional SaaS -->
      <div class="mt-12 flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
         <div class="flex items-center gap-2">
            <PhShieldCheck :size="16" weight="bold" />
            <span class="text-[9px] font-black uppercase tracking-widest">SSL encryption</span>
         </div>
         <div class="w-[1px] h-4 bg-white/20"></div>
         <div class="flex items-center gap-2">
            <span class="text-[9px] font-black uppercase tracking-widest">Aura Secured</span>
         </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.p-password-input) {
  padding-left: 3rem !important;
}
</style>
