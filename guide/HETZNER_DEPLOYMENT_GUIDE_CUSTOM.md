# Guida passo-passo Hetzner (Resolv)

Questa guida ti accompagna dal provisioning al deploy in produzione con Docker.
Assume che tu voglia: 1 VM prod + 1 VM staging (consigliato).

## 0) Prerequisiti
- Dominio (es. `resolv.it`) con gestione DNS.
- Accesso Hetzner Cloud.
- Una chiave SSH sul tuo computer.

## 1) Crea le VM
### Produzione
- Tipo consigliato: 4 vCPU / 8 GB RAM / 80-160 GB SSD.
- Sistema operativo: Ubuntu 22.04 LTS.
- Nome host: `resolv-prod`.

### Staging
- Tipo consigliato: 2 vCPU / 4 GB RAM / 40-80 GB SSD.
- Sistema operativo: Ubuntu 22.04 LTS.
- Nome host: `resolv-staging`.

## 2) Configura DNS
Nel tuo DNS imposta:
- `app.resolv.legal` -> IP VM produzione
- `api.resolv.legal` -> IP VM produzione
- (opzionale) `staging.resolv.legal` -> IP VM staging
- (opzionale) `api-staging.resolv.legal` -> IP VM staging

## 3) Accesso SSH
Sul tuo PC:
```bash
ssh root@IP_PROD
```

## 4) Setup base server
### Aggiorna sistema
```bash
apt update && apt upgrade -y
```

### Crea utente non-root
```bash
adduser resolv
usermod -aG sudo resolv
```

### Copia chiave SSH
Sul tuo PC:
```bash
ssh-copy-id resolv@IP_PROD
```

### Disabilita login root (consigliato)
Modifica `/etc/ssh/sshd_config`:
```
PermitRootLogin no
PasswordAuthentication no
```
Poi:
```bash
systemctl restart ssh
```

## 5) Installa Docker e Docker Compose
```bash
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 6) Clona il progetto
```bash
mkdir -p /opt/resolv
cd /opt/resolv
git clone <URL_REPO> .
```

## 7) Configura variabili di ambiente
### Backend `.env`
In `/opt/resolv/apps/backend/.env`:
```
NODE_ENV=production
PORT=3000
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=resolv
DB_USERNAME=<USER>
DB_PASSWORD=<PASSWORD>
JWT_SECRET=<SECRET>
```

### Frontend `.env`
In `/opt/resolv/apps/frontend/.env`:
```
VITE_API_URL=https://api.resolv.legal
VITE_UPLOAD_DOCUMENT_MAX_MB=50
```

## 8) Configura Nginx reverse proxy
Usa `nginx.conf` e aggiorna i domini.
Assicurati che:
- `app.resolv.legal` punti al frontend
- `api.resolv.legal` punti al backend

## 9) Certificati SSL
Installa Certbot:
```bash
apt install -y certbot python3-certbot-nginx
```
Poi:
```bash
certbot --nginx -d app.resolv.legal -d api.resolv.legal
```

## 10) Deploy
```bash
cd /opt/resolv
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d
docker-compose ps
```

## 11) Verifica
- Frontend: https://app.resolv.legal
- Backend: https://api.resolv.legal/health (o endpoint pubblico)

## 12) Backup (consigliato)
Configura backup giornalieri:
- MySQL dump
- Uploads

## 13) Staging (ripeti)
Ripeti gli stessi step su VM staging con domini `staging.resolv.legal` e `api-staging.resolv.legal`.

---

Se vuoi, posso prepararti:
- file `.env` completi
- `docker-compose.prod.yml`
- script di deploy automatico
