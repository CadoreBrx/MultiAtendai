const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const deptsFile = path.join(__dirname, '../../data/departments.json');
const settingsFile = path.join(__dirname, '../../data/settings.json');

async function migrateJsonToDb() {
    console.log('Iniciando migração de JSON para Banco de Dados...');
    
    try {
        // 1. Migrar Departamentos
        if (fs.existsSync(deptsFile)) {
            const depts = JSON.parse(fs.readFileSync(deptsFile, 'utf8'));
            console.log(`Migrando ${depts.length} departamentos...`);
            
            for (const d of depts) {
                await prisma.departamento.upsert({
                    where: { id: String(d.id).padStart(36, '0') }, // Gambiarra para manter IDs numéricos como UUID strings se necessário, ou apenas deixar o Prisma gerar novos IDs.
                    // Na verdade, melhor deixar o Prisma gerar UUIDs novos para ser consistente, mas o Bot usa os IDs numéricos.
                    // Vou tentar manter os IDs numéricos mapeados para as chaves do bot e os novos UUIDs para o banco.
                    // Mas para simplificar, usarei o ID numérico como string se possível ou incrementarei a 'ordem'.
                    where: { nome: d.name }, // Usar nome como chave única para migração
                    update: {
                        descricao: d.description,
                        cor: d.color || '#6366f1',
                        ordem: d.id
                    },
                    create: {
                        nome: d.name,
                        descricao: d.description,
                        cor: d.color || '#6366f1',
                        ordem: d.id
                    }
                });
            }
        }

        // 2. Migrar Configurações
        if (fs.existsSync(settingsFile)) {
            const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
            console.log('Migrando configurações...');
            
            for (const [key, value] of Object.entries(settings)) {
                await prisma.configuracao.upsert({
                    where: { chave: key },
                    update: { valor: String(value) },
                    create: { chave: key, valor: String(value) }
                });
            }
        }

        console.log('Migração de JSON para DB concluída!');
    } catch (error) {
        console.error('Erro durante a migração:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateJsonToDb();
