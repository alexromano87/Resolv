# 🚀 Guida Deploy Hetzner - Resolv (Passo-Passo)

> **Guida completa:** Da zero a produzione su Hetzner Cloud
> **Tempo stimato:** 3-4 ore
> **Difficoltà:** Intermedia
> **Data:** 18 Gennaio 2026

---

## 📋 Indice

1. [Setup Account Hetzner](#1-setup-account-hetzner)
2. [Creazione Server Cloud](#2-creazione-server-cloud)
3. [Configurazione Iniziale Server](#3-configurazione-iniziale-server)
4. [Installazione Docker & Docker Compose](#4-installazione-docker--docker-compose)
5. [Setup DNS & Dominio](#5-setup-dns--dominio)
6. [Configurazione Cloudflare](#6-configurazione-cloudflare)
7. [Deploy Applicazione](#7-deploy-applicazione)
8. [Configurazione SSL/HTTPS](#8-configurazione-sslhttps)
9. [Setup Database](#9-setup-database)
10. [Configurazione Backup](#10-configurazione-backup)
11. [Monitoring & Logs](#11-monitoring--logs)
12. [Testing & Go-Live](#12-testing--go-live)
13. [Troubleshooting](#13-troubleshooting)

---

## 🎯 Prerequisiti

Prima di iniziare, assicurati di avere:

- [ ] Carta di credito/PayPal per Hetzner
- [ ] Email valida
- [ ] Computer con terminale (Mac/Linux/Windows WSL)
- [ ] Repository Git di Resolv pronto
- [ ] Budget: ~€20/mese per infrastruttura base

**Tools necessari (verifica installazione):**

```bash
# Verifica Git
git --version
# Output: git version 2.x.x

# Verifica SSH
ssh -V
# Output: OpenSSH_x.x

# (Opzionale) Hetzner CLI
# Lo installeremo dopo
```

---

## 1️⃣ Setup Account Hetzner

### **Step 1.1: Registrazione**

1. Vai su [https://console.hetzner.cloud/](https://console.hetzner.cloud/)

2. Click **"Sign Up"** in alto a destra

3. Compila il form:
   ```
   Email: tua-email@example.com
   Password: [Strong password, min 12 caratteri]
   ```

4. Conferma email (riceverai email di verifica)

5. **Verifica account:**
   - Click link nella email
   - Login al Cloud Console

### **Step 1.2: Aggiunta Metodo di Pagamento**

1. Nel Cloud Console, vai a **Account** > **Billing**

2. Click **"Add payment method"**

3. Scegli:
   - **Credit Card** (raccomandato - attivazione immediata)
   - oppure **PayPal**

4. Inserisci dati carta/PayPal

5. **Verifica:** Hetzner farà una preautorizzazione di €1 (poi rimborsata)

**✅ Checkpoint:** Account attivo, metodo pagamento verificato

---

## 2️⃣ Creazione Server Cloud

### **Step 2.1: Crea Nuovo Progetto**

1. Nel Cloud Console, click **"New Project"**

2. Configura:
   ```
   Project Name: resolv-production
   ```

3. Click **"Add Project"**

### **Step 2.2: Crea Server**

1. All'interno del progetto, click **"Add Server"**

2. **Location:** Seleziona data center
   ```
   Raccomandato per Italia:
   - Falkenstein (FSN1) - Germania Sud
   - Nuremberg (NBG1) - Germania Sud

   Latenza Italia: ~20-30ms
   ```

   Click **Falkenstein** (FSN1)

3. **Image:** Sistema operativo
   ```
   Scegli: Ubuntu 22.04 (LTS)
   ```

   ⚠️ **NON** scegliere Docker image pre-installed (installeremo manualmente)

4. **Type:** Specifiche server
   ```
   Per MVP/Lancio (50-100 utenti):

   Shared vCPU > CPX31
   - 4 vCPU AMD EPYC
   - 8 GB RAM
   - 160 GB NVMe SSD
   - €11.90/mese
   ```

   Click **CPX31**

5. **Networking:**
   ```
   ✅ Public IPv4 (incluso)
   ✅ Public IPv6 (gratis, abilita!)
   [ ] Private Network (skip per ora)
   ```

6. **Firewall:** Click **"Create Firewall"**

   Configura regole:
   ```
   Nome Firewall: resolv-firewall

   Inbound Rules:

   Rule 1:
   - Protocol: TCP
   - Port: 22
   - Source: 0.0.0.0/0, ::/0
   - Description: SSH

   Rule 2:
   - Protocol: TCP
   - Port: 80
   - Source: 0.0.0.0/0, ::/0
   - Description: HTTP

   Rule 3:
   - Protocol: TCP
   - Port: 443
   - Source: 0.0.0.0/0, ::/0
   - Description: HTTPS

   Outbound Rules:
   - Allow all (default)
   ```

   Click **"Create Firewall"**

7. **SSH Keys:** ⚠️ **IMPORTANTE per sicurezza**

   **Se non hai già una chiave SSH:**

   ```bash
   # Sul tuo computer locale
   ssh-keygen -t ed25519 -C "resolv-production"

   # Premi Enter 3 volte (default location, no passphrase per automazione)
   # Output: chiave salvata in ~/.ssh/id_ed25519

   # Mostra chiave pubblica
   cat ~/.ssh/id_ed25519.pub
   # Copia output (inizia con ssh-ed25519 AAAA...)
   ```

   **Nel Cloud Console:**

   - Click **"Add SSH key"**
   - Incolla la chiave pubblica
   - Nome: `resolv-deploy-key`
   - Click **"Add SSH key"**
   - ✅ Seleziona la chiave appena creata

8. **Volumes:** Skip (non serve per ora)

9. **Backups:**
   ```
   ✅ Enable Backups (+20% costo = €2.38/mese)

   Raccomandato: SI
   - Backup automatici settimanali
   - Retention: 7 snapshot
   - Recovery rapido in caso disaster
   ```

10. **Placement Groups:** Skip

11. **Labels:** (Opzionale, utile per organizzazione)
    ```
    env: production
    app: resolv
    ```

12. **Cloud Config:** Skip (configureremo manualmente)

13. **Name:** Nome server
    ```
    resolv-app-01
    ```

14. **Riepilogo Costi:**
    ```
    Server CPX31: €11.90/mese
    Backups:      €2.38/mese
    IPv4:         Incluso
    Traffic:      20 TB inclusi

    TOTALE:       €14.28/mese (~€171/anno)
    ```

15. Click **"CREATE & BUY NOW"**

### **Step 2.3: Attendi Provisioning**

- Il server viene creato in **~60 secondi**
- Vedrai IP pubblico assegnato (es: `95.217.123.45`)
- Status: **Running** ✅

**✅ Checkpoint:** Server creato e running, IP pubblico assegnato

---

## 3️⃣ Configurazione Iniziale Server

### **Step 3.1: Primo Accesso SSH**

1. **Copia IP del server** dal Cloud Console

2. **Connettiti via SSH:**

   ```bash
   # Sostituisci YOUR_SERVER_IP con IP reale
   ssh root@YOUR_SERVER_IP

   # Esempio:
   ssh root@95.217.123.45
   ```

3. **Prima connessione:** Ti chiederà di verificare fingerprint
   ```
   The authenticity of host '95.217.123.45' can't be established.
   ED25519 key fingerprint is SHA256:xxxxxxxxxxxxxxxxxxxxx.
   Are you sure you want to continue connecting (yes/no/[fingerprint])?
   ```

   Digita: `yes` + Enter

4. **Sei dentro!** Dovresti vedere:
   ```
   root@resolv-app-01:~#
   ```

### **Step 3.2: Update Sistema**

```bash
# Update package list
apt update

# Upgrade packages (ci vogliono 2-3 minuti)
apt upgrade -y

# Install essentials
apt install -y \
  curl \
  wget \
  git \
  vim \
  htop \
  unzip \
  software-properties-common \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release
```

### **Step 3.3: Configura Firewall UFW**

```bash
# Install UFW (di solito già installato)
apt install -y ufw

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANTE: fai PRIMA di abilitare UFW!)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable firewall
ufw --force enable

# Verifica status
ufw status verbose
```

**Output atteso:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere                   # SSH
80/tcp                     ALLOW IN    Anywhere                   # HTTP
443/tcp                    ALLOW IN    Anywhere                   # HTTPS
```

### **Step 3.4: Crea Utente Deploy (Best Practice)**

⚠️ **Non usare root per deploy** - crea utente dedicato:

```bash
# Crea utente
useradd -m -s /bin/bash deploy

# Aggiungi a gruppo sudo
usermod -aG sudo deploy

# Imposta password
passwd deploy
# Inserisci password sicura (min 16 caratteri)

# Copia SSH keys da root a deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Test login (APRI NUOVO TERMINALE, non chiudere questo!)
# In un nuovo terminale:
ssh deploy@YOUR_SERVER_IP
```

**Se login funziona, puoi procedere come utente `deploy`**

### **Step 3.5: Configura Timezone**

```bash
# Imposta timezone Italia
timedatectl set-timezone Europe/Rome

# Verifica
timedatectl
```

**Output:**
```
Local time: Sat 2026-01-18 15:30:00 CET
Universal time: Sat 2026-01-18 14:30:00 UTC
Time zone: Europe/Rome (CET, +0100)
```

### **Step 3.6: Configura Hostname**

```bash
# Imposta hostname
hostnamectl set-hostname resolv-app-01

# Verifica
hostname
# Output: resolv-app-01

# Logout e riconnetti per vedere nuovo hostname nel prompt
exit
ssh deploy@YOUR_SERVER_IP
```

**✅ Checkpoint:** Sistema aggiornato, firewall configurato, utente deploy creato

---

## 4️⃣ Installazione Docker & Docker Compose

### **Step 4.1: Installa Docker**

```bash
# Remove old versions (se presenti)
sudo apt remove docker docker-engine docker.io containerd runc

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verifica installazione
docker --version
# Output: Docker version 24.x.x

docker compose version
# Output: Docker Compose version v2.x.x
```

### **Step 4.2: Configura Docker per Utente Deploy**

```bash
# Aggiungi deploy a gruppo docker
sudo usermod -aG docker deploy

# IMPORTANTE: Logout e riconnetti per applicare
exit
ssh deploy@YOUR_SERVER_IP

# Verifica (senza sudo)
docker ps
# Output: CONTAINER ID   IMAGE   COMMAND   ...
```

### **Step 4.3: Configura Docker Daemon**

```bash
# Crea configurazione
sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "dns": ["8.8.8.8", "8.8.4.4"]
}
EOF

# Restart Docker
sudo systemctl restart docker

# Verifica
sudo systemctl status docker
# Status: active (running) ✅
```

**✅ Checkpoint:** Docker e Docker Compose installati e funzionanti

---

## 5️⃣ Setup DNS & Dominio

### **Step 5.1: Registra Dominio**

**Opzione A: Acquista nuovo dominio**

Raccomandati (economici):
- [Namecheap.com](https://namecheap.com) - .it da €10/anno
- [Porkbun.com](https://porkbun.com) - .com da €8/anno
- [Cloudflare Registrar](https://cloudflare.com) - At-cost pricing

**Opzione B: Usa dominio esistente**

Procedi con il dominio che hai.

**Per questo esempio, useremo:** `resolv-app.it`

### **Step 5.2: Punta DNS a Hetzner**

**Se usi Cloudflare (raccomandato):**

1. Vai su [Cloudflare.com](https://cloudflare.com)
2. Login/Registrati
3. Click **"Add a Site"**
4. Inserisci dominio: `resolv-app.it`
5. Scegli piano: **Free** (sufficiente per MVP)
6. Cloudflare ti darà **nameservers** (es: `adam.ns.cloudflare.com`)
7. **Nel tuo registrar** (Namecheap/etc), cambia nameservers con quelli Cloudflare
8. Attendi propagazione (2-24 ore, solitamente 10 minuti)

**Se NON usi Cloudflare:**

Nel tuo provider DNS, crea record:

```
Type: A
Name: @
Value: YOUR_HETZNER_SERVER_IP (es: 95.217.123.45)
TTL: 3600

Type: A
Name: www
Value: YOUR_HETZNER_SERVER_IP
TTL: 3600
```

### **Step 5.3: Verifica Propagazione DNS**

```bash
# Dal tuo computer locale (non dal server!)
nslookup resolv-app.it

# Output atteso:
# Name:    resolv-app.it
# Address: 95.217.123.45

# Oppure
dig resolv-app.it +short
# Output: 95.217.123.45
```

Se non vedi ancora l'IP:
- Attendi 10-30 minuti
- Controlla configurazione DNS

**✅ Checkpoint:** Dominio registrato, DNS puntano al server

---

## 6️⃣ Configurazione Cloudflare

### **Step 6.1: Setup SSL/TLS**

1. Cloudflare Dashboard > **SSL/TLS**

2. Scegli mode: **Full (strict)** (raccomandato)
   - Cloudflare ↔ Origin server: HTTPS
   - Client ↔ Cloudflare: HTTPS

3. **Always Use HTTPS:** ON

4. **Minimum TLS Version:** TLS 1.2

5. **Automatic HTTPS Rewrites:** ON

### **Step 6.2: Setup Page Rules (Opzionale)**

1. Dashboard > **Rules** > **Page Rules**

2. Crea regola per caching assets:
   ```
   URL: resolv-app.it/assets/*

   Settings:
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 month
   ```

### **Step 6.3: Setup Firewall (WAF)**

1. Dashboard > **Security** > **WAF**

2. Managed Rules: **Cloudflare Managed Ruleset** → ON

3. (Opzionale) OWASP Ruleset → ON

### **Step 6.4: DNS Records Cloudflare**

1. Dashboard > **DNS** > **Records**

2. Verifica/crea:
   ```
   Type: A
   Name: @
   IPv4: YOUR_SERVER_IP
   Proxy: ✅ Proxied (arancione)

   Type: A
   Name: www
   IPv4: YOUR_SERVER_IP
   Proxy: ✅ Proxied
   ```

3. **Proxied (arancione cloud)** = Traffico passa da Cloudflare CDN

**✅ Checkpoint:** Cloudflare configurato, SSL attivo

---

## 7️⃣ Deploy Applicazione

### **Step 7.1: Clone Repository**

```bash
# Sul server, come utente deploy
cd /opt
sudo mkdir resolv
sudo chown deploy:deploy resolv
cd resolv

# Clone repo (usa HTTPS per semplicità)
git clone https://github.com/YOUR-ORG/resolv.git .

# Oppure se repo privato:
git clone https://YOUR_TOKEN@github.com/YOUR-ORG/resolv.git .

# Verifica
ls -la
# Dovresti vedere: apps/ docker-compose.yml ecc.
```

### **Step 7.2: Configura Variabili Ambiente**

```bash
# Copia template
cp .env.example .env

# Edita .env
nano .env
```

**Configura variabili PRODUCTION:**

```bash
# =============================================================================
# ENVIRONMENT
# =============================================================================
NODE_ENV=production

# =============================================================================
# DATABASE
# =============================================================================
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=recupero_crediti
DB_USERNAME=rc_user
DB_PASSWORD=GENERA_PASSWORD_SICURA_QUI  # openssl rand -base64 32

MYSQL_ROOT_PASSWORD=GENERA_ROOT_PASSWORD_QUI  # openssl rand -base64 32

# =============================================================================
# JWT
# =============================================================================
JWT_SECRET=GENERA_JWT_SECRET_QUI  # openssl rand -base64 64
JWT_REFRESH_SECRET=GENERA_JWT_REFRESH_SECRET_QUI  # openssl rand -base64 64
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# =============================================================================
# CORS
# =============================================================================
CORS_ORIGINS=https://resolv-app.it,https://www.resolv-app.it

# =============================================================================
# FRONTEND
# =============================================================================
VITE_API_URL=https://resolv-app.it/api

# =============================================================================
# BACKUP
# =============================================================================
BACKUP_SCHEDULE_INTERVAL=86400000
BACKUP_MAX_COUNT=30
BACKUP_RETENTION_DAYS=30

# =============================================================================
# RATE LIMITING
# =============================================================================
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100

# =============================================================================
# SECURITY
# =============================================================================
ENABLE_HELMET=true

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=info
LOG_TO_FILE=true

# =============================================================================
# MONITORING (configureremo dopo)
# =============================================================================
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# =============================================================================
# REDIS
# =============================================================================
REDIS_HOST=redis
REDIS_PORT=6379

# =============================================================================
# EMAIL (configureremo dopo)
# =============================================================================
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@resolv-app.it
```

**Genera password sicure:**

```bash
# Sul server
openssl rand -base64 32
# Usa output per DB_PASSWORD

openssl rand -base64 32
# Usa output per MYSQL_ROOT_PASSWORD

openssl rand -base64 64
# Usa output per JWT_SECRET

openssl rand -base64 64
# Usa output per JWT_REFRESH_SECRET
```

**Salva file:** Ctrl+O, Enter, Ctrl+X

### **Step 7.3: Crea docker-compose.prod.yml**

Il repository ha già `docker-compose.prod.yml`. Verifica:

```bash
cat docker-compose.prod.yml
```

Se non c'è, crealo:

```bash
nano docker-compose.prod.yml
```

Copia contenuto dal repository o usa configurazione base.

### **Step 7.4: Build Immagini**

```bash
# Build frontend
cd /opt/resolv/apps/frontend
npm install
npm run build

# Verifica build
ls -lh dist/
# Dovresti vedere index.html, assets/, ecc.

# Torna a root
cd /opt/resolv
```

### **Step 7.5: Avvia Stack**

```bash
# Pull immagini base
docker compose -f docker-compose.prod.yml pull

# Avvia servizi
docker compose -f docker-compose.prod.yml up -d

# Verifica containers
docker compose -f docker-compose.prod.yml ps
```

**Output atteso:**
```
NAME                STATUS              PORTS
resolv-mysql        running             3306/tcp
resolv-redis        running             6379/tcp
resolv-backend      running             3000/tcp
resolv-frontend     running             80/tcp, 443/tcp
resolv-nginx        running             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### **Step 7.6: Verifica Logs**

```bash
# Logs tutti i servizi
docker compose -f docker-compose.prod.yml logs -f

# Logs solo backend
docker compose -f docker-compose.prod.yml logs -f backend

# Logs solo nginx
docker compose -f docker-compose.prod.yml logs -f nginx

# Ctrl+C per uscire
```

**Cerca errori:**
- ✅ `Backend listening on port 3000` = OK
- ✅ `MySQL connected` = OK
- ❌ `ECONNREFUSED` = Problema connessione DB
- ❌ `Cannot find module` = Dipendenze mancanti

**✅ Checkpoint:** Applicazione running, containers healthy

---

## 8️⃣ Configurazione SSL/HTTPS

### **Step 8.1: Genera Certificati Let's Encrypt**

```bash
# Crea directory per certbot
mkdir -p /opt/resolv/certbot/conf
mkdir -p /opt/resolv/certbot/www

# Test che Nginx risponda su porta 80
curl http://localhost
# Dovresti vedere HTML di Resolv

# Genera certificati (SOSTITUISCI con il tuo dominio ed email!)
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email tua-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d resolv-app.it \
  -d www.resolv-app.it
```

**Output atteso:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/resolv-app.it/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/resolv-app.it/privkey.pem
```

### **Step 8.2: Configura Nginx per HTTPS**

```bash
# Edita nginx.conf
nano nginx.conf
```

Assicurati che contenga:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name resolv-app.it www.resolv-app.it;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name resolv-app.it www.resolv-app.it;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/resolv-app.it/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/resolv-app.it/privkey.pem;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend
    location / {
        root /var/www/resolv/frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Salva:** Ctrl+O, Enter, Ctrl+X

### **Step 8.3: Restart Nginx**

```bash
# Restart nginx per applicare config
docker compose -f docker-compose.prod.yml restart nginx

# Verifica logs
docker compose -f docker-compose.prod.yml logs nginx
# Cerca errori, deve dire "nginx: configuration file ... test is successful"
```

### **Step 8.4: Test HTTPS**

```bash
# Test da server
curl -I https://resolv-app.it

# Output atteso:
# HTTP/2 200
# server: nginx
# strict-transport-security: max-age=31536000
```

**Test da browser:**
1. Apri `https://resolv-app.it`
2. Verifica lucchetto verde 🔒
3. Click lucchetto > Certificato valido ✅

### **Step 8.5: Test SSL Rating**

1. Vai su [SSL Labs](https://www.ssllabs.com/ssltest/)
2. Inserisci: `resolv-app.it`
3. Click **"Submit"**
4. Attendi 2-3 minuti
5. **Target rating:** A o A+ ✅

**✅ Checkpoint:** HTTPS funzionante, certificati SSL validi, rating A/A+

---

## 9️⃣ Setup Database

### **Step 9.1: Verifica Database Running**

```bash
# Verifica container MySQL
docker compose -f docker-compose.prod.yml ps mysql

# Dovrebbe essere: STATUS = running (healthy)
```

### **Step 9.2: Esegui Migrations**

```bash
# Accedi al container backend
docker compose -f docker-compose.prod.yml exec backend bash

# Dentro il container
npm run migration:run

# Output atteso:
# Migration TableInit1234567890 has been executed successfully
# Migration SeedData1234567891 has been executed successfully

# Exit container
exit
```

### **Step 9.3: Seed Admin User**

```bash
# Seed utente admin di default
docker compose -f docker-compose.prod.yml exec backend npm run seed:admin

# Output atteso:
# ✅ Admin user created successfully
# Email: admin@resolv.it
# Password: Admin123!
#
# ⚠️ IMPORTANTE: Cambia password al primo login!
```

### **Step 9.4: Verifica Database**

```bash
# Connetti a MySQL
docker compose -f docker-compose.prod.yml exec mysql mysql -u rc_user -p

# Inserisci password (quella in .env per DB_PASSWORD)

# Comandi MySQL:
USE recupero_crediti;
SHOW TABLES;

# Dovresti vedere:
# +---------------------------+
# | Tables_in_recupero_crediti|
# +---------------------------+
# | users                     |
# | clienti                   |
# | debitori                  |
# | pratiche                  |
# | ... (altre tabelle)       |
# +---------------------------+

# Verifica admin user
SELECT id, email, nome, cognome, ruolo FROM users WHERE ruolo = 'admin';

# Output:
# | id | email           | nome  | cognome | ruolo |
# |  1 | admin@resolv.it | Admin | User    | admin |

# Exit MySQL
exit
```

**✅ Checkpoint:** Database popolato, migrations eseguite, admin user creato

---

## 🔟 Configurazione Backup

### **Step 10.1: Setup Storage Box Hetzner**

1. **Hetzner Cloud Console** > **Projects** > `resolv-production`

2. Menu laterale > **Storage Boxes** (sotto "Products")

3. Click **"Order Storage Box"**

4. Scegli:
   ```
   Size: BX11 - 100 GB
   Location: Stesso del server (FSN1/NBG1)
   Prezzo: €3.81/mese
   ```

5. Click **"Order now"**

6. **Attendi email** con credenziali (arriva in ~5 minuti)
   ```
   Host: uXXXXXX.your-storagebox.de
   Username: uXXXXXX
   Password: XXXXXXXXXX
   ```

### **Step 10.2: Configura Backup Script**

```bash
# Sul server
nano /opt/resolv/backup.sh
```

Incolla:

```bash
#!/bin/bash

# Resolv Backup Script
# Esegue backup MySQL e upload su Storage Box Hetzner

set -e

# Configurazione
BACKUP_DIR="/opt/resolv/backups"
STORAGE_BOX_HOST="uXXXXXX.your-storagebox.de"  # SOSTITUISCI
STORAGE_BOX_USER="uXXXXXX"  # SOSTITUISCI
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="backup-$DATE.sql.gz"

# Crea directory backup
mkdir -p $BACKUP_DIR

# Backup database
echo "🔄 Creating database backup..."
docker compose -f /opt/resolv/docker-compose.prod.yml exec -T mysql \
  mysqldump -u rc_user -p$DB_PASSWORD recupero_crediti | gzip > $BACKUP_DIR/$BACKUP_FILE

echo "✅ Backup created: $BACKUP_FILE"

# Upload a Storage Box (via SCP)
echo "🔄 Uploading to Storage Box..."
sshpass -p "$STORAGE_BOX_PASSWORD" scp -o StrictHostKeyChecking=no \
  $BACKUP_DIR/$BACKUP_FILE \
  $STORAGE_BOX_USER@$STORAGE_BOX_HOST:backups/

echo "✅ Backup uploaded to Storage Box"

# Pulizia backup locali vecchi (> 7 giorni)
echo "🧹 Cleaning old local backups..."
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed successfully!"
```

**Salva:** Ctrl+O, Enter, Ctrl+X

**Rendi eseguibile:**

```bash
chmod +x /opt/resolv/backup.sh

# Installa sshpass per upload automatico
sudo apt install -y sshpass
```

**Crea file password Storage Box:**

```bash
nano /opt/resolv/.storage-box-password
```

Incolla password Storage Box ricevuta via email.

**Salva e proteggi:**

```bash
chmod 600 /opt/resolv/.storage-box-password
```

**Edita script per usare file password:**

```bash
nano /opt/resolv/backup.sh
```

Aggiungi all'inizio:

```bash
STORAGE_BOX_PASSWORD=$(cat /opt/resolv/.storage-box-password)
```

### **Step 10.3: Automatizza Backup con Cron**

```bash
# Edita crontab
crontab -e

# Aggiungi (backup giornaliero alle 2:00 AM):
0 2 * * * /opt/resolv/backup.sh >> /opt/resolv/backup.log 2>&1
```

**Salva:** Ctrl+O, Enter, Ctrl+X

**Test manuale:**

```bash
# Esegui backup manuale
/opt/resolv/backup.sh

# Verifica output
cat /opt/resolv/backup.log
```

### **Step 10.4: Verifica Backup su Storage Box**

```bash
# Lista backup su Storage Box
ssh uXXXXXX@uXXXXXX.your-storagebox.de ls -lh backups/

# Dovresti vedere:
# -rw-r--r-- 1 uXXXXXX uXXXXXX 1.2M Jan 18 02:00 backup-2026-01-18_02-00-00.sql.gz
```

**✅ Checkpoint:** Backup automatici configurati, Storage Box funzionante

---

## 1️⃣1️⃣ Monitoring & Logs

### **Step 11.1: Setup Uptime Kuma (Monitoring)**

```bash
# Aggiungi al docker-compose.prod.yml
nano docker-compose.prod.yml
```

Aggiungi servizio:

```yaml
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: resolv-uptime-kuma
    restart: always
    volumes:
      - uptime_data:/app/data
    ports:
      - "3001:3001"
    networks:
      - resolv-network
```

E aggiungi volume:

```yaml
volumes:
  uptime_data:
    driver: local
```

**Avvia:**

```bash
docker compose -f docker-compose.prod.yml up -d uptime-kuma
```

**Accedi a Uptime Kuma:**

1. Apri browser: `http://YOUR_SERVER_IP:3001`
2. Crea account admin
3. Add monitor:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: Resolv Frontend
   URL: https://resolv-app.it
   Heartbeat Interval: 60 seconds
   ```

4. Add monitor backend:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: Resolv API
   URL: https://resolv-app.it/api/health/live
   Heartbeat Interval: 60 seconds
   ```

### **Step 11.2: Configura Log Rotation**

```bash
# Crea config logrotate
sudo nano /etc/logrotate.d/resolv
```

Incolla:

```
/opt/resolv/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        docker compose -f /opt/resolv/docker-compose.prod.yml restart backend
    endscript
}
```

**Test:**

```bash
sudo logrotate -d /etc/logrotate.d/resolv
# Output: simula rotazione, verifica no errori
```

### **Step 11.3: Setup Sentry (Error Tracking)**

1. Vai su [sentry.io](https://sentry.io)
2. Registrati (piano Free: 5K errori/mese)
3. Create Project:
   ```
   Platform: Node.js
   Project name: resolv-backend
   ```

4. Copia **DSN** mostrato (es: `https://abc123@o123456.ingest.sentry.io/987654`)

5. **Sul server, edita .env:**

   ```bash
   nano /opt/resolv/.env
   ```

   Aggiungi:

   ```bash
   SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/987654
   SENTRY_ENVIRONMENT=production
   ```

6. **Restart backend:**

   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```

7. **Test Sentry:**

   Apri `https://resolv-app.it/test/sentry/error` (se hai endpoint di test)

   Oppure triggera errore manualmente e verifica su Sentry dashboard.

**✅ Checkpoint:** Monitoring attivo, logs configurati, Sentry tracking errori

---

## 1️⃣2️⃣ Testing & Go-Live

### **Step 12.1: Smoke Tests**

```bash
# Test 1: Frontend accessible
curl -I https://resolv-app.it
# Expected: HTTP/2 200

# Test 2: API health check
curl https://resolv-app.it/api/health/live
# Expected: {"status":"ok"}

# Test 3: Login endpoint
curl -X POST https://resolv-app.it/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@resolv.it","password":"Admin123!"}'
# Expected: {"access_token":"..."}

# Test 4: Database connectivity
docker compose -f docker-compose.prod.yml exec mysql mysqladmin ping
# Expected: mysqld is alive
```

### **Step 12.2: End-to-End Test**

**Da browser:**

1. Apri `https://resolv-app.it`
2. Verifica:
   - ✅ Pagina carica senza errori
   - ✅ HTTPS lucchetto verde
   - ✅ No warning console

3. Login:
   ```
   Email: admin@resolv.it
   Password: Admin123!
   ```

4. Verifica dashboard carica

5. Prova creare pratica test

6. Logout

### **Step 12.3: Performance Test**

```bash
# Install Apache Bench (se non già presente)
sudo apt install -y apache2-utils

# Test 1: Homepage (100 richieste, 10 concorrenti)
ab -n 100 -c 10 https://resolv-app.it/

# Risultati attesi:
# Requests per second: > 100
# Time per request: < 100ms (mean)
# Failed requests: 0

# Test 2: API endpoint
ab -n 100 -c 10 https://resolv-app.it/api/health/live

# Risultati attesi:
# Requests per second: > 200
# Time per request: < 50ms
```

### **Step 12.4: Security Test**

```bash
# Test SSL
curl -I https://resolv-app.it | grep -i strict-transport-security
# Expected: strict-transport-security: max-age=31536000

# Test headers
curl -I https://resolv-app.it | grep -i x-frame-options
# Expected: x-frame-options: SAMEORIGIN

# Test HTTP redirect
curl -I http://resolv-app.it
# Expected: HTTP/1.1 301 Moved Permanently
# Expected: Location: https://...
```

### **Step 12.5: Backup Test**

```bash
# Test backup manuale
/opt/resolv/backup.sh

# Verifica backup creato
ls -lh /opt/resolv/backups/

# Test restore (NON su produzione!)
# (Fai su ambiente separato o commenta)
# gunzip < /opt/resolv/backups/backup-latest.sql.gz | \
# docker compose exec -T mysql mysql -u rc_user -p$DB_PASSWORD recupero_crediti
```

### **Step 12.6: Monitoring Check**

1. **Uptime Kuma:** `http://YOUR_SERVER_IP:3001`
   - ✅ Tutti i monitor green
   - ✅ Uptime 100%

2. **Sentry:** `https://sentry.io`
   - ✅ Zero critical errors
   - ✅ Performance metrics visibili

3. **Server Resources:**

   ```bash
   # CPU usage
   htop
   # Dovrebbe essere < 30% idle

   # Disk space
   df -h
   # /dev/sda1 dovrebbe avere > 50% free

   # Memory
   free -h
   # Available dovrebbe essere > 2GB
   ```

### **Step 12.7: Go-Live Checklist**

```
Pre-Launch:
[ ] DNS propagato (nslookup funziona)
[ ] HTTPS funzionante (SSL A rating)
[ ] Firewall configurato (UFW attivo)
[ ] Backup automatici configurati
[ ] Monitoring attivo (Uptime Kuma)
[ ] Error tracking attivo (Sentry)
[ ] Database migrations eseguite
[ ] Admin user creato
[ ] Smoke tests passati
[ ] Performance test passati
[ ] Security headers verificati

Post-Launch:
[ ] Monitorare logs per 24h
[ ] Verificare backup giornaliero eseguito
[ ] Controllare Sentry per errori
[ ] Verificare uptime
[ ] Collezionare feedback utenti
```

### **Step 12.8: GO-LIVE! 🚀**

Se tutti i check passano:

```bash
# Annuncia go-live
echo "🚀 Resolv is LIVE on https://resolv-app.it"

# Monitora logs in tempo reale
docker compose -f docker-compose.prod.yml logs -f
```

**Congratulazioni! 🎉 Resolv è online!**

**✅ Checkpoint:** Applicazione testata, tutto funzionante, GO-LIVE ✅

---

## 1️⃣3️⃣ Troubleshooting

### **Problema 1: Container non si avvia**

```bash
# Verifica logs
docker compose -f docker-compose.prod.yml logs CONTAINER_NAME

# Verifica configurazione
docker compose -f docker-compose.prod.yml config

# Restart singolo container
docker compose -f docker-compose.prod.yml restart CONTAINER_NAME

# Rebuild se necessario
docker compose -f docker-compose.prod.yml up -d --build CONTAINER_NAME
```

### **Problema 2: Database connection refused**

```bash
# Verifica MySQL running
docker compose -f docker-compose.prod.yml ps mysql

# Verifica network
docker network ls
docker network inspect resolv-network

# Test connessione da backend
docker compose -f docker-compose.prod.yml exec backend ping mysql

# Verifica credenziali in .env
cat .env | grep DB_
```

### **Problema 3: Frontend 404**

```bash
# Verifica build frontend
ls -la apps/frontend/dist/

# Se vuota, rebuild
cd apps/frontend
npm run build

# Verifica nginx config
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### **Problema 4: SSL certificate error**

```bash
# Verifica certificati
sudo ls -la /opt/resolv/certbot/conf/live/resolv-app.it/

# Rigenera se scaduti
docker compose -f docker-compose.prod.yml run --rm certbot renew

# Verifica nginx usa certificati corretti
docker compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/conf.d/default.conf | grep ssl_certificate
```

### **Problema 5: Out of memory**

```bash
# Verifica memoria
free -h

# Identifica processo che usa più memoria
docker stats

# Se necessario, aggiungi swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Rendi permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### **Problema 6: Disk full**

```bash
# Verifica spazio
df -h

# Pulisci Docker
docker system prune -af --volumes

# Pulisci logs
sudo journalctl --vacuum-time=7d

# Pulisci backup vecchi
find /opt/resolv/backups -name "*.sql.gz" -mtime +30 -delete
```

### **Problema 7: Port already in use**

```bash
# Trova processo su porta 80
sudo lsof -i :80

# Kill processo
sudo kill -9 PID

# Oppure cambia porta in docker-compose
# Modifica: "8080:80" invece di "80:80"
```

---

## 📚 Comandi Utili

### **Docker Management**

```bash
# Restart tutto
docker compose -f docker-compose.prod.yml restart

# Stop tutto
docker compose -f docker-compose.prod.yml stop

# Start tutto
docker compose -f docker-compose.prod.yml start

# Logs
docker compose -f docker-compose.prod.yml logs -f

# Stats (CPU/RAM)
docker stats

# Pulizia
docker system prune -af
```

### **Database Management**

```bash
# Backup manuale
docker compose -f docker-compose.prod.yml exec mysql \
  mysqldump -u rc_user -p recupero_crediti > backup.sql

# Restore
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T mysql \
  mysql -u rc_user -p recupero_crediti

# Connetti a MySQL
docker compose -f docker-compose.prod.yml exec mysql \
  mysql -u rc_user -p
```

### **Monitoring**

```bash
# Resource usage
htop

# Disk space
df -h

# Network
netstat -tuln

# Processes
ps aux | grep node
```

---

## 🎓 Best Practices

### **Security**

1. ✅ **Mai usare password deboli**
2. ✅ **Aggiorna sistema regolarmente:** `sudo apt update && sudo apt upgrade`
3. ✅ **Monitora logs per attività sospette**
4. ✅ **Usa SSH keys, non password SSH**
5. ✅ **Configura fail2ban** per brute-force protection

### **Performance**

1. ✅ **Usa CDN (Cloudflare) per assets statici**
2. ✅ **Abilita caching Redis**
3. ✅ **Monitora query lente** (MySQL slow query log)
4. ✅ **Ottimizza immagini** (comprimi assets frontend)

### **Backup**

1. ✅ **Test restore regolarmente** (almeno mensile)
2. ✅ **Backup offsite** (Storage Box + S3 Glacier)
3. ✅ **Verifica backup automatici** eseguiti
4. ✅ **Documenta recovery procedure**

### **Monitoring**

1. ✅ **Setup alerting** (email/Slack su downtime)
2. ✅ **Track error rate** (Sentry)
3. ✅ **Monitor disk space** (alert < 20% free)
4. ✅ **Check SSL expiry** (Let's Encrypt auto-renew)

---

## 🚀 Next Steps

### **Post Go-Live (Prima Settimana)**

1. [ ] Monitora logs 24/7 prima settimana
2. [ ] Verifica backup giornalieri eseguiti
3. [ ] Test restore da backup
4. [ ] Colleziona feedback utenti
5. [ ] Fixa bug critici immediatamente

### **Optimization (Primo Mese)**

1. [ ] Analizza performance con tools (Lighthouse)
2. [ ] Ottimizza query database lente
3. [ ] Setup CDN per assets pesanti
4. [ ] Configura rate limiting per API
5. [ ] Implementa caching aggressivo

### **Scaling (Quando Necessario)**

1. [ ] Aggiungi secondo server per HA
2. [ ] Setup Load Balancer Hetzner
3. [ ] Migrate a Managed Database
4. [ ] Setup Redis cluster
5. [ ] Considera Kubernetes (solo se >500 utenti)

---

## 📞 Supporto

### **Hetzner Support**

- **Email:** support@hetzner.com
- **Forum:** https://community.hetzner.com/
- **Status:** https://status.hetzner.com/

### **Emergency Contacts**

```
On-Call DevOps: [TUO NUMERO]
Escalation: [MANAGER NUMERO]
Email: ops@resolv-app.it
```

### **Useful Resources**

- [Hetzner Docs](https://docs.hetzner.com/)
- [Docker Docs](https://docs.docker.com/)
- [Nginx Docs](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)

---

**Documento Versione:** 1.0
**Ultima Revisione:** 18 Gennaio 2026
**Autore:** Resolv DevOps Team
**Prossimo Review:** Post Go-Live

---

## ✅ Congratulazioni!

Hai completato il deploy di **Resolv** su **Hetzner Cloud**! 🎉

La tua applicazione è ora:
- ✅ **Sicura** (HTTPS, firewall, SSH keys)
- ✅ **Monitorata** (Uptime Kuma, Sentry)
- ✅ **Backed up** (Storage Box automatico)
- ✅ **Scalabile** (pronta per crescita)
- ✅ **GDPR compliant** (data center EU)

**Costo totale:** ~€15-20/mese (~€200/anno)

**Buon lavoro! 🚀**
