#!/bin/bash
# ================================================================
#  INSTALAR.SH — Instalação automática na EC2 Ubuntu
#  Execute com: bash instalar.sh
# ================================================================

echo ""
echo "  ================================================="
echo "  INSTALANDO PORTAL DE CONSCIENTIZACAO - PHISHING"
echo "  ================================================="
echo ""

# Atualiza o sistema
echo "[1/6] Atualizando pacotes..."
sudo apt-get update -y && sudo apt-get upgrade -y

# Instala Node.js 20
echo "[2/6] Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instala PM2 (gerenciador de processos)
echo "[3/6] Instalando PM2..."
sudo npm install -g pm2

# Cria diretório do portal
echo "[4/6] Configurando diretório..."
sudo mkdir -p /opt/phishing-portal
sudo cp -r . /opt/phishing-portal/
cd /opt/phishing-portal

# Instala dependências do Node
echo "[5/6] Instalando dependências..."
npm install --production

# Inicia com PM2
echo "[6/6] Iniciando servidor..."
pm2 start server.js --name "phishing-portal"
pm2 startup systemd -u $USER --hp $HOME
pm2 save

# Mostra IP público
IP=$(curl -s http://checkip.amazonaws.com)

echo ""
echo "  ================================================="
echo "  INSTALACAO CONCLUIDA!"
echo "  ================================================="
echo ""
echo "  URL do portal:    http://$IP:3000"
echo "  URL de redirect:  http://$IP:3000/r/TOKEN"
echo "  API metricas:     http://$IP:3000/api/metricas"
echo ""
echo "  Para ver logs: pm2 logs phishing-portal"
echo "  Para parar:    pm2 stop phishing-portal"
echo "  Para reiniciar: pm2 restart phishing-portal"
echo ""

# Configura firewall (libera porta 3000)
sudo ufw allow 3000/tcp 2>/dev/null || true

echo "  IMPORTANTE: Libere a porta 3000 no Security Group da AWS!"
echo "  (EC2 > Security Groups > Inbound Rules > Add Rule > TCP 3000)"
echo ""
