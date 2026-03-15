const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const multer = require('multer');
const { MessageMedia } = require('whatsapp-web.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { initializeWhatsAppClient, getClient, getAllClientsStatus, deleteClient } = require('./whatsapp/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const upload = multer({ storage: multer.memoryStorage() });

const instancesFile = path.join(__dirname, '../data/instances.json');
const settingsFile = path.join(__dirname, '../data/settings.json');
const deptsFile = path.join(__dirname, '../data/departments.json');

function loadJSON(file) {
    try {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8').trim();
            return content ? JSON.parse(content) : null;
        }
    } catch (error) {
        console.error(`Erro ao carregar arquivo ${file}:`, error);
    }
    return null;
}

function saveJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadInstances() { return loadJSON(instancesFile) || []; }
function saveInstances(instances) { saveJSON(instancesFile, instances); }

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // For development
        methods: ['GET', 'POST']
    }
});

// Inicializa instâncias salvas no arquivo
const savedInstances = loadInstances();
savedInstances.forEach(inst => {
    initializeWhatsAppClient(inst.id, io);
});

io.on('connection', (socket) => {
    console.log('Cliente socket conectado:', socket.id);
    
    socket.on('whatsapp_initialize', (data) => {
        const { clientId } = data;
        console.log(`Solicitação de inicialização para: ${clientId}`);
        initializeWhatsAppClient(clientId, io);
    });
    socket.on('whatsapp_typing', async (data) => {
        const { clientId, chatId, isTyping } = data;
        const client = getClient(clientId);
        if (client) {
            try {
                const chat = await client.getChatById(chatId);
                if (isTyping) {
                    await chat.sendStateTyping();
                } else {
                    await chat.clearState();
                }
            } catch (e) {
                // Silencioso se der erro de chat não encontrado
            }
        }
    });
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'API is running' });
});

app.get('/api/instances', (req, res) => {
    const memoryStatus = getAllClientsStatus();
    const saved = loadInstances();
    
    // Merge status on top of saved instances
    const result = saved.map(inst => {
        const runtime = memoryStatus.find(m => m.id === inst.id);
        return {
            ...inst,
            status: runtime ? runtime.status : 'disconnected',
            number: runtime && runtime.number !== 'Aguardando' ? runtime.number : inst.number
        };
    });
    
    res.json(result);
});

app.post('/api/instances', (req, res) => {
    const { id, name } = req.body;
    if (!id) return res.status(400).json({ error: 'ID da instancia obrigatorio' });
    
    const instances = loadInstances();
    if (!instances.find(i => i.id === id)) {
        instances.push({ id, name: name || id, number: '' });
        saveInstances(instances);
    }

    initializeWhatsAppClient(id, io);
    res.json({ success: true, message: `Instancia ${id} inicializada` });
});

app.delete('/api/instances/:id', async (req, res) => {
    const { id } = req.params;
    const instances = loadInstances();
    const filtered = instances.filter(i => i.id !== id);
    saveInstances(filtered);
    
    const client = getClient(id);
    if (client) {
         await deleteClient(id);
    }
    
    res.json({ success: true, message: `Instância ${id} removida.` });
});

// --- Dashboard Stats ---
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const [msgCount, contactCount, agendamentoCount] = await Promise.all([
            prisma.mensagem.count(),
            prisma.contato.count(),
            prisma.agendamento.count({
                where: {
                    dataHora: {
                        gte: new Date(new Date().setHours(0,0,0,0)),
                        lt: new Date(new Date().setHours(23,59,59,999))
                    }
                }
            })
        ]);
        res.json({ msgCount, contactCount, agendamentoCount });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// --- Settings & Departments Routes ---
app.get('/api/settings', async (req, res) => {
    try {
        const configs = await prisma.configuracao.findMany();
        const settings = {};
        configs.forEach(c => settings[c.chave] = c.valor);
        
        // Fallback se estiver vazio
        if (!settings.welcomeMessage) settings.welcomeMessage = 'Olá! Como posso ajudar?';
        
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        const settings = req.body;
        for (const [chave, valor] of Object.entries(settings)) {
            await prisma.configuracao.upsert({
                where: { chave },
                update: { valor: String(valor) },
                create: { chave, valor: String(valor) }
            });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

app.get('/api/departments', async (req, res) => {
    try {
        const depts = await prisma.departamento.findMany({
            include: { agents: true },
            orderBy: { ordem: 'asc' }
        });
        res.json(depts);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar departamentos' });
    }
});

app.post('/api/departments', async (req, res) => {
    try {
        const { nome, descricao, cor, ordem } = req.body;
        const dept = await prisma.departamento.create({
            data: { nome, descricao, cor, ordem: parseInt(ordem) || 0 }
        });
        res.json(dept);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar departamento' });
    }
});

app.patch('/api/departments/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, cor, ordem } = req.body;
    try {
        const dept = await prisma.departamento.update({
            where: { id },
            data: { nome, descricao, cor, ordem: parseInt(ordem) || 0 }
        });
        res.json(dept);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar departamento' });
    }
});

app.delete('/api/departments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.departamento.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir departamento' });
    }
});

app.get('/api/instances/:id/chats', async (req, res) => {
    const { id } = req.params;
    const client = getClient(id);
    
    if (!client) {
        return res.status(404).json({ error: 'Instância não encontrada ou não conectada' });
    }

    try {
        const chats = await client.getChats();
        // Pegaremos apenas os últimos 50 chats para não sobrecarregar no primeiro carregamento
        const activeChats = chats.slice(0, 50);
        
        console.log(`[${id}] Sincronizando ${activeChats.length} chats...`);
        
        const formattedChats = [];
        for (const c of activeChats) {
            let profilePicUrl = null;
            let contactName = c.name;

            try {
                // Captura contato e foto de forma segura
                const contact = await c.getContact();
                
                // Tenta pegar a foto de forma direta via client (mais robusto)
                try {
                    profilePicUrl = await client.getProfilePicUrl(c.id._serialized);
                    if (profilePicUrl) {
                        console.log(`[${id}] Foto encontrada para ${contactName}: ${profilePicUrl.substring(0, 50)}...`);
                    } else {
                        console.log(`[${id}] Sem foto para ${contactName} (privacidade ou ausente)`);
                    }
                } catch (picErr) {
                    console.log(`[${id}] Erro ao buscar foto de ${contactName}: ${picErr.message}`);
                }

                // Lógica de nome: pushname > agenda > nome do chat > número
                if (c.isGroup) {
                    contactName = c.name || c.id.user;
                } else {
                    contactName = contact.pushname || contact.name || c.name || c.id.user;
                }
            } catch (e) {
                console.error(`[${id}] Erro ao processar detalhes de ${c.id._serialized}:`, e.message);
                contactName = c.name || c.id.user;
            }

            // Busca status no banco, incluindo atendente e setor
            const dbContact = await prisma.contato.findUnique({
                where: { numero: c.id._serialized },
                include: {
                    atendente: { select: { id: true, nome: true } },
                    departamento: { select: { id: true, nome: true } }
                }
            });

            formattedChats.push({
                id: c.id._serialized,
                name: contactName,
                lastMessage: c.lastMessage ? c.lastMessage.body : '',
                timestamp: c.timestamp,
                unreadCount: c.unreadCount,
                isGroup: c.isGroup,
                profilePicUrl,
                clientId: id,
                instanceName: id,
                chatStatus: dbContact ? dbContact.chatStatus : 'pending',
                atendente: dbContact?.atendente || null,
                departamento: dbContact?.departamento || null
            });
        }

        console.log(`[${id}] Sincronização concluída com sucesso.`);
        res.json(formattedChats);
    } catch (error) {
        console.error("Erro ao sincronizar chats:", error);
        res.status(500).json({ error: 'Erro ao sincronizar chats' });
    }
});

app.get('/api/instances/:id/chats/:chatId/messages', async (req, res) => {
    const { id, chatId } = req.params;
    const client = getClient(id);
    
    if (!client) {
        return res.status(404).json({ error: 'Instância não encontrada ou não conectada' });
    }

    try {
        const chat = await client.getChatById(chatId);
        const messages = await chat.fetchMessages({ limit: 40 });
        
        const formattedMessages = await Promise.all(messages.map(async msg => {
            let mediaData = null;
            if (msg.hasMedia) {
                try {
                    // Baixa a mídia se for pequena ou necessária
                    const media = await msg.downloadMedia();
                    if (media) {
                        mediaData = {
                            mimetype: media.mimetype,
                            data: media.data,
                            filename: media.filename
                        };
                    }
                } catch (e) {
                    console.error("Erro ao baixar mídia no fetch:", e);
                }
            }

            return {
                id: msg.id._serialized,
                whatsappId: msg.id._serialized,
                body: msg.body,
                corpo: msg.body, // Compatibilidade
                from: msg.from,
                to: msg.to,
                fromMe: msg.fromMe,
                timestamp: msg.timestamp,
                hasMedia: msg.hasMedia,
                mediaData,
                type: msg.type,
                ack: msg.ack
            };
        }));

        res.json(formattedMessages);
    } catch (error) {
        console.error("Erro ao buscar mensagens:", error);
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

app.post('/api/send-message', upload.single('file'), async (req, res) => {
    let { number, message, clientId, quotedMessageId, agentId, agentName, agentDept } = req.body;
    const file = req.file;

    try {
        let client = clientId ? getClient(clientId) : null;
        
        if (!client) {
            const allClients = getAllClientsStatus().filter(c => c.status === 'connected');
            if (allClients.length > 0) {
                client = getClient(allClients[0].id);
                clientId = allClients[0].id;
            }
        }

        if (!client) return res.status(404).json({ error: 'Nenhum cliente WhatsApp conectado encontrado.' });
        
        const chatId = number.includes('@') ? number : `${number}@c.us`;
        const options = quotedMessageId ? { quotedMessageId } : {};

        // Monta prefixo com nome do atendente
        let prefix = '';
        if (agentName) {
            prefix = agentDept ? `*${agentName} - ${agentDept}:*\n` : `*${agentName}:*\n`;
        }
        const finalMessage = prefix + (message || '');

        let sentMsg;
        if (file) {
            const media = new MessageMedia(
                file.mimetype,
                file.buffer.toString('base64'),
                file.originalname || file.name || 'file'
            );
            
            // Se for audio de gravação (webm/ogg), tenta enviar como voice (PTT)
            const isAudio = file.mimetype.includes('audio');
            const mediaOptions = { ...options, caption: finalMessage };
            if (isAudio) {
                mediaOptions.sendAudioAsVoice = true;
            }

            sentMsg = await client.sendMessage(chatId, media, mediaOptions);
        } else {
            sentMsg = await client.sendMessage(chatId, finalMessage, options);
        }

        // Persiste a mensagem enviada no banco
        try {
            const contato = await prisma.contato.findUnique({ where: { numero: chatId } });
            if (contato && sentMsg) {
                await prisma.mensagem.upsert({
                    where: { whatsappId: sentMsg.id._serialized },
                    update: {},
                    create: {
                        whatsappId: sentMsg.id._serialized,
                        corpo: finalMessage,
                        fromMe: true,
                        hasMedia: !!file,
                        timestamp: sentMsg.timestamp,
                        contatoId: contato.id,
                        usuarioId: agentId || null
                    }
                });
            }
        } catch (dbErr) {
            console.error('Erro ao persistir mensagem enviada:', dbErr);
        }

        res.json({ success: true, message: 'Message sent' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

// --- User Routes ---
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.usuario.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

// --- Agendamentos Routes ---
app.get('/api/agendamentos', async (req, res) => {
    try {
        const agendamentos = await prisma.agendamento.findMany({
            include: { contato: true, usuario: true },
            orderBy: { dataHora: 'asc' }
        });
        res.json(agendamentos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
});

app.post('/api/agendamentos', async (req, res) => {
    const { titulo, descricao, dataHora, contatoId, usuarioId } = req.body;
    try {
        const agendamento = await prisma.agendamento.create({
            data: { 
                titulo, 
                descricao, 
                dataHora: new Date(dataHora),
                contatoId,
                usuarioId
            }
        });
        res.json(agendamento);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar agendamento' });
    }
});

app.patch('/api/agendamentos/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const agendamento = await prisma.agendamento.update({
            where: { id },
            data: { status }
        });
        res.json(agendamento);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar agendamento' });
    }
});

app.delete('/api/agendamentos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.agendamento.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar agendamento' });
    }
});

// --- CRM & Contacts Routes ---
app.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await prisma.contato.findMany({
            include: { 
                mensagens: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar contatos' });
    }
});

app.patch('/api/contacts/:id', async (req, res) => {
    const { id } = req.params;
    const { status, valor, nome } = req.body;
    try {
        const contact = await prisma.contato.update({
            where: { id },
            data: { status, valor, nome }
        });
        res.json(contact);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar contato' });
    }
});

app.patch('/api/contacts/:id/chat-status', async (req, res) => {
    const { id } = req.params;
    const { chatStatus } = req.body;
    try {
        const numero = id.includes('@') ? id : `${id}@c.us`;

        const updatedContact = await prisma.contato.upsert({
            where: { numero },
            update: { chatStatus },
            create: {
                numero,
                chatStatus,
                status: 'lead'
            }
        });

        res.json(updatedContact);
    } catch (error) {
        console.error("Erro ao atualizar status do chat:", error);
        res.status(500).json({ error: 'Erro ao atualizar status do chat' });
    }
});

// Transferir/Atribuir atendente e setor a um contato
app.patch('/api/contacts/:id/assign', async (req, res) => {
    const { id } = req.params;
    const { atendenteId, departamentoId } = req.body;
    try {
        const contact = await prisma.contato.findFirst({
            where: { OR: [{ id }, { numero: id }] }
        });
        if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

        const updatedContact = await prisma.contato.update({
            where: { id: contact.id },
            data: {
                atendenteId: atendenteId || null,
                departamentoId: departamentoId || null
            },
            include: {
                atendente: { select: { id: true, nome: true } },
                departamento: { select: { id: true, nome: true } }
            }
        });

        res.json(updatedContact);
    } catch (error) {
        console.error("Erro ao atribuir atendente:", error);
        res.status(500).json({ error: 'Erro ao atribuir atendente' });
    }
});

app.post('/api/users', async (req, res) => {
    const { nome, email, senha } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(senha, 10);
        const user = await prisma.usuario.create({
            data: { nome, email, senha: hashedPassword }
        });
        res.json(user);
    } catch (error) {
        console.error("Erro ao criar usuário:", error);
        res.status(400).json({ error: 'Erro ao criar usuário. Email já existe?' });
    }
});

app.patch('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha } = req.body;
    try {
        const data = { nome, email };
        if (senha) {
            data.senha = await bcrypt.hash(senha, 10);
        }
        const user = await prisma.usuario.update({
            where: { id },
            data
        });
        res.json(user);
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.usuario.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.usuario.findUnique({
            where: { email }
        });
        
        if (user && (await bcrypt.compare(password, user.senha))) {
            res.json({ success: true, user: { id: user.id, nome: user.nome, email: user.email } });
        } else {
            // Se for o primeiro acesso e não houver usuários, permitir admin default?
            // Para simplificar agora, se não houver usuários, criamos um admin.
            const userCount = await prisma.usuario.count();
            if (userCount === 0 && email === 'admin@sistema.ai') {
                const hashedPassword = await bcrypt.hash(password, 10);
                const newUser = await prisma.usuario.create({
                    data: { nome: 'Admin Principal', email, senha: hashedPassword }
                });
                return res.json({ success: true, user: { id: newUser.id, nome: newUser.nome, email: newUser.email } });
            }
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro interno no login' });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
