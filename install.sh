#!/bin/bash

# =============================================
#  MultiAtendai SaaS - Instalador Universal
#  Suporta: local (dev) e VPS (produção)
#  Seguro para VPS com outros sistemas rodando
#  Auto-detecta IP público da VPS
# =============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACK_PATH="$SCRIPT_DIR/backend"
FRONT_PATH="$SCRIPT_DIR/frontend"
APP_BACK="multi-backend"
APP_FRONT="multi-frontend"

# --- Cores ---
G='\033[0;32m'
Y='\033[1;33m'
R='\033[0;31m'
B='\033[1;34m'
C='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${G}[✔]${NC} $1"; }
warn() { echo -e "${Y}[!]${NC} $1"; }
err()  { echo -e "${R}[✘]${NC} $1"; exit 1; }
step() { echo -e "\n${B}[$1]${NC} $2"; }

echo -e "\n${B}╔══════════════════════════════════════╗${NC}"
echo -e "${B}║  MultiAtendai SaaS - Instalador v3.0 ║${NC}"
echo -e "${B}╚══════════════════════════════════════╝${NC}\n"

# ── Detecta IP público automaticamente ───────
detect_public_ip() {
    local ip=""
    # Tenta múltiplas fontes
    for service in "ifconfig.me" "icanhazip.com" "ipecho.net/plain" "api.ipify.org"; do
        ip=$(curl -s --connect-timeout 5 --max-time 10 "$service" 2>/dev/null | tr -d '[:space:]')
        if echo "$ip" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
            echo "$ip"
            return 0
        fi
    done
    return 1
}

# ── Verifica se uma porta está em uso ────────
port_in_use() {
    if command -v ss &>/dev/null; then
        ss -tlnp 2>/dev/null | grep -q ":$1 "
    elif command -v netstat &>/dev/null; then
        netstat -tlnp 2>/dev/null | grep -q ":$1 "
    else
        return 1
    fi
}

# ── Encontra N portas livres a partir de uma base ──
find_free_ports() {
    local base=$1
    local count=${2:-3}
    local found=0
    local p=$base
    local results=()
    while [ $found -lt $count ]; do
        if ! port_in_use "$p"; then
            results+=("$p")
            (( found++ ))
        fi
        (( p++ ))
    done
    echo "${results[@]}"
}

# ── Seleção interativa de porta ──────────────
pick_port() {
    local label=$1
    local base=$2
    local suggestions
    read -ra suggestions <<< "$(find_free_ports "$base" 3)"

    echo -e "\n  ${C}Portas disponíveis para $label:${NC}" >&2
    for i in "${!suggestions[@]}"; do
        echo -e "    ${G}[$((i+1))]${NC} ${suggestions[$i]}" >&2
    done
    echo -e "    ${Y}[4]${NC} Digitar outra" >&2
    read -rp "  Escolha [1/2/3/4, padrão: 1 → ${suggestions[0]}]: " PICK >&2

    case "$PICK" in
        1|"") echo "${suggestions[0]}" ;;
        2)    echo "${suggestions[1]}" ;;
        3)    echo "${suggestions[2]}" ;;
        4)
            read -rp "  Digite a porta: " CUSTOM_PORT >&2
            if port_in_use "$CUSTOM_PORT"; then
                warn "Porta $CUSTOM_PORT já está em uso. Usando ${suggestions[0]}." >&2
                echo "${suggestions[0]}"
            else
                echo "$CUSTOM_PORT"
            fi
            ;;
        *)
            if [[ "$PICK" =~ ^[0-9]+$ ]]; then
                if port_in_use "$PICK"; then
                    warn "Porta $PICK já está em uso. Usando ${suggestions[0]}." >&2
                    echo "${suggestions[0]}"
                else
                    echo "$PICK"
                fi
            else
                echo "${suggestions[0]}"
            fi
            ;;
    esac
}

# ── Modo ─────────────────────────────────────
echo "Onde deseja instalar?"
echo "  [1] Local/VPS sem Nginx  (sem Nginx — frontend via Vite/preview no PM2)"
echo "  [2] VPS com Nginx        (produção, com Nginx — seguro para VPS compartilhada)"
read -rp "Escolha [1/2, padrão: 1]: " MODE
MODE=${MODE:-1}

# ── Função compartilhada: detecta/pergunta o host ────
pick_host() {
    echo ""
    step "🌐" "Detectando IP público da VPS..."
    DETECTED_IP=$(detect_public_ip)

    if [ -n "$DETECTED_IP" ]; then
        log "IP público detectado: ${C}$DETECTED_IP${NC}"
        echo ""
        echo -e "  ${Y}Deseja usar este IP ou informar um domínio?${NC}"
        echo -e "    ${G}[1]${NC} Usar IP detectado: $DETECTED_IP"
        echo -e "    ${G}[2]${NC} Informar domínio/IP manualmente"
        echo -e "    ${G}[3]${NC} Usar localhost (só acesso local)"
        read -rp "  Escolha [1/2/3, padrão: 1]: " IP_CHOICE
        IP_CHOICE=${IP_CHOICE:-1}
        case "$IP_CHOICE" in
            2) read -rp "IP ou domínio (ex: multi.meusite.com): " SERVER_HOST
               [ -z "$SERVER_HOST" ] && err "IP/domínio é obrigatório." ;;
            3) SERVER_HOST="localhost" ;;
            *) SERVER_HOST="$DETECTED_IP" ;;
        esac
    else
        warn "Não foi possível detectar o IP público automaticamente."
        echo -e "    ${G}[1]${NC} Informar IP/domínio manualmente"
        echo -e "    ${G}[2]${NC} Usar localhost"
        read -rp "  Escolha [1/2, padrão: 2]: " IP_CHOICE
        IP_CHOICE=${IP_CHOICE:-2}
        if [ "$IP_CHOICE" == "1" ]; then
            read -rp "IP ou domínio (ex: 200.10.20.30): " SERVER_HOST
            [ -z "$SERVER_HOST" ] && err "IP/domínio é obrigatório."
        else
            SERVER_HOST="localhost"
        fi
    fi
}

# ── Configurações por modo ────────────────────
if [ "$MODE" == "2" ]; then
    pick_host

    echo -e "\n${Y}Seleção de portas — Backend e Frontend (Nginx)${NC}"
    BACK_PORT=$(pick_port "Backend (API Interna)" 3000)

    echo -e "${Y}Como você já tem outros projetos, não use a 80 se já estiver em uso.${NC}"
    FRONT_PORT=$(pick_port "Frontend/Nginx (Porta Pública)" 8080)

    if [ "$FRONT_PORT" == "80" ]; then
        FRONTEND_API_URL="http://$SERVER_HOST"
    else
        FRONTEND_API_URL="http://$SERVER_HOST:$FRONT_PORT"
    fi
    log "Backend: porta $BACK_PORT | Frontend (Nginx): porta $FRONT_PORT"
else
    pick_host

    echo -e "\n${Y}Seleção de portas — Backend e Frontend (PM2)${NC}"
    BACK_PORT=$(pick_port "Backend (API)" 3000)
    FRONT_PORT=$(pick_port "Frontend (Vite preview)" 5173)

    FRONTEND_API_URL="http://$SERVER_HOST:$BACK_PORT"
    log "Backend: porta $BACK_PORT | Frontend: porta $FRONT_PORT"
fi

# ── Gerar JWT_SECRET automático ──────────────
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | base64 | tr -d '\n/+=')
log "JWT Secret gerado automaticamente."

# ── Confirmação antes de instalar ────────────
echo ""
echo -e "${B}Resumo da instalação:${NC}"
echo "  Modo:       $([ "$MODE" == "2" ] && echo 'VPS (Nginx) — SaaS Multi-Tenant' || echo 'Local — SaaS Multi-Tenant')"
[ "$MODE" == "2" ] && echo "  Host:       $SERVER_HOST"
echo "  Backend:    http://${SERVER_HOST}:${BACK_PORT}"
echo "  Frontend:   $([ "$MODE" == "2" ] && echo "$FRONTEND_API_URL (via Nginx)" || echo "http://$SERVER_HOST:$FRONT_PORT")"
echo "  Acesso:     Aberto para todos (SaaS — qualquer empresa pode se cadastrar)"
echo ""
read -rp "Confirmar e instalar? [S/n]: " CONFIRM
[[ "$CONFIRM" =~ ^[Nn]$ ]] && echo "Cancelado." && exit 0

# ── 1. Dependências do sistema ───────────────
step "1/4" "Instalando dependências do sistema..."

if command -v apt-get &>/dev/null; then
    apt-get update -qq
    PKGS=""
    command -v curl  &>/dev/null || PKGS="$PKGS curl"
    command -v git   &>/dev/null || PKGS="$PKGS git"
    command -v openssl &>/dev/null || PKGS="$PKGS openssl"
    [ "$MODE" == "2" ] && { command -v nginx &>/dev/null || PKGS="$PKGS nginx"; }
    [ -n "$PKGS" ] && apt-get install -y -qq $PKGS
    # Dependências do whatsapp-web.js / Puppeteer
    apt-get install -y -qq libgbm-dev libnss3 libatk-bridge2.0-0 libgtk-3-0 libasound2 2>/dev/null || true
fi

# Node.js — instala 20.x se não existir ou se for < 20
install_node=false
if ! command -v node &>/dev/null; then
    install_node=true
else
    NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
    [ "$NODE_MAJOR" -lt 20 ] && install_node=true && warn "Node $NODE_MAJOR detectado. Atualizando para 20..."
fi
if [ "$install_node" = true ]; then
    log "Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
log "Node.js $(node -v) | npm $(npm -v)"

command -v pm2 &>/dev/null || npm install -g pm2 -q
log "PM2 $(pm2 -v)"

# ── 2. Backend ───────────────────────────────
step "2/4" "Configurando o Backend (porta $BACK_PORT)..."

cd "$BACK_PATH" || err "Pasta backend não encontrada: $BACK_PATH"
npm install

cat > .env <<EOF
PORT=$BACK_PORT
DATABASE_URL="file:./dev.db"
BACKEND_URL=http://$SERVER_HOST:$BACK_PORT
JWT_SECRET=$JWT_SECRET
EOF

npx prisma db push

# Reinicia só o nosso processo — NÃO afeta outros apps PM2
if pm2 describe "$APP_BACK" &>/dev/null; then
    pm2 restart "$APP_BACK"
    log "Backend reiniciado via PM2."
else
    pm2 start src/server.js --name "$APP_BACK"
    log "Backend iniciado via PM2."
fi

# ── 3. Frontend ──────────────────────────────
step "3/4" "Configurando o Frontend..."

cd "$FRONT_PATH" || err "Pasta frontend não encontrada: $FRONT_PATH"
npm install --legacy-peer-deps

cat > .env <<EOF
VITE_API_URL=$FRONTEND_API_URL
EOF

npm run build
log "Build gerado em $FRONT_PATH/dist"

# Modo local: sobe o preview do build via PM2 na porta escolhida
if [ "$MODE" != "2" ]; then
    if pm2 describe "$APP_FRONT" &>/dev/null; then
        pm2 restart "$APP_FRONT"
    else
        pm2 start "npm" --name "$APP_FRONT" -- run preview -- --port "$FRONT_PORT" --host
    fi
    log "Frontend iniciado via PM2 (preview) na porta $FRONT_PORT."
fi

# ── 4. Nginx (só no modo VPS) ────────────────
if [ "$MODE" == "2" ]; then
    step "4/4" "Configurando Nginx (VPS compartilhada)..."

    NGINX_CONF="/etc/nginx/sites-available/multiatendai"
    NGINX_LINK="/etc/nginx/sites-enabled/multiatendai"

    # IP puro → catch-all; domínio → server_name específico
    if echo "$SERVER_HOST" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
        SERVER_NAME="_"
        if grep -rl "server_name _;" /etc/nginx/sites-enabled/ 2>/dev/null | grep -vq "multiatendai"; then
            warn "Outro site já usa 'server_name _;' (catch-all). Podem ocorrer conflitos."
            warn "Recomendado: use um domínio/subdomínio para isolar os sites."
            read -rp "  Continuar mesmo assim? [s/N]: " CONFIRM_NGINX
            [[ "$CONFIRM_NGINX" =~ ^[Ss]$ ]] || err "Cancelado. Configure um domínio e tente novamente."
        fi
    else
        SERVER_NAME="$SERVER_HOST"
    fi

    cat > "$NGINX_CONF" <<EOF
server {
    listen $FRONT_PORT;
    server_name $SERVER_NAME;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;

    # Frontend — arquivos estáticos do build Vue
    location / {
        root $FRONT_PATH/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy para a API REST do backend
    location /api/ {
        proxy_pass http://127.0.0.1:$BACK_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    # Proxy para Socket.io (WebSocket)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:$BACK_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 3600s;
    }
}
EOF

    [ -L "$NGINX_LINK" ] && rm "$NGINX_LINK"
    ln -s "$NGINX_CONF" "$NGINX_LINK"

    if echo "$FRONT_PATH" | grep -q "^/root"; then
        chmod o+x /root 2>/dev/null || true
    fi

    # Testa antes de recarregar — não derruba outros sites se houver erro
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        log "Nginx recarregado (outros sites não foram afetados)."
    else
        err "Configuração do Nginx inválida. Verifique manualmente: sudo nginx -t"
    fi

    pm2 save
    pm2 startup 2>/dev/null | grep "sudo" | bash 2>/dev/null || true

    echo -e "\n${G}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${G}║          INSTALAÇÃO SaaS VPS CONCLUÍDA! 🚀              ║${NC}"
    echo -e "${G}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${G}║  App:       ${NC}$FRONTEND_API_URL"
    echo -e "${G}║  API:       ${NC}$FRONTEND_API_URL/api/status"
    echo -e "${G}║  Registro:  ${NC}$FRONTEND_API_URL/register"
    echo -e "${G}║  Backend:   ${NC}porta $BACK_PORT (interno, não exposta)"
    echo -e "${G}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${G}║  📌 Qualquer empresa pode se cadastrar acessando a URL  ║${NC}"
    echo -e "${G}║     e clicando em 'Criar Conta'.                        ║${NC}"
    echo -e "${G}╚══════════════════════════════════════════════════════════╝${NC}\n"
else
    step "4/4" "Modo Local — Nginx ignorado."
    pm2 save

    echo -e "\n${G}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${G}║          INSTALAÇÃO SaaS LOCAL CONCLUÍDA! 🚀            ║${NC}"
    echo -e "${G}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${G}║  Frontend:  ${NC}http://$SERVER_HOST:$FRONT_PORT"
    echo -e "${G}║  API:       ${NC}http://$SERVER_HOST:$BACK_PORT/api/status"
    echo -e "${G}║  Registro:  ${NC}http://$SERVER_HOST:$FRONT_PORT/register"
    echo -e "${G}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${G}║  Processos PM2:${NC}"
    echo -e "${G}║    pm2 logs $APP_BACK${NC}"
    echo -e "${G}║    pm2 logs $APP_FRONT${NC}"
    echo -e "${G}╚══════════════════════════════════════════════════════════╝${NC}\n"
fi
