# 🎣 Phishing Awareness Portal

Portal web completo para gerenciamento de campanhas internas de **conscientização sobre phishing**, com rastreamento real de cliques via AWS EC2.

> ⚠️ **Uso exclusivamente educativo e com autorização prévia da organização.**

---

## 📋 Funcionalidades

- Dashboard estilo Microsoft 365 com métricas em tempo real
- Importação de colaboradores via CSV/XLSX
- Rastreamento individual por token UUID
- Filtro automático de bots (Microsoft 365 Safe Links, Proofpoint, Mimecast, etc.)
- Exportação de resultados em CSV e Excel
- Script PowerShell para disparo de e-mails via Gmail SMTP
- Backend Node.js + Express hospedado em AWS EC2
- Gerenciamento de processos com PM2

---

## 🏗️ Arquitetura

```
[PowerShell Script]
      │  envia e-mail com link rastreado
      ▼
[Colaborador clica no link]
      │  GET /r/TOKEN
      ▼
[AWS EC2 - Node.js/Express]
      │  registra clique (nome, email, IP, navegador, SO)
      │  ignora bots automaticamente
      ▼
[Dashboard Web]
      │  exibe métricas, gráficos e tabela de resultados
```

---

## 🚀 Deploy — Passo a Passo

### 1. Requisitos

- AWS EC2 t3.micro (Ubuntu 22.04 LTS)
- Porta 3000 liberada no Security Group
- Node.js 20+
- PM2
- Conta Gmail com **Senha de App** habilitada

### 2. Configurar o servidor

```bash
# Conecte via SSH
ssh -i sua-chave.pem ubuntu@SEU_IP_EC2

# Instale Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instale PM2
sudo npm install -g pm2

# Clone ou faça upload dos arquivos para o servidor
# Estrutura esperada em: /home/ubuntu/phishing-portal/
```

### 3. Configurar variáveis

Edite os arquivos abaixo antes de subir ao servidor:

**`servidor/server.js`** — linha 19:
```js
const REDIRECT_URL = 'https://SUA_URL_DE_REDIRECIONAMENTO'
```

**`js/data.js`** — linha 13:
```js
const API_BASE = 'http://SEU_IP_EC2:3000'
```

**`disparar-campanha.ps1`** — linhas 18–21:
```powershell
$Remetente     = "seu-email@gmail.com"
$Assunto       = "Assunto do e-mail"
$UrlBase       = "http://SEU_IP_EC2:3000/r"
$EmailTeste    = "email-de-teste@suaempresa.com"
```

### 4. Instalar dependências e iniciar

```bash
cd /home/ubuntu/phishing-portal/servidor
npm install
pm2 start server.js --name "phishing-portal"
pm2 save
pm2 startup
```

### 5. Importar colaboradores

Coloque o arquivo `colaboradores.csv` na pasta `servidor/` com as colunas:

```
Nome,E-mail,Token
João Silva,joao.silva@empresa.com,uuid-token-aqui
```

Execute:
```bash
node importar.js
```

Ou importe diretamente pelo Dashboard → **Colaboradores → Importar**.

---

## 📧 Disparo de E-mails

### Pré-requisito: Senha de App do Gmail

1. Acesse [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Crie uma senha de app para "E-mail / Windows"
3. Use essa senha (16 caracteres) quando o script solicitar

### Testar com 1 destinatário

```powershell
# Em disparar-campanha.ps1
$EmailTeste = "seu-email@empresa.com"  # filtra apenas este
```

### Enviar para todos

```powershell
# Em disparar-campanha.ps1
$EmailTeste = ""  # envia para toda a lista
```

Execute:
```powershell
.\disparar-campanha.ps1
```

---

## 📊 Dashboard

Acesse: `http://SEU_IP_EC2:3000`

| Credencial | Valor padrão |
|---|---|
| Usuário | `admin` |
| Senha | `Admin@2025` |

> Altere a senha no primeiro acesso em **Configurações → Alterar Senha**.

---

## 🤖 Filtro de Bots

O servidor ignora automaticamente requisições de scanners conhecidos:

| Scanner | Descrição |
|---|---|
| Microsoft 365 Safe Links | Varre links antes da entrega ao usuário |
| Proofpoint / Mimecast | Gateways de segurança corporativos |
| Barracuda / IronPort | Filtros de e-mail empresariais |
| curl / wget / Python | Ferramentas de linha de comando |
| User-Agent vazio | Scanners genéricos |

---

## 📁 Estrutura de Arquivos

```
phishing-portal/
├── index.html              # Login
├── dashboard.html          # Painel principal
├── redirect.html           # Página de redirecionamento
├── css/
│   └── styles.css          # Estilos (Microsoft 365 design)
├── js/
│   ├── auth.js             # Autenticação / sessão
│   ├── data.js             # Gerenciamento de dados (API + localStorage)
│   └── dashboard.js        # Lógica do painel
├── servidor/
│   ├── server.js           # Backend Express
│   ├── package.json        # Dependências Node.js
│   ├── importar.js         # Script de importação CSV → JSON
│   └── data/               # Dados (gerado automaticamente)
│       ├── colaboradores.json
│       └── resultados.json
└── disparar-campanha.ps1   # Script de disparo (PowerShell)
```

---

## ⚖️ Aviso Legal

Este projeto foi desenvolvido para uso em **campanhas internas de conscientização sobre segurança da informação**, com **autorização explícita da organização**. O uso sem autorização é ilegal e antiético.

---

## 🛠️ Stack

![Node.js](https://img.shields.io/badge/Node.js-20-green)
![Express](https://img.shields.io/badge/Express-4.18-lightgrey)
![AWS EC2](https://img.shields.io/badge/AWS-EC2-orange)
![PM2](https://img.shields.io/badge/PM2-latest-blue)
![PowerShell](https://img.shields.io/badge/PowerShell-5.1-blue)
![Chart.js](https://img.shields.io/badge/Chart.js-4-pink)
