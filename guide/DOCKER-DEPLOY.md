# RESOLV - Deploy Docker Quick Guide

Guida rapida per deployare RESOLV con Docker Compose.

---

## 📋 File Creati

```
recupero-crediti/
├── docker-compose.yml           ← Configurazione servizi
├── apps/
│   ├── backend/
│   │   ├── Dockerfile          ← Build backend
│   │   └── .dockerignore       ← Escludi file inutili
│   └── frontend/
│       ├── Dockerfile          ← Build frontend
│       ├── nginx.conf          ← Configurazione Nginx
│       └── .dockerignore       ← Escludi file inutili
```

---

## 🚀 Deploy Locale (Test)

### 1. Verifica Prerequisiti

```bash
# Verifica Docker installato
docker --version
docker-compose --version

# Assicurati di essere nella directory root
cd /path/to/recupero-crediti
```

### 2. Crea .env Backend (se non esiste)

```bash
cd apps/backend

# Usa configurazione development (già presente)
cat .env

# Oppure crea uno nuovo:
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000

DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=rc_user
DB_PASSWORD=rc_pass
DB_DATABASE=recupero_crediti

JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRATION=7d

UPLOAD_DIR=/app/uploads
EOF

cd ../..
```

### 3. Build e Start

```bash
# Build immagini Docker
docker-compose build

# Start tutti i servizi
docker-compose up -d

# Verifica status
docker-compose ps

# Verifica logs
docker-compose logs -f
```

### 4. Accesso

- **Frontend**: http://localhost
- **Backend**: http://localhost:3000
- **Database**: localhost:3306

---

## 🌐 Deploy Production (AWS Lightsail)

### 1. Trasferisci Progetto al Server

```bash
# Dalla tua macchina locale
rsync -avz --exclude 'node_modules' \
           --exclude 'dist' \
           --exclude '.git' \
           --exclude 'apps/backend/uploads' \
           . ubuntu@3.120.81.201:~/recupero-crediti/
```

### 2. SSH nel Server

```bash
ssh ubuntu@3.120.81.201
cd ~/recupero-crediti
```

### 3. Crea .env Production

```bash
cd apps/backend

cat > .env << 'EOF'
NODE_ENV=production
PORT=3000

DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=rc_user
DB_PASSWORD=CAMBIA_QUESTA_PASSWORD_123!
DB_DATABASE=recupero_crediti

JWT_SECRET=production-secret-random-min-32-characters-abc123xyz789
JWT_EXPIRATION=7d

UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Email (opzionale)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
EOF

cd ../..
```

### 4. Modifica docker-compose.yml

Cambia le password in `docker-compose.yml`:

```bash
nano docker-compose.yml

# Modifica queste righe:
# MYSQL_ROOT_PASSWORD: root_password_CHANGE_ME_123!  → password-sicura-root
# MYSQL_PASSWORD: rc_pass                            → password-sicura-user
```

### 5. Deploy

```bash
# Build e start
docker-compose up -d --build

# Verifica logs
docker-compose logs -f

# Aspetta che MySQL sia ready (circa 30s)
docker-compose logs mysql | grep "ready for connections"
```

### 6. Inizializza Database

```bash
# Crea admin user (opzionale)
docker-compose exec backend npm run seed:admin

# Oppure manualmente con MySQL
docker-compose exec mysql mysql -urc_user -p recupero_crediti
```

### 7. Verifica Deployment

```bash
# Test backend
curl http://3.120.81.201:3000/health

# Apri browser
# http://3.120.81.201
```

---

## 🔧 Configurazione docker-compose.yml

### Variabili Importanti da Modificare

#### MySQL
```yaml
environment:
  MYSQL_ROOT_PASSWORD: root_password_CHANGE_ME_123!  # ← CAMBIA
  MYSQL_PASSWORD: rc_pass                            # ← CAMBIA
```

#### Backend
```yaml
environment:
  NODE_ENV: production                               # ← development o production
  DB_PASSWORD: rc_pass                              # ← UGUALE a MYSQL_PASSWORD
  JWT_SECRET: your-super-secret...                  # ← CAMBIA con random 32+ chars
```

#### Frontend (build args - opzionali)
```yaml
build:
  args:
    # VITE_API_URL: http://3.120.81.201:3000        # ← Opzionale (auto-detect)
    VITE_APP_NAME: RESOLV
```

---

## 📊 Comandi Utili

### Gestione Servizi

```bash
# Start tutti i servizi
docker-compose up -d

# Stop tutti i servizi
docker-compose down

# Restart servizio specifico
docker-compose restart backend

# Rebuild dopo modifiche
docker-compose up -d --build

# Rebuild solo un servizio
docker-compose up -d --build backend
```

### Logs e Debug

```bash
# Logs di tutti i servizi
docker-compose logs -f

# Logs servizio specifico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql

# Ultimi 50 righe
docker-compose logs --tail=50 backend

# Status servizi
docker-compose ps

# Risorse utilizzate
docker stats
```

### Accesso Container

```bash
# Shell nel backend
docker-compose exec backend sh

# Shell nel frontend
docker-compose exec frontend sh

# MySQL client
docker-compose exec mysql mysql -urc_user -p recupero_crediti

# Redis client
docker-compose exec redis redis-cli
```

### Database

```bash
# Backup database
docker-compose exec mysql mysqldump -urc_user -p recupero_crediti > backup_$(date +%Y%m%d).sql

# Restore database
docker-compose exec -T mysql mysql -urc_user -p recupero_crediti < backup_20250123.sql

# Verifica connessione
docker-compose exec mysql mysql -urc_user -p -e "SHOW DATABASES;"
```

### Pulizia

```bash
# Stop e rimuovi container
docker-compose down

# Rimuovi anche volumes (ATTENZIONE: cancella dati!)
docker-compose down -v

# Rimuovi immagini non usate
docker image prune -a

# Pulizia completa Docker
docker system prune -a --volumes
```

---

## 🐛 Troubleshooting

### Container Non Si Avvia

```bash
# Verifica logs per errori
docker-compose logs backend

# Verifica health status
docker-compose ps

# Ricrea container
docker-compose down
docker-compose up -d
```

### MySQL Not Ready

```bash
# Aspetta che MySQL sia pronto
docker-compose logs mysql | grep "ready for connections"

# Se impiega troppo, verifica risorse
docker stats

# Restart MySQL
docker-compose restart mysql
```

### Backend Non Connette a MySQL

```bash
# Verifica network
docker-compose exec backend ping mysql

# Verifica variabili ambiente
docker-compose exec backend env | grep DB_

# Verifica MySQL accessibile
docker-compose exec mysql mysql -urc_user -p -e "SELECT 1"
```

### Frontend 404 o Blank Page

```bash
# Verifica build frontend
docker-compose logs frontend

# Verifica file presenti
docker-compose exec frontend ls -la /usr/share/nginx/html/

# Verifica Nginx config
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Rebuild frontend
docker-compose up -d --build frontend
```

### CORS Error

```bash
# Verifica NODE_ENV backend
docker-compose logs backend | grep Environment

# Verifica CORS origins
docker-compose logs backend | grep "CORS Origins"

# Se NODE_ENV non è production, settalo in docker-compose.yml
```

### Porta Già in Uso

```bash
# Verifica cosa usa la porta 80
lsof -i :80
# Oppure
sudo netstat -tulpn | grep :80

# Cambia porta in docker-compose.yml:
# ports:
#   - "8080:80"  # Frontend su porta 8080
```

---

## 🔐 Security Checklist

Prima del deploy production:

- [ ] Cambia `MYSQL_ROOT_PASSWORD`
- [ ] Cambia `MYSQL_PASSWORD`
- [ ] Cambia `JWT_SECRET` (min 32 chars random)
- [ ] Verifica che `.env` non sia committato in Git
- [ ] Cambia password database in `apps/backend/.env`
- [ ] Configura firewall server (solo porte 80, 443, 22)
- [ ] Abilita SSL/HTTPS (con Let's Encrypt o AWS Certificate Manager)
- [ ] Configura backup automatici database
- [ ] Limita accesso MySQL solo da Docker network

---

## 📈 Performance Tips

### Build Ottimizzato

```bash
# Build con cache
docker-compose build

# Build senza cache (se problemi)
docker-compose build --no-cache

# Build parallelo
docker-compose build --parallel
```

### Risorse Container

Limita risorse in `docker-compose.yml`:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 512M
      reservations:
        memory: 256M
```

### Monitoring

```bash
# Risorse real-time
docker stats

# Logs con timestamp
docker-compose logs -f -t

# Disk usage
docker system df
```

---

## 🔄 Update Workflow

### Aggiornamento Codice

```bash
# 1. Pull modifiche (se da Git)
git pull origin main

# 2. Rebuild servizi modificati
docker-compose up -d --build backend frontend

# 3. Verifica logs
docker-compose logs -f backend frontend

# 4. Verifica funzionamento
curl http://localhost:3000/health
```

### Database Migration

```bash
# 1. Backup database prima della migration
docker-compose exec mysql mysqldump -urc_user -p recupero_crediti > backup_pre_migration.sql

# 2. Run migration
docker-compose exec backend npm run migration:run

# 3. Verifica
docker-compose exec backend npm run migration:show
```

---

## 📚 Riferimenti

- Docker Compose Docs: https://docs.docker.com/compose/
- Nginx Config: https://nginx.org/en/docs/
- MySQL Docker: https://hub.docker.com/_/mysql
- Node Alpine: https://hub.docker.com/_/node

---

**Creato**: 2025-12-23
**Versione**: 1.0.0
