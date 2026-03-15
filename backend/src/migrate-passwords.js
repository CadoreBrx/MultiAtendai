const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function migratePasswords() {
    console.log('Iniciando migração de senhas...');
    
    try {
        const users = await prisma.usuario.findMany();
        let migratedCount = 0;

        for (const user of users) {
            // Verifica se a senha já parece ser um hash bcrypt (começa com $2a$ ou $2b$)
            if (!user.senha.startsWith('$2a$') && !user.senha.startsWith('$2b$')) {
                console.log(`Migrando senha para o usuário: ${user.email}`);
                const hashedPassword = await bcrypt.hash(user.senha, 10);
                
                await prisma.usuario.update({
                    where: { id: user.id },
                    data: { senha: hashedPassword }
                });
                migratedCount++;
            }
        }

        console.log(`Migração concluída! ${migratedCount} senhas foram atualizadas.`);
    } catch (error) {
        console.error('Erro durante a migração:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migratePasswords();
