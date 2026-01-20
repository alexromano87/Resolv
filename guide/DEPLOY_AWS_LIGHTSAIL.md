# Guida Completa - Deploy Resolv su AWS Lightsail

Guida passo-passo per deployare l'applicazione Resolv su un'istanza AWS Lightsail e renderla accessibile al tuo collaboratore.

---

## 📋 Indice

1. [Prerequisiti](#prerequisiti)
2. [Creazione Istanza Lightsail](#creazione-istanza-lightsail)
3. [Configurazione Server](#configurazione-server)
4. [Deploy Applicazione](#deploy-applicazione)
5. [Configurazione Dominio (Opzionale)](#configurazione-dominio)
6. [Configurazione SSL](#configurazione-ssl)
7. [Test e Verifica](#test-e-verifica)
8. [Condivisione con Collaboratore](#condivisione-con-collaboratore)
9. [Manutenzione e Troubleshooting](#manutenzione-e-troubleshooting)

---

## 1. Prerequisiti

### Cosa ti serve:

- ✅ Account AWS attivo
- ✅ Carta di credito registrata su AWS
- ✅ Codice sorgente Resolv (questo progetto)
- ✅ Client SSH (Terminal su Mac/Linux, PuTTY su Windows)
- ✅ (Opzionale) Dominio personalizzato

### Costi stimati AWS Lightsail:

- **Piano consigliato**: $10/mese (2 GB RAM, 1 CPU, 60 GB SSD)
- **Piano minimo**: $5/mese (1 GB RAM, 1 CPU, 40 GB SSD) - potrebbe essere lento
- **Traffico incluso**: 2 TB/mese (più che sufficiente per demo)

---

## 2. Creazione Istanza Lightsail

### Passo 2.1: Accesso Console AWS

1. Vai su https://aws.amazon.com
2. Clicca **Sign In to the Console**
3. Accedi con le tue credenziali
4. Nella barra di ricerca cerca **Lightsail**
5. Clicca su **Amazon Lightsail**

### Passo 2.2: Crea Nuova Istanza

1. Clicca su **Create instance** (bottone arancione)

2. **Seleziona posizione istanza:**
   - Region: `EU (Frankfurt)` - eu-central-1 (più vicina all'Italia)
   - Availability Zone: lascia default (eu-central-1a)

3. **Seleziona piattaforma:**
   - Clicca su **Linux/Unix**

4. **Seleziona blueprint:**
   - Clicca su **OS Only**
   - Seleziona **Ubuntu 22.04 LTS** (più stabile e supportata)

5. **Abilita script di lancio (opzionale ma consigliato):**

   Clicca su **+ Add launch script** e incolla:

   ```bash
   #!/bin/bash
   # Update system
   apt-get update
   apt-get upgrade -y

   # Install essential tools
   apt-get install -y curl git nano ufw fail2ban

   # Configure firewall
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw --force enable

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   usermod -aG docker ubuntu

   # Install Docker Compose
   curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   chmod +x /usr/local/bin/docker-compose

   # Cleanup
   rm get-docker.sh

   echo "Setup completato!" > /home/ubuntu/setup-complete.txt
   ```

6. **Seleziona piano istanza:**

   **CONSIGLIATO per produzione/demo:**
   - Piano: **$10 USD/mese**
   - RAM: 2 GB
   - CPU: 1 vCPU
   - Storage: 60 GB SSD
   - Traffico: 2 TB

   **MINIMO per test (potrebbe essere lento):**
   - Piano: **$5 USD/mese**
   - RAM: 1 GB
   - CPU: 1 vCPU
   - Storage: 40 GB SSD
   - Traffico: 1 TB

7. **Dai un nome all'istanza:**
   - Nome: `resolv-production` (o come preferisci)

8. **Crea l'istanza:**
   - Clicca su **Create instance**
   - Attendi 2-3 minuti per la creazione

### Passo 2.3: Configura Networking

1. Nella dashboard Lightsail, clicca sulla tua istanza `resolv-production`

2. Vai al tab **Networking**

3. **Verifica che le porte siano aperte:**
   - SSH (22) ✅
   - HTTP (80) ✅
   - HTTPS (443) ✅

4. **Crea IP Statico (IMPORTANTE):**
   - Clicca su **Create static IP**
   - Nome: `resolv-static-ip`
   - Clicca **Create**
   - **Annota questo IP** - sarà l'indirizzo della tua applicazione

   Esempio: `3.120.81.201`

### Passo 2.4: Scarica Chiave SSH

1. Vai al tab **Connect** della tua istanza
2. Clicca su **Account page** nel messaggio "Use your own SSH client"
3. Nella pagina SSH keys, clicca **Download** per la tua regione (eu-central-1)
4. Salva il file (es. `LightsailDefaultKey-eu-central-1.pem`)
5. Su Mac/Linux, proteggi la chiave:
   ```bash
   chmod 600 ~/Downloads/LightsailDefaultKey-eu-central-1.pem
   ```

---

## 3. Configurazione Server

### Passo 3.1: Connessione SSH

**Opzione A: Browser SSH (più semplice)**

1. Nella console Lightsail, clicca sulla tua istanza
2. Clicca sul bottone arancione **Connect using SSH**
3. Si aprirà un terminale nel browser

**Opzione B: SSH da terminale locale (consigliato)**

```bash
# Mac/Linux
ssh -i ~/Downloads/LightsailDefaultKey-eu-central-1.pem ubuntu@3.120.81.201

# Sostituisci 3.120.81.201 con il TUO IP statico
```

**Opzione C: Windows con PuTTY**

1. Scarica PuTTY da https://www.putty.org/
2. Usa PuTTYgen per convertire .pem in .ppk
3. Connettiti usando PuTTY con la chiave .ppk

### Passo 3.2: Verifica Setup Automatico

Una volta connesso via SSH:

```bash
# Verifica che lo script di setup sia completato
cat /home/ubuntu/setup-complete.txt

# Dovrebbe mostrare: "Setup completato!"

# Verifica Docker installato
docker --version
docker-compose --version

# Verifica firewall attivo
sudo ufw status
```

Se qualcosa manca, installa manualmente:

```bash
# Se Docker non è installato
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Se Docker Compose non è installato
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# IMPORTANTE: Logout e login per applicare gruppo docker
exit
# Riconnettiti
ssh -i ~/Downloads/LightsailDefaultKey-eu-central-1.pem ubuntu@3.120.81.201
```

### Passo 3.3: Configura Swap (IMPORTANTE per istanze con poca RAM)

Se usi il piano da $5 (1GB RAM), aggiungi swap:

```bash
# Crea file swap da 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Rendi permanente
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verifica
free -h
```

---

## 4. Deploy Applicazione

### Passo 4.1: Carica Codice sul Server

**Opzione A: Git Clone (consigliato se hai repo privato)**

```bash
# Se hai il codice su GitHub/GitLab
cd /home/ubuntu
git clone https://github.com/tuousername/resolv.git
cd resolv
```

**Opzione B: Upload da locale con SCP**

Dalla tua macchina locale:

```bash
# Mac/Linux
cd /Users/alessandroromano/Desktop
scp -i ~/Downloads/LightsailDefaultKey-eu-central-1.pem -r Resolv ubuntu@3.120.81.201:/home/ubuntu/

# Windows con WinSCP o FileZilla
# Host: 3.120.81.201
# Username: ubuntu
# Key file: LightsailDefaultKey-eu-central-1.pem
```

**Opzione C: Tar + Upload (più veloce per progetti grandi)**

Dalla tua macchina locale:

```bash
# Crea archivio (esclude node_modules e file inutili)
cd /Users/alessandroromano/Desktop
tar -czf resolv.tar.gz \
  --exclude='Resolv/node_modules' \
  --exclude='Resolv/apps/*/node_modules' \
  --exclude='Resolv/.git' \
  --exclude='Resolv/apps/*/dist' \
  --exclude='Resolv/backups' \
  Resolv/

# Upload
scp -i ~/Downloads/LightsailDefaultKey-eu-central-1.pem resolv.tar.gz ubuntu@3.120.81.201:/home/ubuntu/

# Sul server, estrai
ssh -i ~/Downloads/LightsailDefaultKey-eu-central-1.pem ubuntu@3.120.81.201
cd /home/ubuntu
tar -xzf resolv.tar.gz
cd Resolv
```

### Passo 4.2: Configura Variabili d'Ambiente

```bash
cd /home/ubuntu/Resolv  # o /home/ubuntu/resolv se da git

# Copia template
cp .env.example .env

# Modifica con nano
nano .env
```

**Configurazione MINIMA per far funzionare subito:**

```bash
# Application
NODE_ENV=production

# JWT (IMPORTANTE: genera secrets casuali)
JWT_SECRET=TUO_SECRET_CASUALE_MIN_32_CARATTERI_QUI
JWT_REFRESH_SECRET=ALTRO_SECRET_CASUALE_MIN_32_CARATTERI_QUI

# Database (CAMBIA le password!)
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=recupero_crediti
DB_USERNAME=rc_user
DB_PASSWORD=TuaPasswordSecura123!

MYSQL_ROOT_PASSWORD=TuaRootPasswordSecura456!

# CORS - USA IL TUO IP STATICO
CORS_ORIGINS=http://3.120.81.201,http://3.120.81.201:5173

# Rate Limiting (produzione)
RATE_LIMIT_MAX=100
RATE_LIMIT_TTL=60000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Monitoring (opzionale per ora)
SENTRY_DSN=
LOG_LEVEL=info
```

**Per generare JWT secrets sicuri:**

```bash
# Sul server
openssl rand -base64 64
# Copia il risultato in JWT_SECRET

openssl rand -base64 64
# Copia il risultato in JWT_REFRESH_SECRET
```

**Salva e esci da nano:**
- Premi `Ctrl + X`
- Premi `Y` per confermare
- Premi `Enter`

### Passo 4.3: Build e Avvio con Docker

```bash
cd /home/ubuntu/Resolv

# Build delle immagini (prima volta: 5-10 minuti)
docker-compose build

# Avvia tutti i servizi
docker-compose up -d

# Verifica che tutto sia partito
docker-compose ps
```

**Output atteso:**

```
NAME               STATUS          PORTS
resolv-backend    Up (healthy)    0.0.0.0:3000->3000/tcp
resolv-frontend   Up              0.0.0.0:5173->80/tcp
resolv-mysql      Up (healthy)    0.0.0.0:3306->3306/tcp
resolv-redis      Up (healthy)    0.0.0.0:6379->6379/tcp
```

### Passo 4.4: Verifica Logs

```bash
# Guarda i logs di tutti i servizi
docker-compose logs -f

# Premi Ctrl+C per uscire

# Logs solo backend
docker-compose logs backend

# Logs solo frontend
docker-compose logs frontend
```

**Cosa cercare nei logs:**

✅ Backend:
```
🚀 RESOLV Backend Started
🌍 Environment: production
🔗 Running on: http://localhost:3000
```

✅ Frontend:
```
Nginx started successfully
```

✅ MySQL:
```
mysqld: ready for connections
```

### Passo 4.5: Test Locale sul Server

```bash
# Test health check
curl http://localhost:3000/health

# Dovrebbe rispondere con JSON:
# {"status":"ok","timestamp":"...","database":"healthy","redis":"healthy",...}

# Test frontend
curl -I http://localhost:5173

# Dovrebbe rispondere con:
# HTTP/1.1 200 OK
```

---

## 5. Configurazione Dominio (Opzionale)

Se hai un dominio (es. `resolv-demo.tuodominio.com`):

### Passo 5.1: Configura DNS

1. Vai al pannello del tuo provider di domini (GoDaddy, Namecheap, Cloudflare, ecc.)

2. Aggiungi un record A:
   - **Type**: A
   - **Name**: `resolv-demo` (o `@` per dominio principale)
   - **Value**: `3.120.81.201` (il tuo IP statico Lightsail)
   - **TTL**: 300 (5 minuti)

3. Salva e attendi 5-15 minuti per la propagazione DNS

4. Verifica:
   ```bash
   # Dal tuo computer
   nslookup resolv-demo.tuodominio.com

   # Dovrebbe mostrare il tuo IP Lightsail
   ```

### Passo 5.2: Aggiorna CORS

Sul server:

```bash
cd /home/ubuntu/Resolv
nano .env
```

Modifica CORS_ORIGINS:

```bash
CORS_ORIGINS=http://resolv-demo.tuodominio.com,https://resolv-demo.tuodominio.com
```

Riavvia:

```bash
docker-compose restart backend
```

---

## 6. Configurazione SSL (HTTPS)

### Opzione A: Accesso con IP (HTTP) - PIÙ SEMPLICE

Se non hai un dominio, puoi accedere subito con:

```
http://3.120.81.201:5173
```

**Pro:**
- ✅ Funziona immediatamente
- ✅ Nessuna configurazione aggiuntiva

**Contro:**
- ❌ Connessione non criptata (HTTP)
- ❌ Browser potrebbero mostrare warning
- ❌ Non adatto per dati sensibili reali

### Opzione B: SSL con Dominio (HTTPS) - CONSIGLIATO PER PRODUZIONE

**Prerequisito:** Devi avere un dominio configurato (Passo 5)

#### 6.1: Installa Certbot

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

#### 6.2: Ferma Temporaneamente l'App

```bash
cd /home/ubuntu/Resolv
docker-compose down
```

#### 6.3: Ottieni Certificato SSL

```bash
# Sostituisci con il TUO dominio
sudo certbot certonly --standalone -d resolv-demo.tuodominio.com
```

Rispondi alle domande:
- Email: `tua-email@example.com`
- Accetta Terms of Service: `Y`
- Share email: `N` (opzionale)

Certificati salvati in:
```
/etc/letsencrypt/live/resolv-demo.tuodominio.com/fullchain.pem
/etc/letsencrypt/live/resolv-demo.tuodominio.com/privkey.pem
```

#### 6.4: Configura Nginx per HTTPS

Crea file di configurazione Nginx:

```bash
sudo nano /home/ubuntu/Resolv/nginx-ssl.conf
```

Incolla questa configurazione (SOSTITUISCI IL DOMINIO):

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name resolv-demo.tuodominio.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name resolv-demo.tuodominio.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/resolv-demo.tuodominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/resolv-demo.tuodominio.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        rewrite ^/api(/.*)$ $1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Salva (`Ctrl+X`, `Y`, `Enter`)

#### 6.5: Installa e Configura Nginx

```bash
# Installa Nginx
sudo apt-get install -y nginx

# Copia configurazione
sudo cp /home/ubuntu/Resolv/nginx-ssl.conf /etc/nginx/sites-available/resolv
sudo ln -s /etc/nginx/sites-available/resolv /etc/nginx/sites-enabled/

# Rimuovi default
sudo rm /etc/nginx/sites-enabled/default

# Test configurazione
sudo nginx -t

# Se OK, riavvia Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

#### 6.6: Aggiorna CORS e Riavvia App

```bash
cd /home/ubuntu/Resolv
nano .env
```

Aggiorna CORS:
```bash
CORS_ORIGINS=https://resolv-demo.tuodominio.com
```

Riavvia:
```bash
docker-compose up -d
```

#### 6.7: Configura Auto-Rinnovo Certificato

```bash
# Test rinnovo
sudo certbot renew --dry-run

# Se OK, il rinnovo automatico è già configurato
# Certbot aggiunge automaticamente un cron job

# Verifica cron
sudo systemctl status certbot.timer
```

---

## 7. Test e Verifica

### Passo 7.1: Test dal Browser

**Con IP (HTTP):**
```
http://3.120.81.201:5173
```

**Con Dominio (HTTPS):**
```
https://resolv-demo.tuodominio.com
```

### Passo 7.2: Verifica Funzionalità

1. **Caricamento pagina:**
   - ✅ Frontend si carica correttamente
   - ✅ Nessun errore in console browser (F12)

2. **Login:**
   - Email: `admin@resolv.it`
   - Password: `admin123`
   - ✅ Login riesce
   - ⚠️ **CAMBIA LA PASSWORD SUBITO!**

3. **Test funzionalità:**
   - ✅ Dashboard si carica
   - ✅ Menu laterale funziona
   - ✅ Navigazione tra pagine funziona

### Passo 7.3: Test API

```bash
# Dal server
curl https://resolv-demo.tuodominio.com/api/health

# O con IP
curl http://3.120.81.201:3000/health
```

Risposta attesa:
```json
{
  "status": "ok",
  "timestamp": "2025-12-29T...",
  "database": "healthy",
  "redis": "healthy",
  "uptime": 123.45,
  "memory": {...}
}
```

### Passo 7.4: Verifica Sicurezza

```bash
# Test rate limiting (prova 6 login rapidi)
for i in {1..6}; do
  curl -X POST http://3.120.81.201:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
  echo ""
done

# La 6a richiesta dovrebbe dare 429 (Too Many Requests)
```

---

## 8. Condivisione con Collaboratore

### Passo 8.1: Prepara Informazioni

Invia al tuo collaboratore:

**Email di esempio:**

```
Oggetto: Accesso Demo Resolv

Ciao [Nome Collaboratore],

Ho preparato un'istanza demo dell'applicazione Resolv per il tuo review.

🌐 ACCESSO APPLICAZIONE:
URL: http://3.120.81.201:5173
(oppure: https://resolv-demo.tuodominio.com se hai configurato SSL)

👤 CREDENZIALI AMMINISTRATORE:
Email: admin@resolv.it
Password: Demo2025! (cambierò dopo il tuo test)

📋 COSA PUOI TESTARE:
- Gestione pratiche e recupero crediti
- Creazione studi e utenti
- Gestione clienti e debitori
- Sistema di documenti e alert
- Dashboard e reportistica

⚠️ NOTE IMPORTANTI:
- Questa è un'istanza di TEST - dati non persistenti
- Non inserire dati reali o sensibili
- L'istanza potrebbe essere resettata periodicamente
- Segnala qualsiasi bug o problema che trovi

📖 DOCUMENTAZIONE:
- Guida Utente: [link al PDF se caricato]
- Supporto tecnico: tua-email@example.com

🕐 DISPONIBILITÀ:
L'istanza sarà online fino al [data], poi verrà spenta per risparmiare costi.

Fammi sapere se hai domande o problemi di accesso!

Grazie,
[Tuo Nome]
```

### Passo 8.2: Crea Utente Demo Aggiuntivo (Opzionale)

Se vuoi dare accesso con utente dedicato invece di admin:

```bash
# Connettiti al database
docker-compose exec mysql mysql -u root -p

# Password: quella che hai messo in MYSQL_ROOT_PASSWORD

# Usa database
USE recupero_crediti;

# Crea utente demo (modifica i valori)
INSERT INTO users (email, password, nome, cognome, ruolo, attivo, created_at, updated_at)
VALUES (
  'demo@resolv.it',
  '$2b$10$...', -- Hash BCrypt della password
  'Demo',
  'User',
  'admin',
  1,
  NOW(),
  NOW()
);

# Exit
exit
```

Per generare hash password BCrypt:

```bash
# Sul server
node -e "console.log(require('bcrypt').hashSync('TuaPassword123', 10))"
```

### Passo 8.3: Monitoraggio Accessi

Monitora chi accede:

```bash
# Guarda i logs di accesso
docker-compose logs -f backend | grep "POST /auth/login"

# Logs Nginx (se configurato)
sudo tail -f /var/log/nginx/access.log
```

---

## 9. Manutenzione e Troubleshooting

### Comandi Utili

**Riavvio servizi:**
```bash
cd /home/ubuntu/Resolv

# Riavvia tutto
docker-compose restart

# Riavvia solo backend
docker-compose restart backend

# Stop e start (più completo)
docker-compose down
docker-compose up -d
```

**Backup database:**
```bash
# Backup manuale
docker-compose exec mysql mysqldump -u root -p recupero_crediti > backup-$(date +%Y%m%d).sql

# Scarica backup sul tuo computer
scp -i ~/Downloads/LightsailDefaultKey-eu-central-1.pem \
  ubuntu@3.120.81.201:/home/ubuntu/Resolv/backup-*.sql \
  ~/Desktop/
```

**Pulizia spazio disco:**
```bash
# Rimuovi container inutilizzati
docker system prune -a

# Verifica spazio
df -h
```

**Aggiornamento applicazione:**
```bash
cd /home/ubuntu/Resolv

# Backup database prima!
docker-compose exec mysql mysqldump -u root -p recupero_crediti > backup-before-update.sql

# Pull nuovo codice (se da Git)
git pull origin main

# Rebuild
docker-compose build

# Restart
docker-compose down
docker-compose up -d
```

### Problemi Comuni

**1. Errore 502 Bad Gateway**

```bash
# Verifica che backend sia running
docker-compose ps

# Guarda logs
docker-compose logs backend

# Riavvia
docker-compose restart backend
```

**2. Frontend non si carica**

```bash
# Verifica frontend
docker-compose logs frontend

# Rebuilda frontend
docker-compose build frontend
docker-compose up -d frontend
```

**3. Database connection error**

```bash
# Verifica MySQL
docker-compose logs mysql

# Riavvia MySQL
docker-compose restart mysql

# Attendi 30 secondi poi riavvia backend
docker-compose restart backend
```

**4. Out of Memory**

```bash
# Verifica memoria
free -h

# Riavvia servizi per liberare RAM
docker-compose restart

# Se persiste, aggiungi swap (vedi Passo 3.3)
```

**5. Porta già in uso**

```bash
# Trova processo che usa porta 3000
sudo lsof -i :3000

# Uccidi processo (usa PID dalla command sopra)
sudo kill -9 PID

# Riavvia container
docker-compose up -d
```

### Monitoraggio Risorse

```bash
# Uso CPU/RAM container
docker stats

# Uso disco
df -h

# Memoria sistema
free -h

# Logs sistema
sudo journalctl -xe
```

### Fermare l'Istanza (per risparmiare)

**Quando hai finito i test:**

1. **Stop container (preserva dati):**
   ```bash
   cd /home/ubuntu/Resolv
   docker-compose down
   ```

2. **Stop istanza Lightsail (non paga):**
   - Vai su AWS Lightsail Console
   - Clicca sulla tua istanza
   - Clicca **Stop**
   - L'istanza si ferma ma NON paghi (solo storage)

3. **Per riavviare:**
   - Clicca **Start** nella console
   - Attendi 1-2 minuti
   - Riconnettiti via SSH
   - Riavvia app: `cd /home/ubuntu/Resolv && docker-compose up -d`

4. **Eliminare completamente (attenzione: perdi tutti i dati):**
   - Nella console Lightsail
   - Clicca sui tre puntini (...)
   - Clicca **Delete**
   - Conferma

---

## 📝 Checklist Finale

Prima di condividere con il collaboratore:

- [ ] Istanza Lightsail creata e running
- [ ] IP statico assegnato
- [ ] Docker e Docker Compose installati
- [ ] Codice caricato sul server
- [ ] File `.env` configurato con password sicure
- [ ] Applicazione build e running (`docker-compose ps` mostra tutto healthy)
- [ ] Health check funziona (`curl http://localhost:3000/health`)
- [ ] Frontend accessibile via browser
- [ ] Login funziona con credenziali admin
- [ ] Password admin cambiata (o comunicata al collaboratore)
- [ ] Firewall configurato (porte 80, 443, 22 aperte)
- [ ] (Opzionale) Dominio configurato
- [ ] (Opzionale) SSL attivo con certificato Let's Encrypt
- [ ] Email inviata al collaboratore con credenziali
- [ ] Backup database configurato

---

## 🎯 Riepilogo Costi

**Stima mensile AWS Lightsail:**

- Istanza $10/mese (2GB RAM): **$10.00**
- IP statico: **$0.00** (incluso)
- Traffico 2TB: **$0.00** (incluso)
- Storage 60GB SSD: **$0.00** (incluso)

**Totale stimato: ~$10/mese**

**Per risparmiare:**
- Ferma l'istanza quando non in uso (paghi solo storage ~$0.60/mese)
- Elimina completamente dopo i test
- Usa piano da $5/mese se 1GB RAM è sufficiente

---

## 📞 Supporto

**Problemi durante il setup?**

1. Controlla i logs: `docker-compose logs -f`
2. Verifica variabili d'ambiente: `cat .env`
3. Testa connettività: `curl http://localhost:3000/health`
4. Consulta documentazione AWS Lightsail: https://lightsail.aws.amazon.com/ls/docs

**Risorse utili:**
- AWS Lightsail Docs: https://lightsail.aws.amazon.com/ls/docs
- Docker Docs: https://docs.docker.com
- Let's Encrypt: https://letsencrypt.org

---

## ✅ Fatto!

Hai deployato con successo Resolv su AWS Lightsail!

L'applicazione è ora accessibile al tuo collaboratore via:
- **HTTP**: `http://TUO-IP-STATICO:5173`
- **HTTPS**: `https://tuo-dominio.com` (se configurato)

Buon lavoro! 🚀
