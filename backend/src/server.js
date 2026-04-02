require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const multer = require('multer');
const { MessageMedia } = require('whatsapp-web.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { initializeWhatsAppClient, getClient, getAllClientsStatus, deleteClient, getLastQr } = require('./whatsapp/client');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { authMiddleware, generateToken } = require('./middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// ══════════════════════════════════════════════
//  Inicializa instâncias salvas no banco
// ══════════════════════════════════════════════
(async () => {
    try {
        const savedInstances = await prisma.instance.findMany();
        savedInstances.forEach(inst => {
            initializeWhatsAppClient(inst.clientId, io, inst.empresaId);
        });
        console.log(`[BOOT] ${savedInstances.length} instância(s) WhatsApp inicializada(s).`);
    } catch (e) {
        console.log('[BOOT] Nenhuma instância encontrada (banco novo?).');
    }
})();

io.on('connection', (socket) => {
    console.log('Cliente socket conectado:', socket.id);
    
    socket.on('whatsapp_initialize', async (data) => {
        const { clientId } = data;
        console.log(`Solicitação de inicialização para: ${clientId}`);

        const existing = getClient(clientId);
        if (existing) {
            // Se já está conectado, só confirma
            if (existing.info) {
                socket.emit('whatsapp_ready', { clientId, message: 'Já conectado.' });
                return;
            }
            // Se tem QR pendente, reenvia para este socket
            const qr = getLastQr(clientId);
            if (qr) {
                socket.emit('whatsapp_qr', { clientId, qr });
                return;
            }
            // Desconectado e sem QR — destrói e reinicializa
            await deleteClient(clientId);
        }

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
                // Silencioso
            }
        }
    });
});

// ══════════════════════════════════════════════
//  ROTAS PÚBLICAS (sem auth)
// ══════════════════════════════════════════════
app.get('/api/status', (req, res) => {
    res.json({ status: 'API MultiAtendai SaaS is running', version: '3.0' });
});

// --- Registro de nova empresa ---
app.post('/api/auth/register', async (req, res) => {
    const { nomeEmpresa, nome, email, senha } = req.body;
    
    if (!nomeEmpresa || !nome || !email || !senha) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // Gera slug a partir do nome da empresa
    const slug = nomeEmpresa
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

    try {
        // Verifica se email ou slug já existe
        const existingEmpresa = await prisma.empresa.findFirst({
            where: { OR: [{ email }, { slug }] }
        });
        if (existingEmpresa) {
            return res.status(409).json({ error: 'Empresa ou email já cadastrados.' });
        }

        const existingUser = await prisma.usuario.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: 'Email já está em uso por outro usuário.' });
        }

        const hashedPassword = await bcrypt.hash(senha, 10);
        const hashedEmpresaPassword = await bcrypt.hash(senha, 10);

        // Cria empresa + admin em transação
        const result = await prisma.$transaction(async (tx) => {
            const empresa = await tx.empresa.create({
                data: {
                    nome: nomeEmpresa,
                    slug,
                    email,
                    senha: hashedEmpresaPassword,
                }
            });

            const usuario = await tx.usuario.create({
                data: {
                    nome,
                    email,
                    senha: hashedPassword,
                    role: 'admin',
                    empresaId: empresa.id
                }
            });

            // Cria configurações padrão
            await tx.configuracao.create({
                data: {
                    chave: 'welcomeMessage',
                    valor: `Olá! Bem-vindo à ${nomeEmpresa}. 🚀\nComo posso ajudar?`,
                    empresaId: empresa.id
                }
            });

            return { empresa, usuario };
        });

        const token = generateToken({
            userId: result.usuario.id,
            empresaId: result.empresa.id,
            role: 'admin'
        });

        res.json({
            success: true,
            token,
            user: { 
                id: result.usuario.id, 
                nome: result.usuario.nome, 
                email: result.usuario.email,
                role: 'admin'
            },
            empresa: {
                id: result.empresa.id,
                nome: result.empresa.nome,
                slug: result.empresa.slug
            }
        });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({ error: 'Erro interno ao criar conta.' });
    }
});

// --- Login ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.usuario.findUnique({
            where: { email },
            include: { empresa: { select: { id: true, nome: true, slug: true, ativo: true } } }
        });
        
        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        if (!await bcrypt.compare(password, user.senha)) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        if (!user.empresa.ativo) {
            return res.status(403).json({ error: 'Conta da empresa está desativada.' });
        }

        const token = generateToken({
            userId: user.id,
            empresaId: user.empresaId,
            role: user.role
        });

        res.json({
            success: true,
            token,
            user: { 
                id: user.id, 
                nome: user.nome, 
                email: user.email,
                role: user.role
            },
            empresa: user.empresa
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno no login' });
    }
});

// Rota legada de login (compatibilidade)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.usuario.findUnique({
            where: { email },
            include: { empresa: { select: { id: true, nome: true, slug: true, ativo: true } } }
        });
        
        if (user && (await bcrypt.compare(password, user.senha))) {
            const token = generateToken({
                userId: user.id,
                empresaId: user.empresaId,
                role: user.role
            });

            res.json({ 
                success: true,
                token,
                user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
                empresa: user.empresa
            });
        } else {
            res.status(401).json({ error: 'Credenciais inválidas' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro interno no login' });
    }
});

// ══════════════════════════════════════════════
//  ROTAS PROTEGIDAS (com auth + tenant isolation)
// ══════════════════════════════════════════════

// --- Instances ---
app.get('/api/instances', authMiddleware, async (req, res) => {
    try {
        const instances = await prisma.instance.findMany({
            where: { empresaId: req.empresaId }
        });

        const memoryStatus = getAllClientsStatus();
        const result = instances.map(inst => {
            const runtime = memoryStatus.find(m => m.id === inst.clientId);
            return {
                id: inst.clientId,
                name: inst.name,
                number: runtime && runtime.number !== 'Aguardando' ? runtime.number : inst.number || '',
                status: runtime ? runtime.status : 'disconnected',
                dbId: inst.id
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Erro ao buscar instâncias:', error);
        res.status(500).json({ error: 'Erro ao buscar instâncias' });
    }
});

app.post('/api/instances', authMiddleware, async (req, res) => {
    const { id, name } = req.body;
    if (!id) return res.status(400).json({ error: 'ID da instancia obrigatorio' });
    
    try {
        // Prefixar clientId com empresaId para evitar conflitos entre tenants
        const clientId = `${req.empresaId.substring(0, 8)}_${id}`;

        await prisma.instance.upsert({
            where: { clientId },
            update: { name: name || id },
            create: {
                clientId,
                name: name || id,
                empresaId: req.empresaId
            }
        });

        initializeWhatsAppClient(clientId, io, req.empresaId);
        res.json({ success: true, message: `Instancia ${clientId} inicializada` });
    } catch (error) {
        console.error('Erro ao criar instância:', error);
        res.status(500).json({ error: 'Erro ao criar instância' });
    }
});

app.delete('/api/instances/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        // Verifica se a instância pertence a esta empresa
        const instance = await prisma.instance.findFirst({
            where: { clientId: id, empresaId: req.empresaId }
        });
        if (!instance) return res.status(404).json({ error: 'Instância não encontrada' });

        await prisma.instance.delete({ where: { id: instance.id } });
        
        const client = getClient(id);
        if (client) {
            await deleteClient(id);
        }
        
        res.json({ success: true, message: `Instância ${id} removida.` });
    } catch (error) {
        console.error('Erro ao deletar instância:', error);
        res.status(500).json({ error: 'Erro ao deletar instância' });
    }
});

// --- Dashboard Stats ---
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
    try {
        const [msgCount, contactCount, agendamentoCount] = await Promise.all([
            prisma.mensagem.count({ where: { empresaId: req.empresaId } }),
            prisma.contato.count({ where: { empresaId: req.empresaId } }),
            prisma.agendamento.count({
                where: {
                    empresaId: req.empresaId,
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

// --- Settings ---
app.get('/api/settings', authMiddleware, async (req, res) => {
    try {
        const configs = await prisma.configuracao.findMany({
            where: { empresaId: req.empresaId }
        });
        const settings = {};
        configs.forEach(c => settings[c.chave] = c.valor);
        
        if (!settings.welcomeMessage) settings.welcomeMessage = 'Olá! Como posso ajudar?';
        
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
});

app.post('/api/settings', authMiddleware, async (req, res) => {
    try {
        const settings = req.body;
        for (const [chave, valor] of Object.entries(settings)) {
            await prisma.configuracao.upsert({
                where: { empresaId_chave: { empresaId: req.empresaId, chave } },
                update: { valor: String(valor) },
                create: { chave, valor: String(valor), empresaId: req.empresaId }
            });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
});

// --- Departments ---
app.get('/api/departments', authMiddleware, async (req, res) => {
    try {
        const depts = await prisma.departamento.findMany({
            where: { empresaId: req.empresaId },
            include: { agents: true },
            orderBy: { ordem: 'asc' }
        });
        res.json(depts);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar departamentos' });
    }
});

app.post('/api/departments', authMiddleware, async (req, res) => {
    try {
        const { nome, descricao, cor, ordem } = req.body;
        const dept = await prisma.departamento.create({
            data: { nome, descricao, cor, ordem: parseInt(ordem) || 0, empresaId: req.empresaId }
        });
        res.json(dept);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar departamento' });
    }
});

app.patch('/api/departments/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { nome, descricao, cor, ordem } = req.body;
    try {
        // Verifica tenant
        const dept = await prisma.departamento.findFirst({ where: { id, empresaId: req.empresaId } });
        if (!dept) return res.status(404).json({ error: 'Departamento não encontrado' });

        const updated = await prisma.departamento.update({
            where: { id },
            data: { nome, descricao, cor, ordem: parseInt(ordem) || 0 }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar departamento' });
    }
});

app.delete('/api/departments/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const dept = await prisma.departamento.findFirst({ where: { id, empresaId: req.empresaId } });
        if (!dept) return res.status(404).json({ error: 'Departamento não encontrado' });

        await prisma.departamento.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir departamento' });
    }
});

// --- Chats ---
app.get('/api/instances/:id/chats', authMiddleware, async (req, res) => {
    const { id } = req.params;
    
    // Verifica se a instância pertence à empresa
    const instance = await prisma.instance.findFirst({
        where: { clientId: id, empresaId: req.empresaId }
    });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada' });

    const client = getClient(id);
    if (!client) {
        return res.status(404).json({ error: 'Instância não conectada' });
    }

    try {
        const chats = await client.getChats();
        const activeChats = chats.slice(0, 30);

        // Busca todos os contatos do tenant em uma query só (evita N queries)
        const chatIds = activeChats.map(c => c.id._serialized);
        const dbContacts = await prisma.contato.findMany({
            where: { numero: { in: chatIds }, empresaId: req.empresaId },
            include: {
                atendente: { select: { id: true, nome: true } },
                departamento: { select: { id: true, nome: true } }
            }
        });
        const dbContactMap = Object.fromEntries(dbContacts.map(c => [c.numero, c]));

        const formattedChats = activeChats.map(c => {
            // Usa nome já disponível no objeto do chat sem chamar getContact() / getProfilePicUrl()
            const contactName = c.name || c.id.user;
            const dbContact = dbContactMap[c.id._serialized] || null;

            return {
                id: c.id._serialized,
                name: contactName,
                lastMessage: c.lastMessage?.body || '',
                timestamp: c.timestamp,
                unreadCount: c.unreadCount,
                isGroup: c.isGroup,
                profilePicUrl: null,
                clientId: id,
                instanceName: id,
                chatStatus: dbContact ? dbContact.chatStatus : 'pending',
                atendente: dbContact?.atendente || null,
                departamento: dbContact?.departamento || null
            };
        });

        res.json(formattedChats);
    } catch (error) {
        console.error("Erro ao sincronizar chats:", error);
        res.status(500).json({ error: 'Erro ao sincronizar chats' });
    }
});

app.get('/api/instances/:id/chats/:chatId/messages', authMiddleware, async (req, res) => {
    const { id, chatId } = req.params;
    
    const instance = await prisma.instance.findFirst({
        where: { clientId: id, empresaId: req.empresaId }
    });
    if (!instance) return res.status(404).json({ error: 'Instância não encontrada' });

    const client = getClient(id);
    if (!client) {
        return res.status(404).json({ error: 'Instância não conectada' });
    }

    try {
        const chat = await client.getChatById(chatId);
        const messages = await chat.fetchMessages({ limit: 40 });
        
        const formattedMessages = await Promise.all(messages.map(async msg => {
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

            return {
                id: msg.id._serialized,
                whatsappId: msg.id._serialized,
                body: msg.body,
                corpo: msg.body,
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

// --- Send Message ---
app.post('/api/send-message', authMiddleware, upload.single('file'), async (req, res) => {
    let { number, message, clientId, quotedMessageId, agentId, agentName, agentDept } = req.body;
    const file = req.file;

    try {
        // Verifica se a instância pertence à empresa
        if (clientId) {
            const instance = await prisma.instance.findFirst({
                where: { clientId, empresaId: req.empresaId }
            });
            if (!instance) clientId = null;
        }

        let client = clientId ? getClient(clientId) : null;
        
        if (!client) {
            // Busca uma instância conectada desta empresa
            const empresaInstances = await prisma.instance.findMany({
                where: { empresaId: req.empresaId }
            });
            const allClients = getAllClientsStatus().filter(c => c.status === 'connected');
            const validClient = allClients.find(c => 
                empresaInstances.some(ei => ei.clientId === c.id)
            );
            if (validClient) {
                client = getClient(validClient.id);
                clientId = validClient.id;
            }
        }

        if (!client) return res.status(404).json({ error: 'Nenhum cliente WhatsApp conectado encontrado.' });
        
        const chatId = number.includes('@') ? number : `${number}@c.us`;
        const options = quotedMessageId ? { quotedMessageId } : {};

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
            
            const isAudio = file.mimetype.includes('audio');
            const mediaOptions = { ...options, caption: finalMessage };
            if (isAudio) {
                mediaOptions.sendAudioAsVoice = true;
            }

            sentMsg = await client.sendMessage(chatId, media, mediaOptions);
        } else {
            sentMsg = await client.sendMessage(chatId, finalMessage, options);
        }

        // Persiste a mensagem no banco do tenant
        try {
            const contato = await prisma.contato.findFirst({ 
                where: { numero: chatId, empresaId: req.empresaId } 
            });
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
                        usuarioId: agentId || null,
                        empresaId: req.empresaId
                    }
                });
            }
        } catch (dbErr) {
            console.error('Erro ao persistir mensagem:', dbErr);
        }

        res.json({ success: true, message: 'Message sent' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

// --- Users ---
app.get('/api/users', authMiddleware, async (req, res) => {
    try {
        const users = await prisma.usuario.findMany({
            where: { empresaId: req.empresaId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

app.post('/api/users', authMiddleware, async (req, res) => {
    const { nome, email, senha } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(senha, 10);
        const user = await prisma.usuario.create({
            data: { nome, email, senha: hashedPassword, empresaId: req.empresaId }
        });
        res.json(user);
    } catch (error) {
        console.error("Erro ao criar usuário:", error);
        res.status(400).json({ error: 'Erro ao criar usuário. Email já existe?' });
    }
});

app.patch('/api/users/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha } = req.body;
    try {
        const user = await prisma.usuario.findFirst({ where: { id, empresaId: req.empresaId } });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        const data = { nome, email };
        if (senha) {
            data.senha = await bcrypt.hash(senha, 10);
        }
        const updated = await prisma.usuario.update({ where: { id }, data });
        res.json(updated);
    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

app.delete('/api/users/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const user = await prisma.usuario.findFirst({ where: { id, empresaId: req.empresaId } });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        await prisma.usuario.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

// --- Agendamentos ---
app.get('/api/agendamentos', authMiddleware, async (req, res) => {
    try {
        const agendamentos = await prisma.agendamento.findMany({
            where: { empresaId: req.empresaId },
            include: { contato: true, usuario: true },
            orderBy: { dataHora: 'asc' }
        });
        res.json(agendamentos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
});

app.post('/api/agendamentos', authMiddleware, async (req, res) => {
    const { titulo, descricao, dataHora, contatoId, usuarioId } = req.body;
    try {
        const agendamento = await prisma.agendamento.create({
            data: { 
                titulo, 
                descricao, 
                dataHora: new Date(dataHora),
                contatoId,
                usuarioId,
                empresaId: req.empresaId
            }
        });
        res.json(agendamento);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar agendamento' });
    }
});

app.patch('/api/agendamentos/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const agendamento = await prisma.agendamento.findFirst({ where: { id, empresaId: req.empresaId } });
        if (!agendamento) return res.status(404).json({ error: 'Agendamento não encontrado' });

        const updated = await prisma.agendamento.update({ where: { id }, data: { status } });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar agendamento' });
    }
});

app.delete('/api/agendamentos/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const agendamento = await prisma.agendamento.findFirst({ where: { id, empresaId: req.empresaId } });
        if (!agendamento) return res.status(404).json({ error: 'Agendamento não encontrado' });

        await prisma.agendamento.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar agendamento' });
    }
});

// --- Contacts / CRM ---
app.get('/api/contacts', authMiddleware, async (req, res) => {
    try {
        const contacts = await prisma.contato.findMany({
            where: { empresaId: req.empresaId },
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

app.patch('/api/contacts/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { status, valor, nome } = req.body;
    try {
        const contact = await prisma.contato.findFirst({ where: { id, empresaId: req.empresaId } });
        if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

        const updated = await prisma.contato.update({
            where: { id },
            data: { status, valor, nome }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar contato' });
    }
});

app.patch('/api/contacts/:id/chat-status', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { chatStatus } = req.body;
    try {
        const numero = id.includes('@') ? id : `${id}@c.us`;

        // Usa compound unique do tenant
        const updatedContact = await prisma.contato.upsert({
            where: { empresaId_numero: { empresaId: req.empresaId, numero } },
            update: { chatStatus },
            create: {
                numero,
                chatStatus,
                status: 'lead',
                empresaId: req.empresaId
            }
        });

        res.json(updatedContact);
    } catch (error) {
        console.error("Erro ao atualizar status do chat:", error);
        res.status(500).json({ error: 'Erro ao atualizar status do chat' });
    }
});

app.patch('/api/contacts/:id/assign', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { atendenteId, departamentoId } = req.body;
    try {
        const contact = await prisma.contato.findFirst({
            where: { 
                empresaId: req.empresaId,
                OR: [{ id }, { numero: id }] 
            }
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`MultiAtendai SaaS API listening on port ${PORT}`);
});
