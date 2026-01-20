# Resolv - Setup e Configurazione

Guida completa per configurare e avviare l'applicazione Resolv.

## Indice

1. [Prerequisiti](#prerequisiti)
2. [Configurazione Ambiente](#configurazione-ambiente)
3. [Installazione](#installazione)
4. [Avvio Applicazione](#avvio-applicazione)
5. [Variabili d'Ambiente](#variabili-dambiente)
6. [Deployment in Produzione](#deployment-in-produzione)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisiti

Prima di iniziare, assicurati di avere installato:

- **Docker** (versione 20.10 o superiore)
- **Docker Compose** (versione 2.0 o superiore)
- **Git**
- **Node.js** (versione 20 o superiore) - solo per sviluppo locale

Verifica le installazioni:

```bash
docker --version
docker compose version
node --version
git --version
```

---

## Configurazione Ambiente

### 1. Clona il Repository

```bash
git clone <repository-url>
cd Resolv
```

### 2. Crea il File di Configurazione `.env`

Copia il file template `.env.example` in `.env`:

```bash
cp .env.example .env
```

### 3. Configura le Variabili d'Ambiente

Apri il file `.env` e configura i seguenti parametri **OBBLIGATORI**:

```bash
# =============================================================================
# CONFIGURAZIONE MINIMA RICHIESTA
# =============================================================================

# JWT Secret (OBBLIGATORIO - min 32 caratteri)
# Genera con: openssl rand -base64 64
JWT_SECRET=your-secret-jwt-key-min-32-characters-long

# Database Credentials (OBBLIGATORIO)
DB_PASSWORD=your-secure-database-password
MYSQL_ROOT_PASSWORD=your-secure-root-password

# CORS Origins (OBBLIGATORIO in produzione)
# In development: http://localhost:5173,http://localhost:3000
# In production: https://your-domain.com,https://www.your-domain.com
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4. Genera Segreti Sicuri

Per generare un `JWT_SECRET` sicuro:

```bash
# Genera JWT_SECRET (64 caratteri base64)
openssl rand -base64 64
```

Per generare password sicure per il database:

```bash
# Genera password casuale (32 caratteri)
openssl rand -base64 32
```

**IMPORTANTE:**
- Usa password diverse per `DB_PASSWORD` e `MYSQL_ROOT_PASSWORD`
- Non usare mai le password di default in produzione
- Conserva le credenziali in modo sicuro (es. password manager)

---

## Installazione

### Opzione 1: Avvio con Docker Compose (Consigliato)

Questo metodo avvia tutti i servizi (MySQL, Redis, Backend, Frontend) con un singolo comando:

```bash
# Costruisci le immagini
docker compose build

# Avvia tutti i servizi
docker compose up -d

# Verifica che i container siano in esecuzione
docker compose ps
```

L'applicazione sarà disponibile su:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs (Swagger)**: http://localhost:3000/api-docs
- **Database MySQL**: localhost:3306

### Opzione 2: Sviluppo Locale (Senza Docker)

Per sviluppare localmente senza Docker:

1. **Avvia solo il database con Docker:**
   ```bash
   docker compose up mysql redis -d
   ```

2. **Installa le dipendenze del backend:**
   ```bash
   cd apps/backend
   npm install
   ```

3. **Avvia il backend in modalità development:**
   ```bash
   npm run start:dev
   ```

4. **In un nuovo terminale, installa le dipendenze del frontend:**
   ```bash
   cd apps/frontend
   npm install
   ```

5. **Avvia il frontend in modalità development:**
   ```bash
   npm run dev
   ```

---

## Avvio Applicazione

### Comandi Principali

```bash
# Avvia tutti i servizi in background
docker compose up -d

# Visualizza i log in tempo reale
docker compose logs -f

# Visualizza i log di un servizio specifico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql

# Ferma tutti i servizi
docker compose down

# Ferma e rimuovi anche i volumi (ATTENZIONE: elimina i dati del database!)
docker compose down -v

# Riavvia un servizio specifico
docker compose restart backend
docker compose restart frontend

# Ricostruisci le immagini dopo modifiche al codice
docker compose build --no-cache
docker compose up -d
```

### Health Check

Verifica lo stato dell'applicazione:

```bash
# Health check backend
curl http://localhost:3000/health/live

# Health check database
docker compose exec mysql mysqladmin ping -h localhost -u root -p

# Verifica tutti i container
docker compose ps
```

---

## Variabili d'Ambiente

### Variabili Obbligatorie

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `JWT_SECRET` | Chiave segreta per JWT (min 32 caratteri) | `openssl rand -base64 64` |
| `DB_PASSWORD` | Password utente database | `SecurePassword123!` |
| `MYSQL_ROOT_PASSWORD` | Password root database | `RootPassword456!` |
| `CORS_ORIGINS` | Domini autorizzati (comma-separated) | `http://localhost:5173,https://app.example.com` |

### Variabili Opzionali (con defaults)

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `NODE_ENV` | `development` | Ambiente: development, production, staging |
| `BACKEND_PORT` | `3000` | Porta backend |
| `FRONTEND_PORT` | `5173` | Porta frontend |
| `DB_HOST` | `mysql` | Host database |
| `DB_PORT` | `3306` | Porta database |
| `DB_DATABASE` | `recupero_crediti` | Nome database |
| `DB_USERNAME` | `rc_user` | Username database |
| `JWT_EXPIRES_IN` | `24h` | Durata token JWT |
| `RATE_LIMIT_TTL` | `60000` | Finestra rate limiting (ms) |
| `RATE_LIMIT_MAX` | `300` | Max richieste per finestra |
| `BACKUP_SCHEDULE_INTERVAL` | `86400000` | Intervallo backup (ms, default 24h) |
| `BACKUP_MAX_COUNT` | `30` | Numero max backup da mantenere (oltre il limite elimina il più vecchio) |
| `VITE_API_URL` | (auto-detect) | URL backend (lasciare vuoto per auto-detect) |

---

## Deployment in Produzione

### Checklist Pre-Produzione

Prima di andare in produzione, assicurati di:

- [ ] **Generare segreti sicuri** per `JWT_SECRET`, `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`
- [ ] **Configurare CORS_ORIGINS** con i domini reali dell'applicazione
- [ ] **Impostare NODE_ENV=production** nel file `.env`
- [ ] **Configurare HTTPS/TLS** tramite reverse proxy (Nginx, Caddy, Traefik)
- [ ] **Configurare backup automatici** del database su storage esterno (S3, etc.)
- [ ] **Configurare monitoring** e alerting (opzionale: Sentry, Prometheus)
- [ ] **Verificare rate limiting** appropriato per l'ambiente di produzione
- [ ] **Testare il processo di restore** da backup
- [ ] **Configurare log aggregation** (opzionale: ELK, CloudWatch)

### Esempio Configurazione Produzione

`.env` per produzione:

```bash
NODE_ENV=production

# Security
JWT_SECRET=<generato-con-openssl-rand-base64-64>
DB_PASSWORD=<password-forte-64-caratteri>
MYSQL_ROOT_PASSWORD=<password-forte-64-caratteri>

# CORS - Domini reali
CORS_ORIGINS=https://resolv.example.com,https://www.resolv.example.com

# Rate Limiting - Più restrittivo
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=200

# Backup - Ogni 6 ore in produzione
BACKUP_SCHEDULE_INTERVAL=21600000
BACKUP_MAX_COUNT=50

# Database
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=recupero_crediti
DB_USERNAME=rc_user
```

### Reverse Proxy con Nginx

Esempio configurazione Nginx per HTTPS:

```nginx
server {
    listen 443 ssl http2;
    server_name resolv.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Backup e Recovery

#### Backup Manuale

```bash
# Crea un backup manuale
docker compose exec backend node -e "
  const { BackupService } = require('./dist/backup/backup.service');
  const service = new BackupService();
  service.createBackup().then(console.log);
"

# Oppure usa l'API
curl -X POST http://localhost:3000/backup/create \
  -H "Authorization: Bearer <admin-token>"
```

#### Restore da Backup

```bash
# Lista backup disponibili
curl http://localhost:3000/backup/list \
  -H "Authorization: Bearer <admin-token>"

# Ripristina un backup specifico
curl -X POST http://localhost:3000/backup/restore/backup-2025-12-29.sql \
  -H "Authorization: Bearer <admin-token>"
```

#### Backup su Storage Esterno (AWS S3)

Aggiungi al `.env`:

```bash
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-central-1
S3_BACKUP_BUCKET=resolv-backups
```

---

## Troubleshooting

### Problema: Container Backend non si avvia

**Soluzione:**
```bash
# Verifica i log
docker compose logs backend

# Verifica che il database sia pronto
docker compose exec mysql mysqladmin ping -h localhost -u root -p

# Riavvia i servizi in ordine
docker compose down
docker compose up -d mysql
sleep 10
docker compose up -d backend frontend
```

### Problema: Errore di connessione al database

**Soluzione:**
```bash
# Verifica le credenziali nel .env
cat .env | grep DB_

# Testa la connessione al database
docker compose exec mysql mysql -u rc_user -p -e "SHOW DATABASES;"

# Verifica che il database esista
docker compose exec mysql mysql -u root -p -e "SHOW DATABASES;"
```

### Problema: CORS error nel browser

**Soluzione:**
```bash
# Verifica che CORS_ORIGINS sia configurato correttamente
cat .env | grep CORS_ORIGINS

# Verifica i log backend per vedere quale origin è stato bloccato
docker compose logs backend | grep "CORS blocked"

# Aggiungi l'origin mancante al .env
# Esempio: CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://192.168.1.100:5173
```

### Problema: JWT token non valido

**Soluzione:**
```bash
# Verifica che JWT_SECRET sia configurato
cat .env | grep JWT_SECRET

# Assicurati che JWT_SECRET sia lungo almeno 32 caratteri
# Genera un nuovo secret se necessario
openssl rand -base64 64

# Riavvia il backend dopo aver aggiornato JWT_SECRET
docker compose restart backend
```

### Problema: Backup creation fallisce

**Soluzione:**
```bash
# Verifica che il container abbia mariadb-dump installato
docker compose exec backend which mariadb-dump

# Verifica permessi directory backup
docker compose exec backend ls -la /usr/src/app/backups

# Crea manualmente la directory se mancante
docker compose exec backend mkdir -p /usr/src/app/backups
docker compose exec backend chmod 755 /usr/src/app/backups
```

### Problema: Frontend non riesce a connettersi al backend

**Soluzione:**
```bash
# Verifica che VITE_API_URL sia vuoto per auto-detection
cat .env | grep VITE_API_URL

# Oppure configuralo esplicitamente
echo "VITE_API_URL=http://localhost:3000" >> .env

# Ricostruisci il frontend
docker compose build frontend
docker compose up -d frontend
```

---

## Sicurezza

### Best Practices

1. **Mai committare il file `.env`** - È già in `.gitignore`
2. **Usare password complesse** - Min 16 caratteri, mix di lettere, numeri, simboli
3. **Cambiare i segreti regolarmente** - Specialmente dopo un breach
4. **Limitare CORS_ORIGINS** - Solo domini fidati
5. **Usare HTTPS in produzione** - Sempre, mai HTTP per dati sensibili
6. **Monitorare i log** - Controlla accessi non autorizzati
7. **Backup regolari** - Testa il processo di restore
8. **Rate limiting appropriato** - Proteggi da abusi
9. **Aggiornare dipendenze** - Controlla vulnerabilità con `npm audit`

### Controllo Sicurezza Rapido

```bash
# Verifica che .env non sia committato
git status | grep .env

# Controlla vulnerabilità npm
cd apps/backend && npm audit
cd apps/frontend && npm audit

# Verifica JWT_SECRET length
cat .env | grep JWT_SECRET | wc -c  # Deve essere > 32

# Testa rate limiting
ab -n 1000 -c 10 http://localhost:3000/health/live
```

---

## Supporto

Per problemi o domande:

1. Controlla la sezione [Troubleshooting](#troubleshooting)
2. Verifica i log: `docker compose logs -f`
3. Consulta la documentazione API: http://localhost:3000/api-docs
4. Apri una issue su GitHub

---

## License

[Inserire licenza]
