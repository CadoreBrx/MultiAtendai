# MultiAtendimento 🚀

Um sistema moderno de multiatendimento via WhatsApp, focado em alta performance, UI/UX premium e recursos avançados para equipes de suporte e vendas.

## 🌟 Principais Funcionalidades

- **Múltiplos Atendentes**: Gerencie conversas com uma equipe completa. Mensagens mostram o nome e setor do atendente (ex: `*Matheus - Suporte:*`).
- **Transferência de Conversas**: Transfira o atendimento facilmente entre setores e atendentes.
- **Múltiplas Conexões (Instâncias)**: Conecte diversos números de WhatsApp em simultâneo.
- **Chatbot Inteligente**: Autoatendimento via robô que lê os "Setores" do banco de dados e roteia o cliente para o menu correto.
- **Segurança Avançada**: Senhas de usuários fortemente criptografadas em hash (Bcrypt) e rotas de API seguras.
- **Persistência Implacável**: Histórico de mensagens salvas no banco de dados SQLite, imune a mensagens apagadas pelo usuário no WhatsApp.
- **Gestão de Contatos (CRM Integrado)**: O sistema salva informações, mídias e status do lead de forma automatizada ao lado das conversas.
- **UI Premium Fluída**: Frontend em Vue 3 + TailwindCSS, suportando:
  - Cola de imagens direto pelo teclado (Ctrl+V ou Cmd+V).
  - Links que redirecionam automaticamente.
  - Visualizador de mídias intuitivo estilo pop-up (lightbox).
  - Dark mode fluido e responsivo para telas sensíveis.

## 🛠️ Tecnologias

- **Backend**: Node.js, Express, `whatsapp-web.js` (com Puppeteer), Prisma ORM, SQLite.
- **Frontend**: Vue 3, Vite, TailwindCSS, PrimeVue e bibliotecas de ícones dinâmicas (@phosphor-icons).

---

## ⚡ Instalação Automática (Recomendada para Produção)

Desenvolvemos um **Instalador Interativo** `.sh` focado em servidores **Ubuntu 22.04 LTS (ou superior)**. O script faz todo o trabalho chato por você:

- Instalação e atualização de pacotes necessários (Node.js, NPM, Git, PM2).
- Configuração automática do Prisma.
- Configuração de Domínios.
- Inicia o Backend e o Frontend como serviços em background.

### Passos para Instalação no Linux:

1. Acesse seu servidor ou VPS via SSH (ex: AWS EC2, DigitalOcean, Hostinger).
2. Transfira (ou crie) o arquivo `install.sh` na pasta principal do seu usuário.
3. Dê permissão de execução para o script:
   ```bash
   chmod +x install.sh
   ```
4. Execute o assistente de instalação:
   ```bash
   ./install.sh
   ```
5. Siga o **Tour Passo a Passo** interativo na tela. Ele vai pedir informações como:
   - Domínio a ser usado.
   - Porta desejada para o painel.
   E configurar as dependências de trás para frente.

Ao final, o sistema avisará que os processos estão rodando via PM2, e te passará o link para acessar!

---

## 💻 Instalação Manual (Para Desenvolvimento)

Caso queira clonar para rodar de sua máquina e promover modificações de código (Windows, Mac ou Linux).

### Pré-requisitos
- Node.js (v18 ou superior)
- Navegador Google Chrome / Chromium

### 1. Preparando o Banco e API (Backend)
Vá ao diretório raiz do backend:
```bash
cd backend
```
Instale os pacotes e carregue o Prisma e o SQLite:
```bash
npm install
npx prisma generate
npx prisma db push
```
*(As tabelas de Setores, Mensagens, Usuários e CRM serão construídas na hora.)*

Por fim, inicie o backend:
```bash
npm run dev
# a API iniciará na porta localhost:3000
```

### 2. Rodando o Painel (Frontend)
Abra uma **nova janela de terminal** (não feche a do backend) e entre no frontend:
```bash
cd frontend
npm install
npm run dev
```
*(O frontend abrirá, normalmente na porta localhost:5173).*

---

## 🔐 Primeiro Acesso

Como as senhas precisam ser altamente seguras, para começar num banco vazio:
Abra o navegador no localhost que o terminal te passou e efetue o login usando:
- **E-mail de acesso Inicial:** `admin@sistema.ai`
- **Senha:** *Coloque uma senha com a qual queira registrar este administrador (ela fará o BCRYPT Hash na primeira entrada automaticamente se o banco estiver vazio).*

Boa gestão e excelentes vendas com o MultiAtendimento! 🚀
