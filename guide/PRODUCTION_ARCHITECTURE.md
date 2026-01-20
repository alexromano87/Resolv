# 🏗️ Architettura di Produzione - Resolv

> **Documento:** Piano architettura produzione
> **Creato:** 18 Gennaio 2026
> **Autore:** Analisi tecnica sistema Resolv
> **Versione:** 1.0

---

## 📋 Executive Summary

Questo documento descrive l'architettura di produzione ottimale per **Resolv**, un gestionale per studi legali specializzato nel recupero crediti. L'analisi copre:

- Scelta del cloud provider
- Architettura infrastrutturale
- Strategia di deployment
- Scalabilità e alta disponibilità
- Sicurezza e compliance
- Costi stimati per diversi scenari

---

## 🎯 Requisiti di Produzione

### **Requisiti Funzionali**

| Requisito | Dettaglio | Priorità |
|-----------|-----------|----------|
| **Utenti concorrenti** | 50-100 iniziali, 500+ a regime | P0 |
| **Disponibilità** | 99.5% uptime (3.6h downtime/mese) | P0 |
| **Performance** | p95 latency < 500ms | P0 |
| **Backup** | Giornalieri automatici, retention 30 giorni | P0 |
| **Recovery** | RTO: 4 ore, RPO: 24 ore | P1 |
| **Scalabilità** | Horizontal scaling su backend/frontend | P1 |
| **Security** | HTTPS, GDPR compliance, encryption at rest | P0 |

### **Requisiti Non-Funzionali**

- **Compliance:** GDPR, protezione dati sensibili
- **Localizzazione:** Europa (preferenza Italia/EU)
- **Costi:** Budget contenuto fase iniziale, scalabile
- **Manutenzione:** Minima gestione operativa
- **Disaster Recovery:** Backup geograficamente distribuiti

---

## ☁️ Scelta Cloud Provider

### **Analisi Comparativa**

| Provider | Pro | Contro | Score |
|----------|-----|--------|-------|
| **AWS** | Servizi completi, maturo, RDS, S3 | Costo elevato, complessità | 8/10 |
| **Hetzner** | **Costo basso**, EU, eccellenti performance | Meno servizi gestiti | **9/10** ⭐ |
| **DigitalOcean** | Semplice, UI eccellente, Managed DB | Costo medio, meno servizi | 7/10 |
| **Azure** | Enterprise-grade, compliance | Costo alto, complessità | 6/10 |
| **Google Cloud** | Infrastruttura veloce, Kubernetes | Costo alto, meno maturo EU | 6/10 |
| **Linode/Akamai** | Costo competitivo, buona rete | Meno servizi | 7/10 |

---

## 🏆 SOLUZIONE RACCOMANDATA: Hetzner Cloud

### **Perché Hetzner?**

#### **1. Costo/Prestazioni Imbattibile**

```
AWS t3.medium: $30/mese (2 vCPU, 4GB RAM)
Hetzner CPX21: €6.90/mese (3 vCPU, 4GB RAM) = 75% risparmio

AWS RDS db.t3.small: $30/mese (2 vCPU, 2GB RAM)
Hetzner Managed DB: €12/mese (2 vCPU, 4GB RAM) = 60% risparmio
```

**Risparmio annuale stimato: ~€600-800/anno** 💰

#### **2. Localizzazione Europea**

- ✅ Data center in **Germania** (Falkenstein, Nuremberg, Helsinki)
- ✅ **GDPR compliant** by design
- ✅ **Latenza bassa** per utenti italiani (~20-30ms)
- ✅ **Normativa EU** applicabile
- ✅ Nessun trasferimento dati extra-UE

#### **3. Performance Eccellenti**

- ✅ CPU AMD EPYC di ultima generazione
- ✅ NVMe SSD su tutti i server
- ✅ Rete 1 Gbps (20 TB traffico incluso)
- ✅ Benchmark superiori a AWS/GCP equivalenti

#### **4. Semplicità Gestione**

- ✅ UI intuitiva (stile DigitalOcean)
- ✅ API completa
- ✅ Managed Services disponibili
- ✅ Ottima documentazione
- ✅ Supporto 24/7 (in tedesco/inglese)

#### **5. Ecosistema Maturo**

- ✅ Load Balancer
- ✅ Managed Database (MySQL, PostgreSQL)
- ✅ Object Storage (S3-compatible)
- ✅ Firewall gestito
- ✅ Private Networking
- ✅ Snapshots & Backups automatici

---

## 🏗️ Architettura Proposta

### **Fase 1: MVP/Lancio Iniziale (50-100 utenti)**

**Architettura Single-Server Ottimizzata**

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Cloudflare CDN + WAF                       │
│              (Free Tier + $5/mese Pro)                  │
│   - SSL/TLS Automatico                                  │
│   - DDoS Protection                                     │
│   - Caching assets statici                              │
│   - WAF (Web Application Firewall)                      │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────┐
│        Hetzner Server CPX31 (4 vCPU, 8GB RAM)          │
│              €11.90/mese (~€145/anno)                   │
│                                                          │
│  ┌────────────────────────────────────────────────┐   │
│  │           Docker Compose Stack                  │   │
│  │                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐           │   │
│  │  │   Nginx      │  │   Certbot    │           │   │
│  │  │   (Reverse   │  │   (SSL)      │           │   │
│  │  │    Proxy)    │  │              │           │   │
│  │  └──────┬───────┘  └──────────────┘           │   │
│  │         │                                       │   │
│  │         ├──────────┬───────────┬──────────┐   │   │
│  │         ▼          ▼           ▼          ▼   │   │
│  │  ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────┐ │   │
│  │  │ Frontend │ │Backend │ │Backend │ │Redis │ │   │
│  │  │  (SPA)   │ │ Node 1 │ │ Node 2 │ │Cache │ │   │
│  │  └──────────┘ └────────┘ └────────┘ └──────┘ │   │
│  │                    │           │               │   │
│  │                    └─────┬─────┘               │   │
│  │                          ▼                      │   │
│  │                   ┌────────────┐               │   │
│  │                   │   MySQL    │               │   │
│  │                   │  Database  │               │   │
│  │                   └────────────┘               │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
│  Volume persistenti:                                    │
│  - /var/lib/mysql      (Database)                      │
│  - /var/backups        (Backup locali)                 │
│  - /var/log            (Logs)                          │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│        Hetzner Storage Box (100GB)                      │
│              €3.81/mese (~€46/anno)                     │
│                                                          │
│  - Backup giornalieri automatici                        │
│  - Retention 30 giorni                                  │
│  - Protocolli: SFTP, SMB, WebDAV                       │
└─────────────────────────────────────────────────────────┘

COSTO TOTALE MENSILE: ~€20/mese (~€240/anno)
```

#### **Specifiche Server CPX31**

- **CPU:** 4 vCPU AMD EPYC
- **RAM:** 8GB DDR4
- **Storage:** 160GB NVMe SSD
- **Network:** 20 TB traffico/mese incluso
- **Backup:** Snapshot incrementali (+20% costo base)

#### **Vantaggi Architettura Single-Server**

✅ **Semplicità:** Un solo server da gestire
✅ **Costo minimo:** ~€240/anno tutto incluso
✅ **Sufficiente per 50-100 utenti concorrenti**
✅ **Deploy veloce:** Docker Compose ready
✅ **Manutenzione minima:** Pochi componenti
✅ **Monitoring integrato:** Hetzner Cloud Console

---

### **Fase 2: Crescita (100-500 utenti)**

**Architettura Multi-Server con Alta Disponibilità**

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Cloudflare CDN + WAF + DDoS Pro                 │
│              ($20/mese)                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│        Hetzner Load Balancer                            │
│              €5.90/mese                                 │
│   - Health checks                                       │
│   - SSL termination                                     │
│   - Sticky sessions                                     │
└─────┬────────────────────────┬──────────────────────────┘
      │                        │
      ▼                        ▼
┌─────────────┐          ┌─────────────┐
│  App Server │          │  App Server │
│   CPX31     │          │   CPX31     │
│  €11.90/m   │          │  €11.90/m   │
│             │          │             │
│  Frontend + │          │  Frontend + │
│  Backend x2 │          │  Backend x2 │
│  Redis      │          │  Redis      │
└──────┬──────┘          └──────┬──────┘
       │                        │
       └────────┬───────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│        Hetzner Managed MySQL Database                   │
│              CPX21 (€12/mese)                           │
│                                                          │
│  - Automatic backups                                    │
│  - Point-in-time recovery                              │
│  - High availability (optional: €24/mese)              │
│  - Encryption at rest                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│        Hetzner Object Storage (S3-compatible)           │
│              €5/mese (250GB)                            │
│                                                          │
│  - Backup database giornalieri                          │
│  - Upload documenti utenti                              │
│  - Log archiving                                        │
└─────────────────────────────────────────────────────────┘

COSTO TOTALE MENSILE: ~€67/mese (~€800/anno)
```

#### **Vantaggi Architettura Multi-Server**

✅ **Alta disponibilità:** Zero downtime su deploy
✅ **Scalabilità orizzontale:** Aggiungi server al load balancer
✅ **Database gestito:** Backup automatici, HA optional
✅ **Failover automatico:** Se un server cade, l'altro serve
✅ **Performance migliorate:** Load balancing del traffico
✅ **Monitoring avanzato:** Health checks continui

---

### **Fase 3: Scala Enterprise (500+ utenti)**

**Architettura Kubernetes Multi-Region**

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Cloudflare Enterprise                           │
│              ($200/mese)                                │
│   - Advanced DDoS                                       │
│   - Custom WAF rules                                    │
│   - Rate limiting                                       │
└────────────────────┬────────────────────────────────────┘
                     │
      ┌──────────────┴──────────────┐
      │                             │
      ▼                             ▼
┌──────────────┐            ┌──────────────┐
│   Region 1   │            │   Region 2   │
│  (Primary)   │            │  (Failover)  │
│  Falkenstein │            │  Nuremberg   │
│              │            │              │
│ Hetzner K8s  │            │ Hetzner K8s  │
│  Cluster     │◄──────────►│  Cluster     │
│  €40/mese    │  Sync DB   │  €40/mese    │
│              │            │              │
│ - 3 Worker   │            │ - 3 Worker   │
│   Nodes      │            │   Nodes      │
│ - Frontend   │            │ - Frontend   │
│   Pods x3    │            │   Pods x2    │
│ - Backend    │            │ - Backend    │
│   Pods x5    │            │   Pods x3    │
│ - Redis      │            │ - Redis      │
│   Cluster    │            │   Replica    │
└──────┬───────┘            └──────┬───────┘
       │                           │
       ▼                           ▼
┌──────────────┐            ┌──────────────┐
│ MySQL Master │◄──────────►│ MySQL Slave  │
│   CPX41      │  Replica   │   CPX31      │
│  €24/mese    │            │  €12/mese    │
└──────┬───────┘            └──────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│        Object Storage Multi-Region                      │
│              €20/mese (1TB)                             │
└─────────────────────────────────────────────────────────┘

COSTO TOTALE MENSILE: ~€336/mese (~€4,000/anno)
```

#### **Quando passare a Kubernetes?**

⚠️ **NON prima di 500+ utenti concorrenti**

Motivi:
- Complessità operativa elevata
- Costo 4x superiore
- Richiede team DevOps dedicato
- Overkill per < 500 utenti

---

## 📦 Stack Tecnologico Dettagliato

### **Frontend**

```yaml
Tecnologia: React 19 + Vite
Build: Static SPA
Hosting: Nginx + Docker
CDN: Cloudflare (caching assets)
Bundle Size: ~1.3MB gzipped
Browser Support: Chrome, Firefox, Safari, Edge (ultime 2 versioni)
```

### **Backend**

```yaml
Framework: NestJS 11
Runtime: Node.js 20 LTS
Concurrency: PM2 cluster mode (2-4 istanze)
Database: MySQL 8.0
Cache: Redis 7
Session Store: Redis
File Storage: Object Storage / Volume locale
Monitoring: Sentry + Winston logs
```

### **Database**

```yaml
Engine: MySQL 8.0 (Managed su Hetzner)
Storage Engine: InnoDB
Charset: utf8mb4
Backup Strategy:
  - Automatici giornalieri (Hetzner managed)
  - Export manuale settimanale su Object Storage
  - Point-in-time recovery: 7 giorni
Encryption: At rest (Hetzner managed)
Connection Pool: 50-100 connessioni
```

### **Caching**

```yaml
Engine: Redis 7
Use Cases:
  - Session store
  - Rate limiting
  - Query caching
  - API response caching
Memory: 512MB - 2GB
Eviction Policy: allkeys-lru
Persistence: RDB + AOF
```

---

## 🔐 Sicurezza

### **Layer di Sicurezza**

```
┌─────────────────────────────────────────┐
│ Layer 7: Application                    │
│ - Input validation (class-validator)    │
│ - SQL injection protection (TypeORM)    │
│ - XSS protection (CSP headers)          │
│ - CSRF tokens                           │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ Layer 6: API Gateway                    │
│ - Rate limiting (Redis)                 │
│ - JWT authentication                    │
│ - RBAC authorization                    │
│ - Request signing                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ Layer 5: Web Application Firewall       │
│ - Cloudflare WAF                        │
│ - OWASP top 10 protection              │
│ - Bot detection                         │
│ - DDoS mitigation                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ Layer 4: Transport                      │
│ - TLS 1.3                               │
│ - Perfect Forward Secrecy               │
│ - HSTS (max-age=31536000)              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ Layer 3: Network                        │
│ - Hetzner Firewall                      │
│ - Private networking                    │
│ - SSH key-only access                   │
│ - Fail2ban                              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ Layer 2: Data                           │
│ - Encryption at rest (MySQL)            │
│ - Encrypted backups                     │
│ - Password hashing (bcrypt rounds=12)   │
│ - Sensitive data masking in logs        │
└─────────────────────────────────────────┘
```

### **Compliance GDPR**

#### **Requisiti Implementati**

✅ **Data Minimization**
- Solo dati necessari per il servizio
- Cancellazione automatica dopo retention period

✅ **Right to Access**
- API `/api/users/me/export` per download dati utente
- Formato JSON + PDF

✅ **Right to Erasure**
- Soft delete con retention 30 giorni
- Hard delete permanente dopo retention
- Anonimizzazione dati analytics

✅ **Data Portability**
- Export in formato standard (JSON, CSV)
- Importazione dati da altri sistemi

✅ **Consent Management**
- Cookie consent banner
- Opt-in per marketing
- Tracciamento consensi in DB

✅ **Breach Notification**
- Log di audit completi
- Alert automatici su Sentry
- Procedura notifica entro 72h

✅ **Data Protection by Design**
- Encryption at rest
- TLS in transit
- Pseudonimizzazione dati sensibili

---

## 🔄 CI/CD Pipeline

### **GitHub Actions Workflow**

```yaml
# .github/workflows/production-deploy.yml

name: Production Deploy

on:
  push:
    branches: [main]
    tags:
      - 'v*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          npm install
          npm run test:cov
          # Fail se coverage < 60%

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker images
        run: |
          docker build -t resolv-backend:${{ github.sha }} ./apps/backend
          docker build -t resolv-frontend:${{ github.sha }} ./apps/frontend

      - name: Push to Registry
        run: |
          docker push resolv-backend:${{ github.sha }}
          docker push resolv-frontend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Hetzner
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HETZNER_SERVER_IP }}
          username: deploy
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/resolv
            docker-compose pull
            docker-compose up -d --no-deps backend frontend
            docker system prune -f

      - name: Health Check
        run: |
          sleep 30
          curl -f https://resolv.app/health/live || exit 1

      - name: Rollback on failure
        if: failure()
        run: |
          ssh deploy@${{ secrets.HETZNER_SERVER_IP }} \
            "cd /opt/resolv && docker-compose up -d --no-deps --rollback"
```

### **Deployment Strategy**

**Blue-Green Deployment con Docker Compose**

```bash
# Script: deploy.sh

#!/bin/bash
set -e

# 1. Pull nuove immagini
docker-compose -f docker-compose.prod.yml pull backend frontend

# 2. Start nuove istanze (green)
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale backend=4 backend

# 3. Health check green instances
sleep 10
for i in {1..5}; do
  curl -f http://localhost:3000/health/live && break || sleep 5
done

# 4. Switch traffic (update nginx upstream)
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

# 5. Stop old instances (blue)
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale backend=2 backend

# 6. Cleanup
docker system prune -f

echo "✅ Deployment completed successfully"
```

---

## 📊 Monitoring & Observability

### **Stack di Monitoring**

```
┌─────────────────────────────────────────────────────────┐
│                   Monitoring Stack                       │
└─────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Sentry     │  │  Grafana     │  │  Uptime      │
│  (Errors)    │  │  (Metrics)   │  │  Kuma        │
│              │  │              │  │              │
│ - Backend    │  │ - CPU/RAM    │  │ - HTTP 200   │
│ - Frontend   │  │ - Disk I/O   │  │ - Response   │
│ - Perf       │  │ - Network    │  │   time       │
│              │  │ - DB queries │  │ - SSL cert   │
└──────────────┘  └──────────────┘  └──────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Prometheus          │
              │   (Time-series DB)    │
              │                       │
              │ - Node Exporter       │
              │ - MySQL Exporter      │
              │ - Nginx Exporter      │
              │ - Redis Exporter      │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Loki (Logs)         │
              │                       │
              │ - Backend logs        │
              │ - Nginx access logs   │
              │ - System logs         │
              │ - Audit logs          │
              └───────────────────────┘
```

### **Metriche Chiave (SLIs)**

| Metrica | Target | Alert |
|---------|--------|-------|
| **Uptime** | 99.5% | < 99% |
| **Response Time (p95)** | < 500ms | > 1000ms |
| **Error Rate** | < 0.1% | > 1% |
| **CPU Usage** | < 70% | > 85% |
| **Memory Usage** | < 80% | > 90% |
| **Disk Usage** | < 80% | > 90% |
| **DB Connections** | < 80 | > 90 |
| **Backup Success** | 100% | < 100% |

### **Alerting Rules**

```yaml
# Prometheus alerting rules

groups:
  - name: resolv_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 10m
        annotations:
          summary: "p95 response time > 1s"

      - alert: DatabaseDown
        expr: mysql_up == 0
        for: 1m
        annotations:
          summary: "MySQL database is down"

      - alert: DiskSpaceLow
        expr: node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1
        for: 5m
        annotations:
          summary: "Disk space < 10%"
```

### **Dashboard Grafana**

**Dashboard 1: Application Health**
- Request rate (req/s)
- Error rate (%)
- Response time (p50, p95, p99)
- Active users

**Dashboard 2: Infrastructure**
- CPU usage per server
- Memory usage
- Disk I/O
- Network traffic

**Dashboard 3: Database**
- Query performance
- Connection pool
- Slow queries
- Table sizes

**Dashboard 4: Business Metrics**
- Pratiche create/giorno
- Utenti attivi
- Upload documenti
- Report generati

---

## 💾 Backup & Disaster Recovery

### **Strategia di Backup 3-2-1**

```
3 Copie dei dati
2 Media differenti
1 Copia off-site
```

#### **Implementazione**

```yaml
Backup Tier 1: Database automatici
  Frequenza: Ogni 6 ore
  Retention: 7 giorni
  Storage: Hetzner Managed MySQL snapshots
  RTO: 1 ora
  RPO: 6 ore

Backup Tier 2: Export completo
  Frequenza: Giornaliero (02:00 AM)
  Retention: 30 giorni
  Storage: Hetzner Object Storage (same region)
  RTO: 4 ore
  RPO: 24 ore

Backup Tier 3: Off-site geografico
  Frequenza: Settimanale
  Retention: 90 giorni
  Storage: AWS S3 Glacier (eu-central-1)
  RTO: 24 ore
  RPO: 7 giorni
```

### **Procedura Disaster Recovery**

#### **Scenario 1: Failure Database**

```bash
# Tempo stimato: 1 ora

# 1. Stop applicazione
docker-compose stop backend

# 2. Restore ultimo snapshot Hetzner
# (via Hetzner Cloud Console - Point-in-time recovery)

# 3. Verifica integrità
mysql -h restored-db -u admin -p -e "SHOW TABLES; SELECT COUNT(*) FROM pratiche;"

# 4. Riconnetti applicazione
# Aggiorna DB_HOST in .env
docker-compose up -d backend

# 5. Verifica funzionalità
curl https://resolv.app/health/ready
```

#### **Scenario 2: Server Compromesso**

```bash
# Tempo stimato: 4 ore

# 1. Provision nuovo server Hetzner
hcloud server create --name resolv-app-new --type cpx31 --image ubuntu-22.04

# 2. Clone repository
git clone https://github.com/your-org/resolv.git

# 3. Restore backup database da Object Storage
wget https://storage.hetzner.cloud/backups/latest.sql.gz
gunzip latest.sql.gz
mysql -h managed-db -u admin -p < latest.sql

# 4. Deploy applicazione
docker-compose -f docker-compose.prod.yml up -d

# 5. Update DNS
# Point resolv.app to new IP

# 6. Verify
curl https://resolv.app/health/live
```

#### **Scenario 3: Data Center Failure (region down)**

```bash
# Tempo stimato: 8-12 ore

# 1. Failover to secondary region (se configurato)
# 2. Restore DB da backup off-site (AWS S3 Glacier)
# 3. Provision server in region alternativa
# 4. Deploy da backup
# 5. Update DNS con nuovo IP
```

---

## 💰 Analisi Costi Dettagliata

### **Scenario A: Startup (0-100 utenti) - Fase MVP**

| Servizio | Provider | Spec | Costo/Mese | Costo/Anno |
|----------|----------|------|------------|------------|
| **Application Server** | Hetzner | CPX31 (4 vCPU, 8GB) | €11.90 | €142.80 |
| **Backup Storage** | Hetzner | Storage Box 100GB | €3.81 | €45.72 |
| **Snapshots** | Hetzner | Server snapshots | €2.38 | €28.56 |
| **CDN + SSL** | Cloudflare | Free Plan | €0 | €0 |
| **Monitoring** | Uptime Kuma | Self-hosted | €0 | €0 |
| **Error Tracking** | Sentry | 5K events/mese | €0 | €0 |
| **Domain** | Namecheap | .it domain | €0.83 | €10 |
| **Email** | Gmail SMTP | 500 email/giorno | €0 | €0 |
| **TOTALE** | | | **€18.92** | **€227** |

**💡 Risparmio vs AWS:** ~€1,200/anno (84% risparmio)

---

### **Scenario B: Growth (100-500 utenti) - Fase Crescita**

| Servizio | Provider | Spec | Costo/Mese | Costo/Anno |
|----------|----------|------|------------|------------|
| **App Server 1** | Hetzner | CPX31 (4 vCPU, 8GB) | €11.90 | €142.80 |
| **App Server 2** | Hetzner | CPX31 (4 vCPU, 8GB) | €11.90 | €142.80 |
| **Load Balancer** | Hetzner | LB11 | €5.90 | €70.80 |
| **Managed Database** | Hetzner | CPX21 MySQL (3 vCPU, 4GB) | €12.00 | €144.00 |
| **Object Storage** | Hetzner | 250GB | €5.00 | €60.00 |
| **CDN + WAF** | Cloudflare | Pro Plan | €20.00 | €240.00 |
| **Monitoring** | Grafana Cloud | Free tier | €0 | €0 |
| **Error Tracking** | Sentry | Team 50K events | €26.00 | €312.00 |
| **Email** | SendGrid | Essential 50K/mese | €20.00 | €240.00 |
| **Backup Off-site** | AWS S3 Glacier | 100GB | €2.00 | €24.00 |
| **Domain + SSL** | | | €0.83 | €10 |
| **TOTALE** | | | **€115.53** | **€1,386** |

**💡 Risparmio vs AWS:** ~€2,500/anno (64% risparmio)

---

### **Scenario C: Enterprise (500+ utenti) - Fase Matura**

| Servizio | Provider | Spec | Costo/Mese | Costo/Anno |
|----------|----------|------|------------|------------|
| **Kubernetes Cluster** | Hetzner | 3 workers CPX31 | €35.70 | €428.40 |
| **Control Plane** | Hetzner | Managed K8s | €0 | €0 |
| **Database Primary** | Hetzner | CPX41 MySQL (8 vCPU, 16GB) | €24.00 | €288.00 |
| **Database Replica** | Hetzner | CPX31 MySQL Slave | €12.00 | €144.00 |
| **Load Balancer** | Hetzner | LB31 | €11.90 | €142.80 |
| **Object Storage** | Hetzner | 1TB | €20.00 | €240.00 |
| **Redis Managed** | Hetzner | CPX11 | €4.90 | €58.80 |
| **CDN + WAF** | Cloudflare | Business | €200.00 | €2,400.00 |
| **Monitoring** | Grafana Cloud | Pro | €49.00 | €588.00 |
| **Error Tracking** | Sentry | Business | €80.00 | €960.00 |
| **Email** | SendGrid | Pro 100K/mese | €90.00 | €1,080.00 |
| **Backup Multi-Region** | AWS S3 + Glacier | 500GB | €15.00 | €180.00 |
| **SSL Certificates** | Cloudflare | Included | €0 | €0 |
| **TOTALE** | | | **€542.50** | **€6,510** |

**💡 Risparmio vs AWS:** ~€8,000/anno (55% risparmio)

---

### **Comparazione Costi Cloud Providers**

#### **Configurazione Equivalente: 2 server + DB managed + Storage**

| Provider | Spec | Costo/Mese | Costo/Anno | vs Hetzner |
|----------|------|------------|------------|------------|
| **Hetzner** ⭐ | 2x CPX31 + MySQL CPX21 + 250GB | €40.80 | €490 | **Baseline** |
| **DigitalOcean** | 2x Droplet 4GB + Managed DB | €96.00 | €1,152 | +135% 💸 |
| **AWS** | 2x t3.medium + RDS t3.small | €115.00 | €1,380 | +182% 💸💸 |
| **Linode** | 2x Linode 4GB + Managed DB | €70.00 | €840 | +71% 💸 |
| **Azure** | 2x B2s + SQL Basic | €130.00 | €1,560 | +218% 💸💸💸 |

**Vincitore: Hetzner** (fino a 2-3x più economico) 🏆

---

## 🚀 Piano di Migrazione

### **Roadmap Deploy Produzione**

#### **Settimana 1: Setup Infrastruttura**

```bash
# Giorno 1: Provisioning
- [x] Crea account Hetzner Cloud
- [x] Provision server CPX31 (Falkenstein)
- [x] Setup SSH keys
- [x] Configura Hetzner Firewall
- [x] Setup private networking

# Giorno 2: DNS & CDN
- [x] Registra dominio .it
- [x] Setup Cloudflare
- [x] Configura DNS records
- [x] Enable Cloudflare proxy

# Giorno 3: Server Setup
- [x] Install Docker + Docker Compose
- [x] Clone repository
- [x] Setup .env produzione
- [x] Configura firewall (ufw)

# Giorno 4: Database
- [x] Provision Hetzner Managed MySQL
- [x] Run migrations
- [x] Seed admin user
- [x] Test connessione

# Giorno 5: SSL + Deploy
- [x] Genera certificati Let's Encrypt
- [x] Deploy applicazione
- [x] Test end-to-end
- [x] Setup backup automatico
```

#### **Settimana 2: Testing & Monitoring**

```bash
# Giorno 6-7: Testing
- [x] Load testing (K6)
- [x] Security audit (OWASP ZAP)
- [x] Penetration testing
- [x] Performance tuning

# Giorno 8-9: Monitoring
- [x] Setup Sentry
- [x] Configure Grafana
- [x] Setup Uptime Kuma
- [x] Configure alerts

# Giorno 10: Go-Live Preparation
- [x] Final backup
- [x] Disaster recovery test
- [x] Team training
- [x] Documentation review
```

#### **Settimana 3: Go-Live**

```bash
# Giorno 11: Soft Launch
- [x] Deploy to production
- [x] Enable maintenance mode
- [x] Import production data
- [x] Smoke tests

# Giorno 12: Public Launch
- [x] Disable maintenance mode
- [x] Monitor metrics 24/7
- [x] User onboarding
- [x] Support team ready

# Giorno 13-14: Stabilization
- [x] Bug fixes
- [x] Performance optimization
- [x] User feedback collection
- [x] Post-mortem meeting
```

---

## 📋 Checklist Pre-Produzione

### **Infrastruttura**

- [ ] Server provisionato e configurato
- [ ] Database managed setup
- [ ] Backup automatici configurati
- [ ] Storage per documenti configurato
- [ ] CDN + SSL funzionanti
- [ ] DNS puntano al server
- [ ] Firewall configurato correttamente
- [ ] Private networking attivo

### **Applicazione**

- [ ] Test coverage >= 60%
- [ ] Security audit completato
- [ ] Performance test passati
- [ ] SSL/TLS A rating
- [ ] Variabili ambiente configurate
- [ ] SMTP email funzionante
- [ ] Sentry error tracking attivo
- [ ] Logging configurato

### **Operazioni**

- [ ] Procedure disaster recovery testate
- [ ] Backup restore testato
- [ ] Monitoring + alerting attivo
- [ ] Runbook operativo completo
- [ ] Team training completato
- [ ] On-call rotation definita
- [ ] Escalation plan documentato

### **Compliance**

- [ ] GDPR compliance verificato
- [ ] Privacy policy pubblicata
- [ ] Cookie consent implementato
- [ ] Terms of service pubblicati
- [ ] Data processing agreement firmato
- [ ] DPA con fornitori cloud

---

## 🎯 KPI & Obiettivi

### **Metriche Tecniche**

| Metrica | Q1 2026 | Q2 2026 | Q3 2026 | Q4 2026 |
|---------|---------|---------|---------|---------|
| **Uptime** | 99.0% | 99.5% | 99.7% | 99.9% |
| **p95 Latency** | <1s | <700ms | <500ms | <400ms |
| **Error Rate** | <1% | <0.5% | <0.1% | <0.05% |
| **Test Coverage** | 60% | 70% | 80% | 85% |

### **Metriche Business**

| Metrica | Q1 2026 | Q2 2026 | Q3 2026 | Q4 2026 |
|---------|---------|---------|---------|---------|
| **Utenti Attivi** | 50 | 150 | 300 | 500 |
| **Studi Legali** | 5 | 15 | 30 | 50 |
| **Pratiche Gestite** | 200 | 800 | 2,000 | 5,000 |
| **Documenti Caricati** | 500 | 2,000 | 6,000 | 15,000 |

---

## 🔮 Evoluzione Futura

### **Fase 4: Multi-Tenancy SaaS (2027)**

**Architettura proposta:**

- **Kubernetes multi-region** (Hetzner + AWS backup)
- **Database sharding** per tenant
- **CDN globale** (Cloudflare Enterprise)
- **Auto-scaling** basato su metriche
- **Multi-tenancy isolation** completo
- **White-label** per clienti enterprise

**Costi stimati:** €2,000-3,000/mese

### **Fase 5: AI/ML Features (2028+)**

**Funzionalità:**

- **AI-powered document analysis** (OCR + NLP)
- **Predictive analytics** per recupero crediti
- **Chatbot assistenza** clienti
- **Anomaly detection** per frodi

**Stack aggiuntivo:**

- Python backend per ML
- GPU instances per inference
- Vector database (Pinecone/Weaviate)
- Model serving (TensorFlow Serving)

---

## 📚 Risorse & Documentazione

### **Hetzner Cloud**

- [Documentazione ufficiale](https://docs.hetzner.com/)
- [API Reference](https://docs.hetzner.cloud/)
- [Community Tutorials](https://community.hetzner.com/)
- [Status Page](https://status.hetzner.com/)

### **Best Practices**

- [12 Factor App](https://12factor.net/)
- [Docker Production Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Checklist](https://github.com/goldbergyoni/nodebestpractices)
- [MySQL Optimization](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)

### **Security**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)
- [SSL Labs Best Practices](https://github.com/ssllabs/research/wiki/SSL-and-TLS-Deployment-Best-Practices)

---

## ✅ Conclusioni

### **Raccomandazione Finale: Hetzner Cloud**

**Motivi:**

1. **Costo/Performance imbattibile:** 60-75% risparmio vs AWS/Azure
2. **GDPR compliant:** Data center EU, normativa europea
3. **Latenza ottima:** ~20-30ms per utenti italiani
4. **Semplicità:** Meno complessità operativa di AWS
5. **Affidabilità:** 99.9% uptime SLA
6. **Scalabilità:** Facile upgrade da single-server a cluster K8s

### **Architettura Consigliata per Lancio**

**Fase MVP (0-100 utenti):**
- ✅ Single server CPX31 (~€20/mese)
- ✅ Docker Compose
- ✅ Cloudflare Free CDN
- ✅ Backup Hetzner Storage Box

**ROI:** Operativo in 3 settimane, costo annuale ~€240

### **Next Steps Immediati**

1. **Questa settimana:**
   - [ ] Crea account Hetzner Cloud
   - [ ] Provision server CPX31
   - [ ] Registra dominio

2. **Prossima settimana:**
   - [ ] Deploy applicazione
   - [ ] Setup SSL
   - [ ] Configure monitoring

3. **Terza settimana:**
   - [ ] Testing completo
   - [ ] Go-live soft launch

**Timeline go-live:** 3 settimane ⏱️

---

**Documento Versione:** 1.0
**Ultima Revisione:** 18 Gennaio 2026
**Prossimo Review:** Dopo 3 mesi di produzione
**Owner:** Tech Team Resolv
