const { Client, LocalAuth } = require('whatsapp-web.js');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

// Detecta o Chrome instalado no sistema (evita depender do Puppeteer bundled)
function findChrome() {
    const candidates = [
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
    ];
    return candidates.find(p => fs.existsSync(p)) || null;
}

const clients = new Map();
// Mapa clientId -> empresaId para saber de qual tenant é cada instância
const clientTenantMap = new Map();
// Último QR gerado por instância (para reenviar ao reconectar)
const lastQrMap = new Map();

function initializeWhatsAppClient(clientId, io, empresaId) {
    if (clients.has(clientId)) return clients.get(clientId);

    // Salva o mapeamento tenant
    if (empresaId) {
        clientTenantMap.set(clientId, empresaId);
    }

    const chromePath = findChrome();
    if (chromePath) {
        console.log(`[${clientId}] Usando Chrome do sistema: ${chromePath}`);
    } else {
        console.warn(`[${clientId}] Chrome do sistema não encontrado — usando Puppeteer bundled.`);
    }

    const puppeteerConfig = {
        protocolTimeout: 120000,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--js-flags=--max-old-space-size=512'
        ]
    };
    if (chromePath) puppeteerConfig.executablePath = chromePath;

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: clientId }),
        puppeteer: puppeteerConfig,
        qrMaxRetries: 5
    });

    client.on('qr', (qr) => {
        console.log(`[${clientId}] QR CODE GERADO`);
        lastQrMap.set(clientId, qr);
        io.emit('whatsapp_qr', { clientId, qr });
    });

    client.on('ready', async () => {
        console.log(`[${clientId}] CLIENTE WHATSAPP PRONTO!`);
        lastQrMap.delete(clientId);

        // Atualiza número no banco
        try {
            const number = client.info?.wid?.user || '';
            await prisma.instance.updateMany({
                where: { clientId },
                data: { number, status: 'connected' }
            });
        } catch (e) {
            console.error(`[${clientId}] Erro ao atualizar status no banco:`, e);
        }

        io.emit('whatsapp_ready', { clientId, message: 'Conectado e pronto para uso!' });
    });

    client.on('authenticated', () => {
        console.log(`[${clientId}] AUTENTICADO COM SUCESSO`);
        io.emit('whatsapp_authenticated', { clientId, message: 'Sessão autenticada.' });
    });

    client.on('auth_failure', msg => {
        console.error(`[${clientId}] FALHA NA AUTENTICAÇÃO`, msg);
        lastQrMap.delete(clientId);
        io.emit('whatsapp_auth_failure', { clientId, error: msg });
    });

    client.on('disconnected', (reason) => {
        console.warn(`[${clientId}] DESCONECTADO — motivo: ${reason}`);
        lastQrMap.delete(clientId);
        clients.delete(clientId);
        clientTenantMap.delete(clientId);
        io.emit('whatsapp_disconnected', { clientId, reason });
    });

    const handleMessage = async (msg) => {
        if (msg.from === 'status@broadcast') return;
        
        // Resolve o empresaId deste client
        const tenantId = clientTenantMap.get(clientId);
        if (!tenantId) {
            // Tenta buscar do banco
            const inst = await prisma.instance.findFirst({ where: { clientId } });
            if (inst) {
                clientTenantMap.set(clientId, inst.empresaId);
            } else {
                console.error(`[${clientId}] Sem tenant associado, ignorando mensagem.`);
                return;
            }
        }
        const empresaId = clientTenantMap.get(clientId);

        // 1. Lógica do Chatbot Dinâmica (scoped por empresa)
        if (!msg.fromMe && !msg.from.includes('@g.us')) {
            const body = msg.body.trim();
            const lowerBody = body.toLowerCase();
            
            const configs = await prisma.configuracao.findMany({
                where: { empresaId }
            });
            const welcomeMsg = configs.find(c => c.chave === 'welcomeMessage')?.valor || 'Olá! Bem-vindo à nossa central de atendimento. 🚀';
            const departments = await prisma.departamento.findMany({ 
                where: { empresaId },
                orderBy: { ordem: 'asc' } 
            });

            const triggers = ['oi', 'olá', 'boa tarde', 'bom dia', 'boa noite', 'menu', 'bot'];
            if (triggers.includes(lowerBody)) {
                let menu = `${welcomeMsg}\n\nDigite o número do setor:\n`;
                departments.forEach(d => {
                    menu += `\n${d.ordem}️⃣ *${d.nome}*`;
                });
                await client.sendMessage(msg.from, menu);
                return;
            } 

            const selectedDept = departments.find(d => String(d.ordem) === body);
            if (selectedDept) {
                await client.sendMessage(msg.from, `Você escolheu *${selectedDept.nome}*.\n${selectedDept.descricao || 'Um atendente falará com você em breve!'}`);
                return;
            }
        }

        // 2. Captura dados do contato
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
                const chatContact = await chat.getContact();
                const groupPic = await chatContact.getProfilePicUrl();
                if (groupPic) profilePicUrl = groupPic;
            } else {
                chatName = contact.pushname || contact.name || chat.name || msg.from.split('@')[0];
            }
        } catch (e) {
            chatName = msg.from.split('@')[0];
        }

        // 3. Captura mídia
        let mediaData = null;
        if (msg.hasMedia) {
            try {
                const media = await msg.downloadMedia();
                if (media) {
                    mediaData = {
                        mimetype: media.mimetype,
                        data: media.data,
                        filename: media.filename
                    };
                }
            } catch (e) {
                console.error("Erro ao baixar mídia:", e);
            }
        }
        
        console.log(`[${clientId}] MENSAGEM de ${chatName}:`, msg.body);
        
        // 4. Persistência no Banco — scoped por empresa
        try {
            const numero = msg.from;
            const contato = await prisma.contato.upsert({
                where: { empresaId_numero: { empresaId, numero } },
                update: { nome: chatName, fotoPerfil: profilePicUrl },
                create: { 
                    numero, 
                    nome: chatName, 
                    fotoPerfil: profilePicUrl,
                    status: 'lead',
                    empresaId
                }
            });

            await prisma.mensagem.upsert({
                where: { whatsappId: msg.id.id },
                update: {},
                create: {
                    whatsappId: msg.id.id,
                    corpo: msg.body,
                    fromMe: msg.fromMe,
                    hasMedia: msg.hasMedia,
                    timestamp: msg.timestamp,
                    contatoId: contato.id,
                    empresaId
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

    client.on('message_create', handleMessage);

    client.initialize().catch(err => {
        console.error(`[${clientId}] ERRO AO INICIALIZAR (Puppeteer):`, err.message || err);
        clients.delete(clientId);
        clientTenantMap.delete(clientId);
        lastQrMap.delete(clientId);
        io.emit('whatsapp_error', { clientId, error: err.message || 'Falha ao inicializar o cliente WhatsApp.' });
    });
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
        clientTenantMap.delete(clientId);
        lastQrMap.delete(clientId);
    }
}

function getLastQr(clientId) {
    return lastQrMap.get(clientId) || null;
}

module.exports = { initializeWhatsAppClient, getClient, getAllClientsStatus, deleteClient, getLastQr };
