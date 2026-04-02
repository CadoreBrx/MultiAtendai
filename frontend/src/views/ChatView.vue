<script setup>
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useWhatsappStore } from '@/stores/whatsapp';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Sidebar from '@/components/Sidebar.vue';
import { apiFetch } from '@/services/api';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { 
  PhChatCircleText, 
  PhMagnifyingGlass, 
  PhCheckCircle, 
  PhPaperclip, 
  PhPaperPlaneRight, 
  PhTrash, 
  PhWhatsappLogo,
  PhCaretLeft,
  PhPhone,
  PhSpeakerHigh,
  PhFiles,
  PhInfo,
  PhPlus,
  PhDotsThreeVertical,
  PhLightning,
  PhMicrophone,
  PhMicrophoneSlash,
  PhX,
  PhArrowBendUpLeft,
  PhArrowsClockwise,
  PhArrowsLeftRight
} from '@phosphor-icons/vue';

const auth = useAuthStore();
const wpStore = useWhatsappStore();

const messageInput = ref('');
const selectedFile = ref(null);
const fileInputRef = ref(null);
const messagesEndRef = ref(null);
const searchTerm = ref('');
const chatSearchTerm = ref('');
const showSearch = ref(false);
const showChatMobile = ref(false);
const previewImage = ref(null);
const activeTab = ref('active'); // 'active', 'groups', 'pending', 'closed'
const isTyping = ref(false);
let typingTimeout = null;
const showChatMenu = ref(false);
const showNewChatDialog = ref(false);
const newChatForm = ref({ number: '', name: '' });
const showTransferDialog = ref(false);
const transferForm = ref({ atendenteId: '', departamentoId: '' });
const users = ref([]);
const departments = ref([]);

// Linkify implementation
const linkify = (text) => {
    if (!text) return '';
    // Escapar tags HTML básicas para evitar XSS simples antes de inserir nossos links
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return escaped.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" class="text-primary hover:underline break-all">${url}</a>`;
    });
};

const handlePaste = (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            const file = new File([blob], `pasted_image_${Date.now()}.png`, { type: blob.type });
            selectedFile.value = file;
        }
    }
};

const startNewChat = () => {
    if (!newChatForm.value.number) return;
    
    // Limpa o número (remove +, -, espaços)
    const cleanNumber = newChatForm.value.number.replace(/\D/g, '');
    const formattedId = `${cleanNumber}@c.us`;
    
    // Cria um chat temporário para abrir a janela
    const newChat = {
        id: formattedId,
        name: cleanNumber,
        messages: [],
        chatStatus: 'active',
        isGroup: false,
        profilePicUrl: null,
        clientId: wpStore.chats.find(c => c.clientId && c.clientId !== 'suporte_principal')?.clientId || wpStore.chats[0]?.clientId || null
    };
    
    selectChat(newChat);
    showNewChatDialog.value = false;
    newChatForm.value = { number: '', name: '' };
};

const sendTyping = (typing) => {
    if (!wpStore.activeChat || !wpStore.socket) return;
    wpStore.socket.emit('whatsapp_typing', {
        clientId: wpStore.activeChat.clientId,
        chatId: wpStore.activeChat.id,
        isTyping: typing
    });
};

watch(messageInput, (newVal) => {
    if (newVal.length > 0) {
        if (!isTyping.value) {
            isTyping.value = true;
            sendTyping(true);
        }
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isTyping.value = false;
            sendTyping(false);
        }, 3000);
    } else {
        isTyping.value = false;
        sendTyping(false);
    }
});

const quickReplies = [
    { id: 1, title: 'Saudação', text: 'Olá! Como posso te ajudar hoje? 😊' },
    { id: 2, title: 'Aguardar', text: 'Por favor, aguarde um momento enquanto verifico sua solicitação. ⏳' },
    { id: 3, title: 'Encerramento', text: 'Agradecemos o contato. Tenha um ótimo dia! 👋' },
    { id: 4, title: 'Menu', text: 'Por favor, digite o número da opção desejada:\n1️⃣ Suporte Técnico\n2️⃣ Comercial' }
];
const showQuickReplies = ref(false);

const selectQuickReply = (text) => {
    messageInput.value = text;
    showQuickReplies.value = false;
};

const isRecording = ref(false);
const audioRecorder = ref(null);
const audioChunks = ref([]);
const replyingTo = ref(null);

const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioRecorder.value = new MediaRecorder(stream);
        audioChunks.value = [];
        
        audioRecorder.value.ondataavailable = (e) => audioChunks.value.push(e.data);
        audioRecorder.value.onstop = async () => {
            const blob = new Blob(audioChunks.value, { type: 'audio/webm' });
            // Cria um arquivo para que o preview funcione e possa ser enviado
            const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
            selectedFile.value = file;
            isRecording.value = false;
            // Opcional: Auto-envio ou deixar para o usuário clicar em enviar
            // handleSendMessage(); 
        };
        
        audioRecorder.value.start();
        isRecording.value = true;
    } catch (err) {
        console.error("Erro ao acessar microfone:", err);
    }
};

const stopRecording = () => {
    if (audioRecorder.value && isRecording.value) {
        audioRecorder.value.stop();
        isRecording.value = false;
        audioRecorder.value.stream.getTracks().forEach(track => track.stop());
    }
};

const selectChat = async (chat) => {
    wpStore.setActiveChat(chat);
    showChatMobile.value = true;
    showChatMenu.value = false; // Fecha o menu ao trocar de chat
    replyingTo.value = null; // Limpa resposta ao trocar de chat
    if (chat.clientId) {
        await wpStore.fetchMessages(chat.clientId, chat.id);
    }
    await nextTick();
    scrollToBottom();
};

const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) selectedFile.value = file;
};

const handleSendMessage = async () => {
    if ((!messageInput.value.trim() && !selectedFile.value) || !wpStore.activeChat) return;

    // Resolve clientId válido (descarta 'suporte_principal' legado)
    let resolvedClientId = wpStore.activeChat.clientId;
    if (!resolvedClientId || resolvedClientId === 'suporte_principal') {
        try {
            const instRes = await apiFetch('/api/instances');
            const instances = await instRes.json();
            const connected = instances.find(i => i.status === 'connected');
            if (connected) resolvedClientId = connected.id;
        } catch (_) {}
    }

    const formData = new FormData();
    formData.append('number', wpStore.activeChat.id.split('@')[0]);
    formData.append('message', messageInput.value);

    if (resolvedClientId) {
        formData.append('clientId', resolvedClientId);
    }
    if (selectedFile.value) {
        formData.append('file', selectedFile.value);
    }
    if (replyingTo.value) {
        formData.append('quotedMessageId', replyingTo.value.whatsappId);
    }
    
    // Envia o nome e setor do agente logado
    if (auth.user) {
        formData.append('agentId', auth.user.id || '');
        formData.append('agentName', auth.user.nome || '');
        // Setor do chat ativo (se tiver)
        if (wpStore.activeChat.departamento?.nome) {
            formData.append('agentDept', wpStore.activeChat.departamento.nome);
        }
    }

    try {
        await apiFetch('/api/send-message', {
            method: 'POST',
            body: formData,
        });
        selectedFile.value = null;
        messageInput.value = '';
        replyingTo.value = null;
    } catch (error) {
        console.error('Falha ao enviar', error);
    }
};

const openTransferDialog = async () => {
    showChatMenu.value = false;
    // Carrega usuários e departamentos para o select
    const [u, d] = await Promise.all([
        apiFetch('/api/users').then(r => r.json()),
        apiFetch('/api/departments').then(r => r.json())
    ]);
    users.value = u;
    departments.value = d;
    transferForm.value = {
        atendenteId: wpStore.activeChat?.atendente?.id || '',
        departamentoId: wpStore.activeChat?.departamento?.id || ''
    };
    showTransferDialog.value = true;
};

const transferChat = async () => {
    if (!wpStore.activeChat) return;
    try {
        const res = await apiFetch(`/api/contacts/${encodeURIComponent(wpStore.activeChat.id)}/assign`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transferForm.value)
        });
        if (res.ok) {
            const updated = await res.json();
            wpStore.activeChat.atendente = updated.atendente;
            wpStore.activeChat.departamento = updated.departamento;
            wpStore.syncChats();
        }
    } catch (e) {
        console.error('Erro ao transferir:', e);
    }
    showTransferDialog.value = false;
};

const scrollToBottom = () => {
    nextTick(() => {
        messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' });
    });
};

watch(() => wpStore.activeChat?.messages?.length, scrollToBottom);
watch(() => wpStore.activeChat, scrollToBottom);

const filteredMessages = computed(() => {
    if (!wpStore.activeChat || !wpStore.activeChat.messages) return [];
    if (!chatSearchTerm.value.trim()) return wpStore.activeChat.messages;
    
    return wpStore.activeChat.messages.filter(msg => 
        (msg.body || msg.corpo || '').toLowerCase().includes(chatSearchTerm.value.toLowerCase())
    );
});

const filteredChats = () => {
    return wpStore.chats.filter(chat => {
        const matchesSearch = chat.name.toLowerCase().includes(searchTerm.value.toLowerCase()) || chat.id.includes(searchTerm.value);
        
        let matchesTab = false;
        if (activeTab.value === 'active') {
            matchesTab = !chat.isGroup && chat.chatStatus === 'active';
        } else if (activeTab.value === 'groups') {
            matchesTab = chat.isGroup;
        } else if (activeTab.value === 'pending') {
            matchesTab = !chat.isGroup && chat.chatStatus === 'pending';
        } else if (activeTab.value === 'closed') {
            matchesTab = chat.chatStatus === 'closed';
        }

        return matchesSearch && matchesTab;
    });
};

// Função unificada acima

const updateChatStatus = async (chatId, status) => {
    try {
        const res = await apiFetch(`/api/contacts/${encodeURIComponent(chatId)}/chat-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatStatus: status })
        });
        if (res.ok) {
            wpStore.syncChats();
            if (wpStore.activeChat?.id === chatId) {
                wpStore.activeChat.chatStatus = status;
            }
            if (status === 'active') {
                activeTab.value = 'active';
            }
            showChatMenu.value = false;
        }
    } catch (e) {
        console.error("Erro ao atualizar status do chat:", e);
    }
};

const onClickOutside = (e) => {
    if (showChatMenu.value && !e.target.closest('.relative')) {
        showChatMenu.value = false;
    }
};

onMounted(() => {
    wpStore.syncChats();
    window.addEventListener('click', onClickOutside);
});

import { onUnmounted } from 'vue';
onUnmounted(() => {
    window.removeEventListener('click', onClickOutside);
});
</script>

<template>
  <div class="flex h-screen w-full bg-bg-color overflow-hidden">
    <Sidebar active="chat" />

    <!-- Chat List Sidebar (Aura Inspired) -->
    <aside 
      class="w-full md:w-[320px] lg:w-[350px] bg-bg-color border-r border-surface-border flex flex-col z-10 shrink-0"
      :class="{ 'hidden md:flex': showChatMobile && wpStore.activeChat }"
    >
        <div class="px-6 py-6 flex flex-col gap-5">
            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-bold text-white tracking-tight italic uppercase">Chats<span class="text-primary">.</span></h2>
                <button 
                  @click="showNewChatDialog = true"
                  class="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors"
                  title="Nova Conversa"
                >
                    <PhPlus :size="20" weight="bold" />
                </button>
            </div>

            <!-- Modern Search -->
            <div class="p-input-icon-left w-full relative">
                <PhMagnifyingGlass :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <InputText 
                  v-model="searchTerm"
                  placeholder="Pesquisar..." 
                  class="w-full pl-12 h-11 bg-bg-secondary/50 border-surface-border rounded-xl text-sm"
                />
            </div>

            <!-- Custom Tabs (4 Tabs) -->
            <div class="flex p-1 bg-bg-secondary/50 rounded-xl border border-surface-border gap-1 overflow-x-auto custom-scroll-h no-scrollbar">
                <button 
                  @click="activeTab = 'active'"
                  class="flex-1 min-w-fit px-3 py-1.5 rounded-lg text-[10px] font-black uppercase italic tracking-tighter transition-all whitespace-nowrap"
                  :class="activeTab === 'active' ? 'bg-white/5 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'"
                >
                    Ativos
                </button>
                <button 
                  @click="activeTab = 'groups'"
                  class="flex-1 min-w-fit px-3 py-1.5 rounded-lg text-[10px] font-black uppercase italic tracking-tighter transition-all whitespace-nowrap"
                  :class="activeTab === 'groups' ? 'bg-white/5 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'"
                >
                    Grupos
                </button>
                <button 
                  @click="activeTab = 'pending'"
                  class="flex-1 min-w-fit px-3 py-1.5 rounded-lg text-[10px] font-black uppercase italic tracking-tighter transition-all whitespace-nowrap"
                  :class="activeTab === 'pending' ? 'bg-white/5 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'"
                >
                    Fila
                </button>
                <button 
                  @click="activeTab = 'closed'"
                  class="flex-1 min-w-fit px-3 py-1.5 rounded-lg text-[10px] font-black uppercase italic tracking-tighter transition-all whitespace-nowrap"
                  :class="activeTab === 'closed' ? 'bg-white/5 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'"
                >
                    Encerrados
                </button>
            </div>
        </div>

        <!-- Conversation Scroll Area -->
        <div class="flex-1 overflow-y-auto custom-scroll px-3">
          <div 
            v-for="chat in filteredChats()" 
            :key="chat.id" 
            @click="selectChat(chat)"
            class="group p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-4 relative mb-1"
            :class="wpStore.activeChat?.id === chat.id ? 'bg-white/5 shadow-sm' : 'hover:bg-white/[0.02]'"
          >
            <div class="relative shrink-0">
                <img v-if="chat.profilePicUrl" :src="chat.profilePicUrl" class="w-12 h-12 rounded-full object-cover border border-surface-border" />
                <div v-else class="w-12 h-12 rounded-full bg-surface-border flex items-center justify-center text-xl text-gray-400">👤</div>
                <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success rounded-full border-2 border-bg-color"></div>
            </div>
            
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-center mb-0.5">
                    <h4 class="font-bold text-sm text-white truncate max-w-[150px]">{{ chat.name }}</h4>
                    <span class="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                        {{ chat.timestamp ? format(new Date(chat.timestamp * 1000), 'HH:mm', { locale: ptBR }) : '' }}
                    </span>
                </div>
                <div class="flex justify-between items-center gap-2">
                    <p class="text-xs text-gray-500 truncate leading-relaxed">
                        {{ chat.lastMessage || 'Inicie uma conversa' }}
                    </p>
                    <div v-if="chat.unreadCount" class="bg-primary text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full shrink-0">
                        {{ chat.unreadCount }}
                    </div>
                </div>
                <!-- Info tags: setor / atendente / instância -->
                <div class="flex flex-wrap gap-1 mt-1.5">
                    <span v-if="chat.departamento?.nome" class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-primary/15 text-primary rounded-md">
                        {{ chat.departamento.nome }}
                    </span>
                    <span v-if="chat.atendente?.nome" class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-success/15 text-success rounded-md">
                        👤 {{ chat.atendente.nome }}
                    </span>
                    <span v-if="chat.instanceName" class="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-white/5 text-gray-500 rounded-md">
                        {{ chat.instanceName }}
                    </span>
                </div>
            </div>
          </div>
          <div v-if="filteredChats().length === 0" class="p-12 text-center flex flex-col items-center gap-4 opacity-30">
            <PhChatCircleText :size="48" weight="thin" />
            <p class="text-[10px] font-black uppercase tracking-[0.2em]">Sem conversas</p>
          </div>
        </div>
    </aside>

    <!-- Chat Area -->
    <main 
      class="flex-1 flex flex-col bg-bg-color relative"
      :class="{ 'hidden md:flex': !showChatMobile || !wpStore.activeChat, 'flex': showChatMobile && wpStore.activeChat }"
    >
        <template v-if="wpStore.activeChat">
            <!-- Header -->
            <header class="h-20 border-b border-surface-border flex items-center px-6 sm:px-10 justify-between shrink-0">
                <div class="flex items-center gap-4">
                    <button @click="showChatMobile = false" class="md:hidden p-2 text-gray-400 hover:text-white transition-colors">
                        <PhCaretLeft :size="24" weight="bold" />
                    </button>
                    <div class="relative">
                        <img v-if="wpStore.activeChat.profilePicUrl" :src="wpStore.activeChat.profilePicUrl" class="w-11 h-11 rounded-full object-cover border border-surface-border" />
                        <div v-else class="w-11 h-11 rounded-full bg-surface-border flex items-center justify-center text-xl text-gray-400">👤</div>
                    </div>
                    <div>
                        <h3 class="font-bold text-base text-white tracking-tight">{{ wpStore.activeChat.name }}</h3>
                        <p class="text-[10px] text-gray-500 font-medium">Online &bull; Atendimento Ativo</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button 
                        @click="showSearch = !showSearch"
                        class="p-2.5 rounded-xl transition-all"
                        :class="showSearch ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-gray-400'"
                    >
                        <PhMagnifyingGlass :size="20" />
                    </button>
                    
                    <!-- Botões de Ação de Status -->
                    <button 
                        v-if="wpStore.activeChat.chatStatus === 'pending'"
                        @click="updateChatStatus(wpStore.activeChat.id, 'active')"
                        class="px-4 py-2 bg-success/20 text-success rounded-xl text-[10px] font-black uppercase tracking-widest border border-success/30 hover:bg-success hover:text-white transition-all"
                    >
                        Aceitar
                    </button>

                    <button 
                        v-if="wpStore.activeChat.chatStatus === 'active'"
                        @click="updateChatStatus(wpStore.activeChat.id, 'closed')"
                        class="px-4 py-2 bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/30 hover:bg-primary hover:text-white transition-all"
                    >
                        Encerrar
                    </button>

                    <button 
                        v-if="wpStore.activeChat.chatStatus === 'closed'"
                        @click="updateChatStatus(wpStore.activeChat.id, 'active')"
                        class="px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500/30 hover:bg-indigo-500 hover:text-white transition-all"
                    >
                        Reabrir
                    </button>

                    <div class="relative">
                        <button 
                            @click="showChatMenu = !showChatMenu"
                            class="p-2.5 rounded-xl hover:bg-white/5 text-gray-400 transition-all flex items-center justify-center"
                        >
                            <PhDotsThreeVertical :size="20" weight="bold" />
                        </button>
                        <!-- Simple Dropdown Menu -->
                        <div v-if="showChatMenu" class="absolute right-0 top-full mt-2 w-52 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl p-2 z-[60]">
                             <button @click="updateChatStatus(wpStore.activeChat.id, 'active')" class="w-full text-left p-3 rounded-lg hover:bg-white/5 text-[10px] font-bold text-success uppercase tracking-wider flex items-center gap-2">
                                <PhCheckCircle :size="14" /> Aceitar Chat
                             </button>
                             <button @click="updateChatStatus(wpStore.activeChat.id, 'closed')" class="w-full text-left p-3 rounded-lg hover:bg-white/5 text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <PhX :size="14" /> Encerrar Chat
                             </button>
                             <div class="border-t border-white/5 my-1"></div>
                             <button @click="openTransferDialog" class="w-full text-left p-3 rounded-lg hover:bg-white/5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                <PhArrowsLeftRight :size="14" /> Transferir Chat
                             </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Inline Search Bar -->
            <div v-if="showSearch" class="px-10 py-4 bg-bg-secondary/30 border-b border-surface-border animate-in fade-in slide-in-from-top-2">
                <div class="relative max-w-md mx-auto">
                    <PhMagnifyingGlass :size="16" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <InputText 
                        v-model="chatSearchTerm"
                        placeholder="Pesquisar mensagens nesta conversa..." 
                        class="w-full pl-12 h-10 bg-black/40 border-surface-border rounded-xl text-xs"
                        @keyup.esc="showSearch = false"
                    />
                </div>
            </div>

            <!-- Scrollable Messages Window -->
            <div class="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col gap-8 custom-scroll bg-[rgba(255,255,255,0.01)]">
                <div 
                    v-for="(msg, index) in filteredMessages" 
                    :key="index"
                    class="flex w-full group/msg"
                    :class="msg.fromMe ? 'justify-end' : 'justify-start'"
                >
                    <div class="max-w-[75%] sm:max-w-[60%] flex items-end gap-3" :class="msg.fromMe ? 'flex-row-reverse' : 'flex-row'">
                        <div v-if="!msg.fromMe" class="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-surface-border hidden sm:block">
                             <img v-if="wpStore.activeChat.profilePicUrl" :src="wpStore.activeChat.profilePicUrl" class="w-full h-full object-cover" />
                             <div v-else class="w-full h-full bg-gray-800 flex items-center justify-center text-[10px]">👤</div>
                        </div>

                        <div class="flex flex-col gap-1" :class="msg.fromMe ? 'items-end' : 'items-start'">
                            <div 
                                class="p-4 sm:p-5 rounded-3xl text-sm relative transition-all shadow-sm"
                                :class="msg.fromMe 
                                  ? 'bg-[#1a1a24] text-white border border-white/10 rounded-br-sm' 
                                  : 'bg-[#111118] text-gray-300 border border-surface-border rounded-bl-sm'"
                            >
                                <!-- Media -->
                                <div v-if="msg.hasMedia" class="mb-4 rounded-2xl overflow-hidden border border-white/5 bg-black/20 min-h-[100px] flex items-center justify-center">
                                    <template v-if="msg.mediaData">
                                        <img 
                                            v-if="msg.mediaData.mimetype.startsWith('image/')" 
                                            :src="`data:${msg.mediaData.mimetype};base64,${msg.mediaData.data}`" 
                                            class="w-full max-h-[400px] object-cover cursor-zoom-in hover:brightness-110 transition-all" 
                                            @click="previewImage = `data:${msg.mediaData.mimetype};base64,${msg.mediaData.data}`"
                                        />
                                        <video v-else-if="msg.mediaData.mimetype.startsWith('video/')" controls class="w-full max-h-[400px]">
                                            <source :src="`data:${msg.mediaData.mimetype};base64,${msg.mediaData.data}`" :type="msg.mediaData.mimetype" />
                                        </video>
                                        <div v-else-if="msg.mediaData.mimetype.startsWith('audio/')" class="p-4 bg-black/40 w-full">
                                            <audio controls class="w-full h-8 brightness-110">
                                                <source :src="`data:${msg.mediaData.mimetype};base64,${msg.mediaData.data}`" :type="msg.mediaData.mimetype" />
                                            </audio>
                                        </div>
                                        <div v-else class="p-4 flex items-center gap-4 bg-white/5 w-full">
                                            <PhFiles :size="24" class="text-primary" />
                                            <div class="flex flex-col">
                                                <span class="text-xs font-bold text-white">{{ msg.mediaData.filename || 'Arquivo' }}</span>
                                                <span class="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Documento</span>
                                            </div>
                                        </div>
                                    </template>
                                    <div v-else class="p-10 flex flex-col items-center gap-2 opacity-40">
                                        <PhArrowsClockwise :size="24" class="animate-spin" />
                                        <span class="text-[8px] font-black uppercase tracking-widest text-center">Baixando Mídia...</span>
                                    </div>
                                </div>

                                <!-- Quoted Message -->
                                <div v-if="msg.quotedMsg" class="mb-3 p-3 bg-white/5 border-l-4 border-primary rounded-xl flex flex-col gap-1 opacity-80 scale-95 origin-top">
                                                            <span class="text-[10px] font-black text-primary uppercase tracking-widest">
                                                                {{ msg.quotedMsg.fromMe ? 'Eu' : (msg.quotedMsg.author || wpStore.activeChat.name) }}
                                                            </span>
                                                            <p class="text-xs text-gray-400 truncate italic">"{{ msg.quotedMsg.body || 'Mídia' }}"</p>
                                                        </div>

                                                        <p class="leading-relaxed text-[14px] font-medium whitespace-pre-wrap" v-html="linkify(msg.body || msg.corpo)"></p>

                                <!-- Reply Action Button -->
                                <button 
                                    @click="replyingTo = msg"
                                    class="absolute top-1/2 -translate-y-1/2 -left-12 opacity-0 group-hover/msg:opacity-100 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-gray-500 hover:text-white"
                                    :class="msg.fromMe ? '-left-12' : '-right-12'"
                                >
                                    <PhArrowBendUpLeft :size="16" />
                                </button>
                            </div>
                            <div class="flex items-center gap-2 px-1">
                                <span class="text-[9px] font-bold text-gray-600 uppercase">
                                    {{ msg.timestamp ? format(new Date(msg.timestamp * 1000), 'HH:mm', { locale: ptBR }) : 'Agora' }}
                                </span>
                                <PhCheckCircle v-if="msg.fromMe" :size="10" :weight="msg.ack > 1 ? 'fill' : 'regular'" class="text-primary" />
                            </div>
                        </div>
                    </div>
                </div>
                <div ref="messagesEndRef" class="h-4"></div>
            </div>

            <!-- Input Bar -->
            <div class="px-6 pb-8 shrink-0 border-t border-surface-border bg-bg-color">
                <div class="max-w-[1000px] mx-auto flex flex-col pt-6">
                    <!-- Reply Preview -->
                    <div v-if="replyingTo" class="mb-4 p-4 bg-white/5 border border-white/5 rounded-[1.5rem] flex flex-col gap-1 relative animate-in fade-in slide-in-from-bottom-2">
                        <button @click="replyingTo = null" class="absolute top-4 right-4 text-gray-500 hover:text-white"><PhX :size="14" /></button>
                        <span class="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                             <PhArrowBendUpLeft :size="12" /> Respondendo a {{ replyingTo.fromMe ? 'mim' : wpStore.activeChat.name }}
                        </span>
                        <p class="text-xs text-gray-500 truncate italic">"{{ replyingTo.body || 'Mídia' }}"</p>
                    </div>

                    <!-- File Preview (Added for Audio/Files review) -->
                    <div v-if="selectedFile" class="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-[1.5rem] flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                        <div class="flex items-center gap-3">
                            <PhPaperclip :size="18" class="text-primary" />
                            <div class="flex flex-col">
                                <span class="text-xs font-bold text-white">{{ selectedFile.name }}</span>
                                <span class="text-[10px] text-gray-500 uppercase tracking-widest">{{ selectedFile.type }}</span>
                            </div>
                        </div>
                        <button @click="selectedFile = null" class="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-all"><PhX :size="16" /></button>
                    </div>

                    <div class="relative flex items-center gap-4 bg-bg-secondary/40 border border-surface-border p-2 sm:p-3 rounded-2xl sm:rounded-[2rem]">
                        <input type="file" class="hidden" ref="fileInputRef" @change="handleFileChange" />
                        <button 
                            @click="fileInputRef.click()"
                            class="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl sm:rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 transition-all border border-white/5"
                        >
                            <PhPlus :size="20" weight="bold" />
                        </button>
                        
                        <input 
                            v-model="messageInput"
                            @keyup.enter="handleSendMessage"
                            @paste="handlePaste"
                            :disabled="isRecording"
                            :placeholder="isRecording ? 'Gravando áudio...' : 'Escreva sua mensagem...'"
                            class="flex-1 bg-transparent border-none text-sm font-medium text-white placeholder:text-gray-600 py-3 outline-none"
                        />

                        <!-- Quick Replies -->
                        <div v-if="showQuickReplies" class="absolute bottom-full mb-4 left-0 w-72 bg-[#111118] border border-surface-border rounded-2xl shadow-2xl p-2 z-50 animate-fade-in flex flex-col gap-1 max-h-64 overflow-y-auto custom-scroll">
                            <div class="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">Respostas Rápidas</div>
                            <button 
                                v-for="reply in quickReplies" 
                                :key="reply.id"
                                @click="selectQuickReply(reply.text)"
                                class="text-left w-full p-3 rounded-xl hover:bg-white/5 transition-all group flex flex-col gap-1"
                            >
                                <span class="text-sm font-bold text-white group-hover:text-primary transition-colors">{{ reply.title }}</span>
                                <span class="text-xs text-gray-500 truncate">{{ reply.text }}</span>
                            </button>
                        </div>

                        <div class="flex items-center gap-2 px-2">
                             <button @click="showQuickReplies = !showQuickReplies" class="p-2 text-gray-500 hover:text-primary transition-colors hidden sm:block"><PhLightning :size="22" /></button>
                             
                             <!-- Audio Recorder -->
                             <button 
                                v-if="!messageInput.trim() && !selectedFile"
                                @click="isRecording ? stopRecording() : startRecording()"
                                class="w-10 h-10 sm:w-11 sm:h-11 transition-all flex items-center justify-center rounded-xl sm:rounded-2xl border"
                                :class="isRecording ? 'bg-red-500 text-white border-red-400 animate-pulse' : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10'"
                             >
                                <PhMicrophone v-if="!isRecording" :size="20" />
                                <PhMicrophoneSlash v-else :size="20" weight="bold" />
                             </button>

                             <button 
                                v-else
                                @click="handleSendMessage"
                                class="w-10 h-10 sm:w-11 sm:h-11 bg-primary text-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                             >
                                <PhPaperPlaneRight :size="20" weight="fill" />
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <!-- Lightbox -->
        <div v-if="previewImage" class="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-10 animate-fade-in">
            <button @click="previewImage = null" class="absolute top-10 right-10 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all">
                <PhX :size="24" weight="bold" />
            </button>
            <img :src="previewImage" class="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        </div>

        <div v-if="!wpStore.activeChat" class="hidden md:flex flex-1 items-center justify-center flex-col p-10 bg-[rgba(255,255,255,0.01)]">
            <div class="text-center space-y-6 max-w-sm">
                <div class="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/5 shadow-2xl">
                    <PhChatCircleText :size="48" weight="fill" class="text-gray-700" />
                </div>
                <div>
                   <h2 class="text-2xl font-bold text-white tracking-tight uppercase italic">Atendimento Ativo</h2>
                   <p class="text-sm text-gray-500 font-medium leading-relaxed mt-2 px-8">Selecione uma conversa ao lado para iniciar o atendimento.</p>
                </div>
                <button 
                  @click="showNewChatDialog = true"
                  class="px-8 py-4 bg-primary text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all mx-auto"
                >
                    Nova Conversa
                </button>
            </div>
        </div>

        <!-- Transfer Dialog -->
        <Dialog v-model:visible="showTransferDialog" modal header="Transferir Conversa" :style="{ width: '420px' }" class="p-fluid">
            <div class="flex flex-col gap-5 py-4">
                <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Atendente Responsável</label>
                    <select v-model="transferForm.atendenteId" class="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white appearance-none">
                        <option value="">Nenhum (sem atendente)</option>
                        <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nome }}</option>
                    </select>
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Setor / Departamento</label>
                    <select v-model="transferForm.departamentoId" class="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-sm text-white appearance-none">
                        <option value="">Nenhum setor</option>
                        <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.nome }}</option>
                    </select>
                </div>
            </div>
            <template #footer>
                <div class="flex gap-3 pt-4">
                    <button @click="showTransferDialog = false" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-2xl transition-all">Cancelar</button>
                    <button @click="transferChat" class="flex-1 py-4 bg-indigo-600 text-xs font-bold text-white rounded-2xl shadow-lg hover:scale-[1.02] transition-all">Transferir</button>
                </div>
            </template>
        </Dialog>

        <!-- New Chat Dialog -->
        <Dialog v-model:visible="showNewChatDialog" modal header="Nova Conversa" :style="{ width: '400px' }" class="p-fluid">
            <div class="flex flex-col gap-6 py-4">
                <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Número do WhatsApp (com DDD)</label>
                    <InputText v-model="newChatForm.number" placeholder="5511999999999" class="bg-black/40 border-white/10 rounded-xl h-12" />
                </div>
            </div>
            <template #footer>
                <div class="flex gap-3 pt-4">
                    <button @click="showNewChatDialog = false" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-2xl transition-all">Cancelar</button>
                    <button @click="startNewChat" class="flex-1 py-4 bg-primary text-xs font-bold text-white rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">Iniciar Chat</button>
                </div>
            </template>
        </Dialog>
    </main>
  </div>
</template>

<style scoped>
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-track { background: transparent; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 10px; }
</style>
