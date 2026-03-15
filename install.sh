#!/bin/bash

# --- Auto-Instalador MultiAtendimento (Ubuntu 22.04) ---
# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}   INSTALADOR AUTOMÁTICO - MULTIATENDIMENTO         ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# Verificar se é root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Por favor, execute como root (sudo bash install.sh)${NC}"
  exit
fi

# Solicitar Informações
read -p "Digite o domínio (ex: sistema.meusite.com): " DOMAIN
read -p "Digite a porta do Backend (padrão 3000): " BACK_PORT
BACK_PORT=${BACK_PORT:-3000}
read -p "Digite o e-mail para o SSL (Certbot): " EMAIL

echo -e "\n${GREEN}[1/5] Atualizando o sistema e instalando dependências...${NC}"
apt update && apt upgrade -y
apt install -y curl git wget build-essential libgbm-dev libnss3 libatk-bridge2.0-0 libgtk-3-0 libasound2 nginx certbot python3-certbot-nginx

echo -e "\n${GREEN}[2/5] Instalando Node.js (v18.x)...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g pm2

echo -e "\n${GREEN}[3/5] Configurando o Projeto...${NC}"
# Assumindo que o usuário já clonou ou o script está na pasta raiz
PROJECT_PATH=$(pwd)

# Backend
echo -e "${BLUE}Configurando Backend...${NC}"
cd $PROJECT_PATH/backend
npm install
npx prisma generate
npx prisma db push

# Frontend
echo -e "\n${BLUE}Configurando Frontend...${NC}"
cd $PROJECT_PATH/frontend
npm install
# Criar arquivo .env para o frontend se necessário
echo "VITE_API_URL=http://$DOMAIN:$BACK_PORT" > .env
npm run build

echo -e "\n${GREEN}[4/5] Configurando Nginx e SSL...${NC}"
# Configuração básica do Nginx
cat <<EOF > /etc/nginx/sites-available/multiatt
server {
    server_name $DOMAIN;

    location / {
        root $PROJECT_PATH/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:$BACK_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io {
        proxy_pass http://localhost:$BACK_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/multiatt /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# SSL com Certbot
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

echo -e "\n${GREEN}[5/5] Iniciando o serviço com PM2...${NC}"
cd $PROJECT_PATH/backend
pm2 start src/server.js --name "multi-backend"
pm2 save
pm2 startup

echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}   INSTALAÇÃO CONCLUÍDA COM SUCESSO!                ${NC}"
echo -e "${GREEN}   Acesse: https://$DOMAIN                          ${NC}"
echo -e "${GREEN}=====================================================${NC}"
