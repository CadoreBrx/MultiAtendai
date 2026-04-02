<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { PhChatCircleText, PhShieldCheck } from '@phosphor-icons/vue';
import { apiFetch } from '@/services/api';

const auth = useAuthStore();
const router = useRouter();

const nomeEmpresa = ref('');
const nome = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const handleRegister = async () => {
  if (nomeEmpresa.value && nome.value && email.value && password.value) {
    try {
        loading.value = true;
        const response = await apiFetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nomeEmpresa: nomeEmpresa.value, 
                nome: nome.value, 
                email: email.value, 
                senha: password.value 
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            auth.login(data.user, data.empresa, data.token);
            router.push('/');
        } else {
            error.value = data.error || 'Falha no registro.';
        }
    } catch (e) {
        error.value = 'Erro ao conectar ao servidor.';
    } finally {
        loading.value = false;
    }
  } else {
    error.value = 'Por favor, preencha todos os campos.';
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg-color p-4 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none opacity-20">
      <div class="absolute top-[-20%] left-[-10%] w-[60rem] h-[60rem] bg-primary rounded-full blur-[150px] opacity-10"></div>
      <div class="absolute bottom-[-20%] right-[-10%] w-[50rem] h-[50rem] bg-indigo-900 rounded-full blur-[150px] opacity-10"></div>
    </div>

    <div class="w-full max-w-[480px] z-10 animate-fade-in">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-white rounded-[1.5rem] shadow-[0_8px_30px_rgba(255,255,255,0.15)] mb-6 transform hover:scale-105 transition-all">
          <PhChatCircleText :size="32" weight="fill" color="#0d0d12" />
        </div>
        <h1 class="text-3xl font-bold text-white tracking-tight">Criar Conta <span class="text-primary">SaaS</span></h1>
      </div>

      <div class="bg-bg-secondary/40 backdrop-blur-3xl border border-white/5 p-8 sm:p-10 rounded-[3rem] shadow-2xl relative">
        <div class="absolute -top-[1px] left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
        
        <form @submit.prevent="handleRegister" class="space-y-5">
          <div v-if="error">
            <Message severity="error" variant="simple" size="small">{{ error }}</Message>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome da Empresa</label>
            <div class="p-input-icon-left w-full">
              <i class="pi pi-building text-primary/60 ml-1" />
              <InputText 
                v-model="nomeEmpresa" 
                placeholder="Sua Empresa LTDA" 
                class="w-full h-12 bg-black/40 border-surface-border text-sm rounded-2xl"
                required
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Seu Nome</label>
            <div class="p-input-icon-left w-full">
              <i class="pi pi-user text-primary/60 ml-1" />
              <InputText 
                v-model="nome" 
                placeholder="Seu nome" 
                class="w-full h-12 bg-black/40 border-surface-border text-sm rounded-2xl"
                required
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
            <div class="p-input-icon-left w-full">
              <i class="pi pi-envelope text-primary/60 ml-1" />
              <InputText 
                v-model="email" 
                type="email"
                placeholder="admin@empresa.com" 
                class="w-full h-12 bg-black/40 border-surface-border text-sm rounded-2xl"
                required
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Senha Segura</label>
            <div class="p-input-icon-left w-full">
              <i class="pi pi-lock text-primary/60 ml-1" />
              <Password 
                v-model="password" 
                placeholder="••••••••" 
                :feedback="true" 
                toggleMask
                class="w-full"
                inputClass="w-full h-12 bg-black/40 border-surface-border text-sm rounded-2xl pl-12"
                required
              />
            </div>
          </div>

          <div class="flex items-center justify-end px-1 mt-2">
            <router-link to="/login" class="text-xs font-bold text-primary hover:text-white transition-colors">Já tenho conta</router-link>
          </div>

          <Button 
            type="submit" 
            label="Criar Workspace SaaS" 
            :loading="loading"
            class="w-full h-14 mt-4 bg-primary border-none font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
          />
        </form>
      </div>

      <div class="mt-8 flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all cursor-default">
         <div class="flex items-center gap-2">
            <PhShieldCheck :size="16" weight="bold" />
            <span class="text-[9px] font-black uppercase tracking-widest">SSL encryption</span>
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
