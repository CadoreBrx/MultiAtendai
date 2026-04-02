const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeInMemoryStore, 
    jidNormalizedUser, 
    downloadContentFromMessage 
} = require('@whiskeysockets/baileys');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();
const pino = require('pino');

const clients = new Map();
const stores = new Map();
const clientTenantMap = new Map();
const lastQrMap = new Map();

async function initializeWhatsAppClient(clientId, io, empresaId) {
    if (clients.has(clientId)) return clients.get(clientId);

    if (empresaId) clientTenantMap.set(clientId, empresaId);

    const authFolder = path.join(__dirname, '..', '..', '.baileys_auth', clientId);
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`[${clientId}] Iniciando Baileys. Versão da web WA: ${version.join('.')}`);

    const store = makeInMemoryStore({ 
        logger: pino({ level: 'silent' }) 
    });
    const storePath = path.join(__dirname, '..', '..', '.baileys_auth', `${clientId}_store.json`);
    store.readFromFile(storePath);
    setInterval(() => {
        try { store.writeToFile(storePath); } catch(err) {} 
    }, 10_000);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        syncFullHistory: false, // Menos RAM para SaaS
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: true,
    });

    store.bind(sock.ev);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[${clientId}] QR CODE GERADO`);
            lastQrMap.set(clientId, qr);
            io.emit('whatsapp_qr', { clientId, qr });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.error(`[${clientId}] CONEXÃO FECHADA. Reconectar: ${shouldReconnect}`);
            
            clients.delete(clientId);
            stores.delete(clientId);
            
            if (shouldReconnect) {
                setTimeout(() => initializeWhatsAppClient(clientId, io, clientTenantMap.get(clientId)), 5000);
            } else {
                console.warn(`[${clientId}] DESCONECTADO (LOGGED OUT)`);
                fs.rmSync(authFolder, { recursive: true, force: true });
                clientTenantMap.delete(clientId);
                lastQrMap.delete(clientId);
                io.emit('whatsapp_disconnected', { clientId, reason: 'logged_out' });
                try {
                    await prisma.instance.updateMany({
                        where: { clientId },
                        data: { status: 'disconnected', number: '' }
                    });
                } catch(e) {}
            }
        } 
        
        if (connection === 'open') {
            console.log(`[${clientId}] CLIENTE WHATSAPP PRONTO (Baileys)!`);
            lastQrMap.delete(clientId);
            
            const number = jidNormalizedUser(sock.user.id).split('@')[0];
            try {
                await prisma.instance.updateMany({
                    where: { clientId },
                    data: { number, status: 'connected' }
                });
            } catch (e) {
                console.error(`[${clientId}] Erro ao atualizar status:`, e);
            }

            io.emit('whatsapp_ready', { clientId, message: 'Conectado e pronto para uso!' });
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

            const fromMe = msg.key.fromMe;
            // No whatsapp-web.js formatamos como numero@c.us, no Baileys numero@s.whatsapp.net
            const jid = msg.key.remoteJid;
            const isGroup = jid.endsWith('@g.us');
            const author = isGroup ? (msg.key.participant || jid) : jid;
            
            // Resolve Content (Text)
            let body = msg.message.conversation 
                || msg.message.extendedTextMessage?.text 
                || msg.message.imageMessage?.caption
                || msg.message.videoMessage?.caption
                || '';

            let hasMedia = !!(msg.message.imageMessage || msg.message.videoMessage || msg.message.audioMessage || msg.message.documentMessage);
            
            // Tenta achar o Tenant
            let empresaId = clientTenantMap.get(clientId);
            if (!empresaId) {
                const inst = await prisma.instance.findFirst({ where: { clientId } });
                if (inst) {
                    clientTenantMap.set(clientId, inst.empresaId);
                    empresaId = inst.empresaId;
                } else {
                    return;
                }
            }

            // 1. Lógica do Chatbot Dinâmica (scoped por empresa)
            if (!fromMe && !isGroup) {
                const lowerBody = body.toLowerCase().trim();
                const configs = await prisma.configuracao.findMany({ where: { empresaId } });
                const welcomeMsg = configs.find(c => c.chave === 'welcomeMessage')?.valor || 'Olá! Bem-vindo(a) 🚀';
                const departments = await prisma.departamento.findMany({ 
                    where: { empresaId },
                    orderBy: { ordem: 'asc' } 
                });

                const triggers = ['oi', 'olá', 'boa tarde', 'bom dia', 'boa noite', 'menu', 'bot'];
                if (triggers.includes(lowerBody)) {
                    let menu = `${welcomeMsg}\n\nDigite o número do setor:\n`;
                    departments.forEach(d => { menu += `\n${d.ordem}️⃣ *${d.nome}*`; });
                    await sock.sendMessage(jid, { text: menu });
                    // Continue as persisting message is done after
                } 

                const selectedDept = departments.find(d => String(d.ordem) === lowerBody);
                if (selectedDept) {
                    await sock.sendMessage(jid, { text: `Você escolheu *${selectedDept.nome}*.\n${selectedDept.descricao || 'Um atendente falará com você em breve!'}` });
                }
            }

            // 2. Dados do contato (Busca na store local)
            const chatName = store.contacts[author]?.name 
                            || store.contacts[author]?.notify 
                            || author.split('@')[0];
            
            let profilePicUrl = null;
            try {
                profilePicUrl = await sock.profilePictureUrl(author, 'image');
            } catch (e) {}

            // 3. Captura mídia simplificado (sem baixar os buffers gigantes pra economizar IO se não precisar via sockets)
            let mediaData = null;
            if (hasMedia) {
                // Em Baileys seria necessário baixar via stream
                mediaData = { mimetype: 'unknown', data: '', filename: 'Midia Recebida' };
            }
            
            console.log(`[${clientId}] MENSAGEM de ${chatName} (${jid}):`, body);
            
            // 4. Persistência
            try {
                const numero = jid; 
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
                    where: { whatsappId: msg.key.id },
                    update: {},
                    create: {
                        whatsappId: msg.key.id,
                        corpo: body,
                        fromMe,
                        hasMedia,
                        timestamp: msg.messageTimestamp,
                        contatoId: contato.id,
                        empresaId
                    }
                });
            } catch (err) {}

            io.emit('whatsapp_message', {
                clientId,
                id: msg.key.id,
                from: jid,
                to: fromMe ? jid : (sock.user?.id || ''),
                body,
                timestamp: msg.messageTimestamp,
                hasMedia,
                mediaData, 
                fromMe,
                profilePicUrl, 
                contactName: chatName,
                isGroup,
                author
            });
        }
    });

    clients.set(clientId, sock);
    stores.set(clientId, store);
    return sock;
}

function getClient(clientId) {
    return clients.get(clientId);
}

function getStore(clientId) {
    return stores.get(clientId);
}

function getAllClientsStatus() {
    const statusList = [];
    for (const [id, sock] of clients.entries()) {
        let state = sock?.user ? 'connected' : 'disconnected';
        statusList.push({
            id,
            status: state,
            number: sock?.user ? jidNormalizedUser(sock.user.id).split('@')[0] : 'Aguardando'
        });
    }
    return statusList;
}

async function deleteClient(clientId) {
    const sock = clients.get(clientId);
    if (sock) {
        try { sock.logout(); } catch(e) {}
        clients.delete(clientId);
        stores.delete(clientId);
        clientTenantMap.delete(clientId);
        lastQrMap.delete(clientId);
        const authFolder = path.join(__dirname, '..', '..', '.baileys_auth', clientId);
        fs.rmSync(authFolder, { recursive: true, force: true });
    }
}

function getLastQr(clientId) {
    return lastQrMap.get(clientId) || null;
}

module.exports = { initializeWhatsAppClient, getClient, getStore, getAllClientsStatus, deleteClient, getLastQr };
