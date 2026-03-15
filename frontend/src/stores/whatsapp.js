import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { io } from 'socket.io-client';

export const useWhatsappStore = defineStore('whatsapp', () => {
    const safeParse = (key, fallback) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (e) {
            console.error(`Whatsapp store: Erro ao parsear ${key}`, e);
            localStorage.removeItem(key);
            return fallback;
        }
    };

    const chats = ref(safeParse('chats', []));
    const activeChat = ref(safeParse('activeChat', null));
    const socket = io('http://206.183.129.197:3000');

    watch(chats, (newChats) => {
        // Otimização: Não salvar o histórico completo de mensagens no LocalStorage
        // para evitar QuotaExceededError. Salvamos apenas os metadados do chat.
        const previewChats = newChats.map(c => {
            const { messages, ...metadata } = c;
            return metadata;
        });
        localStorage.setItem('chats', JSON.stringify(previewChats));
    }, { deep: true });

    watch(activeChat, (newActive) => {
        if (newActive) {
            const { messages, ...metadata } = newActive;
            localStorage.setItem('activeChat', JSON.stringify(metadata));
        } else {
            localStorage.setItem('activeChat', null);
        }
    });

    socket.on('whatsapp_message', (msg) => {
        const chatId = msg.fromMe ? msg.to : msg.from;
        const newChats = [...chats.value];
        const existingChatIndex = newChats.findIndex(c => c.id === chatId);

        if (existingChatIndex >= 0) {
            const chat = { ...newChats[existingChatIndex] };
            if (!chat.messages.some(m => m.id === msg.id)) {
                chat.messages = [...chat.messages, msg];
                chat.lastMessage = msg.body || (msg.hasMedia ? '📷 Mídia' : '');
                chat.timestamp = msg.timestamp;
                if (msg.profilePicUrl) chat.profilePicUrl = msg.profilePicUrl;
                chat.name = msg.contactName;
                if (msg.isGroup !== undefined) chat.isGroup = msg.isGroup;
                chat.clientId = msg.clientId;
            }
            newChats.splice(existingChatIndex, 1);
            newChats.unshift(chat);
        } else {
            newChats.unshift({
                id: chatId,
                name: msg.contactName || chatId.split('@')[0],
                lastMessage: msg.body || (msg.hasMedia ? '📷 Mídia' : ''),
                timestamp: msg.timestamp,
                profilePicUrl: msg.profilePicUrl || null,
                isGroup: msg.isGroup || false,
                clientId: msg.clientId,
                messages: [msg]
            });
        }
        chats.value = newChats;

        // Atualiza chat ativo se for a mesma conversa
        if (activeChat.value && activeChat.value.id === chatId) {
            activeChat.value = newChats[0];
        }
    });

    const setActiveChat = (chat) => {
        activeChat.value = chat;
    };

    const syncChats = async (clientId) => {
        try {
            let targetId = clientId;
            
            // Se não passou ID ou deu erro antes, tenta descobrir um conectado
            if (!targetId || targetId === 'suporte_principal') {
                const instRes = await fetch('http://206.183.129.197:3000/api/instances');
                const instances = await instRes.json();
                const connected = instances.find(i => i.status === 'connected');
                if (connected) {
                    targetId = connected.id;
                } else if (!targetId) {
                    return; // Nenhuma instancia conectada para sincronizar
                }
            }

            const response = await fetch(`http://206.183.129.197:3000/api/instances/${targetId}/chats`);
            if (!response.ok) throw new Error('Falha ao sincronizar');
            const data = await response.json();
            
            // Mantém as mensagens locais se já existirem para não perder o histórico da sessão
            const syncedChats = data.map(newChat => {
                const existing = chats.value.find(c => c.id === newChat.id);
                return {
                    ...newChat,
                    messages: existing ? existing.messages : (newChat.messages || [])
                };
            });
            chats.value = syncedChats;
        } catch (e) {
            console.error("Erro no syncChats store:", e);
        }
    };

    const fetchMessages = async (clientId, chatId) => {
        try {
            const response = await fetch(`http://206.183.129.197:3000/api/instances/${clientId}/chats/${chatId}/messages`);
            if (!response.ok) throw new Error('Falha ao buscar mensagens');
            const data = await response.json();
            
            const chatIndex = chats.value.findIndex(c => c.id === chatId);
            if (chatIndex >= 0) {
                chats.value[chatIndex].messages = data;
                // Se for o chat ativo, atualiza ele também
                if (activeChat.value && activeChat.value.id === chatId) {
                    activeChat.value = { ...chats.value[chatIndex] };
                }
            }
        } catch (e) {
            console.error("Erro no fetchMessages store:", e);
        }
    };

    return { chats, activeChat, setActiveChat, syncChats, fetchMessages, socket };
});
