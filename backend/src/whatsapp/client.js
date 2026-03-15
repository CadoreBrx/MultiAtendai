const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const settingsFile = path.join(__dirname, '../../data/settings.json');

const clients = new Map();

function initializeWhatsAppClient(clientId, io) {
    if (clients.has(clientId)) return clients.get(clientId);

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: clientId }),
        puppeteer: {
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-extensions'
            ]
        },
        qrMaxRetries: 3
    });

    client.on('qr', (qr) => {
        console.log(`[${clientId}] QR CODE GERADO`);
        // Emite o QR Code para o Frontend exibir, incluindo o ID da instancia
        io.emit('whatsapp_qr', { clientId, qr });
    });

    client.on('ready', () => {
        console.log(`[${clientId}] CLIENTE WHATSAPP PRONTO!`);
        io.emit('whatsapp_ready', { clientId, message: 'Conectado e pronto para uso!' });
    });

    client.on('authenticated', () => {
        console.log(`[${clientId}] AUTENTICADO COM SUCESSO`);
        io.emit('whatsapp_authenticated', { clientId, message: 'Sessão autenticada.' });
    });

    client.on('auth_failure', msg => {
        console.error(`[${clientId}] FALHA NA AUTENTICAÇÃO`, msg);
        io.emit('whatsapp_auth_failure', { clientId, error: msg });
    });

    const handleMessage = async (msg) => {
        if (msg.from === 'status@broadcast') return;
        
        // 1. Lógica do Chatbot Dinâmica
        if (!msg.fromMe && !msg.from.includes('@g.us')) {
            const body = msg.body.trim();
            const lowerBody = body.toLowerCase();
            
            // Busca configurações e departamentos no banco
            const configs = await prisma.configuracao.findMany();
            const welcomeMsg = configs.find(c => c.chave === 'welcomeMessage')?.valor || 'Olá! Bem-vindo à nossa central de atendimento. 🚀';
            const departments = await prisma.departamento.findMany({ orderBy: { ordem: 'asc' } });

            // Trigger do Menu
            const triggers = ['oi', 'olá', 'boa tarde', 'bom dia', 'boa noite', 'menu', 'bot'];
            if (triggers.includes(lowerBody)) {
                let menu = `${welcomeMsg}\n\nDigite o número do setor:\n`;
                departments.forEach(d => {
                    menu += `\n${d.ordem}️⃣ *${d.nome}*`;
                });
                await client.sendMessage(msg.from, menu);
                return;
            } 

            // Validação de Escolha de Setor
            const selectedDept = departments.find(d => String(d.ordem) === body);
            if (selectedDept) {
                await client.sendMessage(msg.from, `Você escolheu *${selectedDept.nome}*.\n${selectedDept.descricao || 'Um atendente falará com você em breve!'}`);
                // Opcional: Aqui você pode atribuir o contato a um setor no banco se quiser
                return;
            }
        }

        // 2. Captura de Dados do Contato e Grupo (Nome e Foto)
        let profilePicUrl = null;
        let contactName = null;
        let chatName = null;
        let isGroup = msg.from.includes('@g.us') || msg.to.includes('@g.us');

        try {
            const contact = await msg.getContact();
            try {
                profilePicUrl = await client.getProfilePicUrl(msg.from);
            } catch (pErr) {}
            
            const chat = await msg.getChat();
            
            if (isGroup) {
                chatName = chat.name || msg.from.split('@')[0];
                // Em grupos, a foto principal que queremos no front é a do grupo
                const chatContact = await chat.getContact();
                const groupPic = await chatContact.getProfilePicUrl();
                if (groupPic) profilePicUrl = groupPic;
            } else {
                // Lógica sugerida pelo usuário: pushname é o nome real que a pessoa configurou
                chatName = contact.pushname || contact.name || chat.name || msg.from.split('@')[0];
            }
        } catch (e) {
            chatName = msg.from.split('@')[0];
        }

        // 3. Captura e Download de Mídia Recebida
        let mediaData = null;
        if (msg.hasMedia) {
            try {
                const media = await msg.downloadMedia();
                if (media) {
                    mediaData = {
                        mimetype: media.mimetype,
                        data: media.data, // base64
                        filename: media.filename
                    };
                }
            } catch (e) {
                console.error("Erro ao baixar mídia:", e);
            }
        }
        
        console.log(`[${clientId}] MENSAGEM de ${chatName}:`, msg.body);
        
        // 4. Persistência no Banco de Dados
        try {
            const numero = msg.from;
            const contato = await prisma.contato.upsert({
                where: { numero },
                update: { nome: chatName, fotoPerfil: profilePicUrl },
                create: { 
                    numero, 
                    nome: chatName, 
                    fotoPerfil: profilePicUrl,
                    status: 'lead'
                }
            });

            await prisma.mensagem.upsert({
                where: { whatsappId: msg.id.id },
                update: {}, // Já existe, não faz nada
                create: {
                    whatsappId: msg.id.id,
                    corpo: msg.body,
                    fromMe: msg.fromMe,
                    hasMedia: msg.hasMedia,
                    timestamp: msg.timestamp,
                    contatoId: contato.id
                }
            });
        } catch (dbError) {
            console.error("Erro ao salvar no banco:", dbError);
        }

        io.emit('whatsapp_message', {
            clientId,
            id: msg.id.id,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            timestamp: msg.timestamp,
            hasMedia: msg.hasMedia,
            mediaData, 
            fromMe: msg.fromMe,
            profilePicUrl, 
            contactName: chatName,
            isGroup,
            author: msg.author 
        });
    };

    client.on('message_create', handleMessage); // Captura TODAS as mensagens (recebidas e enviadas po você)

    client.initialize();
    clients.set(clientId, client);
    return client;
}

function getClient(clientId) {
    return clients.get(clientId);
}

function getAllClientsStatus() {
    const statusList = [];
    for (const [id, client] of clients.entries()) {
        let state = 'disconnected';
        if (client.info) {
             state = 'connected';
        }
        statusList.push({
            id,
            status: state,
            number: client.info ? client.info.wid.user : 'Aguardando'
        });
    }
    return statusList;
}

async function deleteClient(clientId) {
    const client = clients.get(clientId);
    if (client) {
        try {
            await client.destroy();
        } catch (e) {
            console.error(`Erro ao destruir cliente ${clientId}`, e);
        }
        clients.delete(clientId);
    }
}

module.exports = { initializeWhatsAppClient, getClient, getAllClientsStatus, deleteClient };
