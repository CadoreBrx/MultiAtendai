#!/bin/bash

# --- Configurações Fixas ---
IP_SERVER="206.183.129.197"
FRONT_PATH="/root/MultiAtendai/frontend"
BACK_PATH="/root/MultiAtendai/backend"

echo -e "\n[1/4] Instalando dependências básicas..."
apt update && apt upgrade -y
apt install -y curl git nginx libgbm-dev libnss3 libatk-bridge2.0-0 libgtk-3-0 libasound2

# Node.js e PM2
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi
npm install -g pm2

echo -e "\n[2/4] Configurando o Backend no IP..."
cd $BACK_PATH
npm install
echo "PORT=3000" > .env
echo "DATABASE_URL=\"file:./dev.db\"" >> .env
echo "BACKEND_URL=http://$IP_SERVER:3000" >> .env
npx prisma db push

pm2 delete all 2>/dev/null
pm2 start src/server.js --name "multi-backend"

echo -e "\n[3/4] Configurando o Frontend no IP..."
cd $FRONT_PATH
npm install --legacy-peer-deps
echo "VITE_API_URL=http://$IP_SERVER:3000" > .env
npm run build

echo -e "\n[4/4] Configurando Nginx para servir o Frontend..."
# Limpar configs antigas de SSL que podem travar o Nginx
rm -f /etc/nginx/sites-enabled/*
cat <<EOF > /etc/nginx/sites-available/multi_ip
server {
    listen 80;
    server_name _;

    location / {
        root $FRONT_PATH/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -s /etc/nginx/sites-available/multi_ip /etc/nginx/sites-enabled/
# Dar permissão para o Nginx ler a pasta root
chmod -R 755 /root
nginx -t && systemctl restart nginx

pm2 save
pm2 startup

echo "====================================================="
echo "  INSTALAÇÃO VIA IP CONCLUÍDA!"
echo "  Acesse: http://$IP_SERVER"
echo "  Backend rodando em: http://$IP_SERVER:3000"
echo "====================================================="
