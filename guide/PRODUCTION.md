# Resolv - Production Deployment Guide

Guida completa per il deployment in produzione con focus su sicurezza, performance e monitoring.

## Indice

1. [Pre-requisiti](#pre-requisiti)
2. [Sicurezza](#sicurezza)
3. [Monitoring & Logging](#monitoring--logging)
4. [Performance](#performance)
5. [Database Encryption](#database-encryption)
6. [Backup Strategy](#backup-strategy)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Pre-requisiti

### Infrastruttura Minima

- **Server**: 2 vCPU, 4GB RAM minimo (consigliato: 4 vCPU, 8GB RAM)
- **Storage**: 50GB SSD (con auto-scaling per backups)
- **Database**: MySQL 8.0+ o MariaDB 10.5+ con encryption support
- **Redis**: 6.0+ per caching e rate limiting
- **Reverse Proxy**: Nginx o Caddy con SSL/TLS
- **Backup Storage**: S3-compatible storage (AWS S3, MinIO, Backblaze B2)

### Servizi Esterni Raccomandati

1. **Error Tracking**: [Sentry](https://sentry.io) (free tier available)
2. **Log Aggregation**:
   - Elasticsearch + Kibana (self-hosted)
   - AWS CloudWatch
   - Datadog
3. **Performance Monitoring**: Sentry APM incluso
4. **Uptime Monitoring**: UptimeRobot, Pingdom, o StatusCake

---

## Sicurezza

### 1. Variabili d'Ambiente Critiche

```bash
# Generate strong secrets
JWT_SECRET=$(openssl rand -base64 64)
DB_PASSWORD=$(openssl rand -base64 32)
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)

# Set in .env
echo "JWT_SECRET=$JWT_SECRET" >> .env
echo "DB_PASSWORD=$DB_PASSWORD" >> .env
echo "MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD" >> .env
```

### 2. CORS Configuration

```bash
# Production domains only
CORS_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com

# NO wildcards in production!
# BAD: CORS_ORIGINS=*
# BAD: CORS_ORIGINS=http://
```

### 3. Rate Limiting

**Configurazione Production:**
```bash
RATE_LIMIT_MAX=100  # 100 req/min globally
RATE_LIMIT_TTL=60000  # 1 minute window
```

**Limiti endpoint-specifici (già configurati nel codice):**
- Login: 5 req/min (brute-force protection)
- Password reset: 3 req/15min
- Backup operations: 3-5 req/hour
- Import/Export: 5-10 req/hour

### 4. HTTPS Setup (Nginx)

```nginx
# /etc/nginx/sites-available/resolv

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

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

        # Timeout for long operations
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Monitoring & Logging

### 1. Sentry Setup

**Crea progetto su Sentry:**
1. Vai su https://sentry.io
2. Crea nuovo progetto (tipo: Node.js)
3. Copia il DSN

**Configura `.env`:**
```bash
SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/987654
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% transaction tracing
SENTRY_PROFILES_SAMPLE_RATE=0.05  # 5% profiling
```

**Features abilitate:**
- ✅ Error tracking automatico
- ✅ Performance monitoring (APM)
- ✅ Profiling CPU/Memory
- ✅ User context tracking
- ✅ Breadcrumbs per debugging
- ✅ Release tracking

### 2. Centralized Logging

**Opzione A: Elasticsearch (self-hosted)**
```bash
# Install Elasticsearch + Kibana
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  elasticsearch:8.11.0

docker run -d \
  --name kibana \
  -p 5601:5601 \
  --link elasticsearch \
  kibana:8.11.0
```

**Opzione B: AWS CloudWatch**
```bash
# Install CloudWatch agent
sudo wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configure in .env
LOG_TO_FILE=true
```

**Opzione C: Datadog**
```bash
DATADOG_API_KEY=your-api-key
DD_SITE=datadoghq.com
```

### 3. Performance Metrics

**Endpoint disponibili:**
```bash
# Health check
GET /health
GET /health/ready  # Kubernetes readiness
GET /health/live   # Kubernetes liveness

# Performance metrics
GET /health/metrics
```

**Risposta `/health/metrics`:**
```json
{
  "health": {
    "status": "healthy",
    "uptime": 3600,
    "cpu": 45.2,
    "memory": 62.5,
    "heap": 48.3
  },
  "metrics": {
    "system.cpu_usage_percent": {
      "count": 100,
      "avg": 45.2,
      "min": 12.5,
      "max": 89.3,
      "p50": 42.1,
      "p95": 78.4,
      "p99": 85.2
    },
    "system.memory_usage_percent": {...},
    "auth.login": {...}
  }
}
```

---

## Performance

### 1. Database Optimization

**MySQL Configuration (`my.cnf`):**
```ini
[mysqld]
# InnoDB settings
innodb_buffer_pool_size=2G  # 50-70% of available RAM
innodb_log_file_size=512M
innodb_flush_log_at_trx_commit=2
innodb_file_per_table=1

# Query cache (deprecated in MySQL 8.0)
# Use Redis for application-level caching

# Connection limits
max_connections=200
max_connect_errors=10000

# Slow query log
slow_query_log=1
slow_query_log_file=/var/log/mysql/slow.log
long_query_time=1

# Binary logging (for replication/recovery)
log_bin=/var/log/mysql/binlog
binlog_format=ROW
expire_logs_days=7
```

### 2. Redis Configuration

```bash
# redis.conf

# Memory
maxmemory 1gb
maxmemory-policy allkeys-lru

# Persistence (for rate limiting data)
save 900 1
save 300 10
save 60 10000

# Performance
tcp-backlog 511
timeout 300
tcp-keepalive 300
```

### 3. Node.js Tuning

```bash
# PM2 configuration (pm2.config.js)
module.exports = {
  apps: [{
    name: 'resolv-backend',
    script: './dist/main.js',
    instances: 'max',  # Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=1024'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};

# Start with PM2
pm2 start pm2.config.js --env production
pm2 save
pm2 startup
```

---

## Database Encryption

### Opzione 1: AWS RDS (Raccomandato)

```bash
# Create RDS instance with encryption
aws rds create-db-instance \
  --db-instance-identifier resolv-prod \
  --db-instance-class db.t3.medium \
  --engine mysql \
  --engine-version 8.0.35 \
  --master-username admin \
  --master-user-password $DB_PASSWORD \
  --allocated-storage 100 \
  --storage-type gp3 \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:region:account-id:key/key-id \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00"
```

### Opzione 2: Google Cloud SQL

```bash
# Create encrypted instance
gcloud sql instances create resolv-prod \
  --database-version=MYSQL_8_0 \
  --tier=db-n1-standard-2 \
  --region=europe-west1 \
  --storage-type=SSD \
  --storage-size=100GB \
  --storage-auto-increase \
  --backup \
  --enable-bin-log \
  --disk-encryption-key=projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY
```

### Opzione 3: Self-Hosted con Percona

```bash
# Install Percona Server with encryption
docker run -d \
  --name mysql-encrypted \
  -e MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD \
  -e MYSQL_DATABASE=recupero_crediti \
  -v mysql_data:/var/lib/mysql \
  -v ./encryption-key.txt:/etc/mysql-encryption-key.txt:ro \
  percona/percona-server:8.0 \
  --early-plugin-load=keyring_file.so \
  --keyring_file_data=/etc/mysql-encryption-key.txt \
  --innodb-encrypt-tables=ON \
  --innodb-encrypt-logs=ON \
  --default-table-encryption=ON
```

### Opzione 4: Docker Encrypted Volume

```bash
# Create encrypted volume (Linux only)
docker volume create \
  --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=10g,encryption=aes-256-gcm \
  mysql_encrypted_data

# Update docker-compose.yml
volumes:
  mysql_data:
    external: true
    name: mysql_encrypted_data
```

---

## Backup Strategy

### 1. Automated Backups

**Già configurato nel codice:**
- Backup automatico ogni 24 ore (configurabile)
- Retention: 30 backup (configurabile, oltre il limite elimina il più vecchio)
- Formato: SQL dump con mariadb-dump

**Configurazione:**
```bash
BACKUP_SCHEDULE_INTERVAL=86400000  # 24 hours
BACKUP_MAX_COUNT=30
BACKUP_RETENTION_DAYS=30
```

### 2. External Backup Storage (S3)

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure
aws configure

# Sync backups to S3
aws s3 sync ./backups s3://your-bucket/resolv-backups/ \
  --storage-class STANDARD_IA \
  --server-side-encryption AES256

# Automate with cron
0 2 * * * aws s3 sync /path/to/backups s3://your-bucket/resolv-backups/
```

### 3. Backup Restoration Test

**Testa il restore monthly:**
```bash
# Download from S3
aws s3 cp s3://your-bucket/resolv-backups/backup-latest.sql ./

# Restore to test database
mysql -h test-db-host -u root -p test_db < backup-latest.sql

# Verify data integrity
mysql -h test-db-host -u root -p -e "SELECT COUNT(*) FROM test_db.pratiche;"
```

---

## Deployment

### Option 1: Docker Compose (Simple)

```bash
# Production deployment
git clone <repo>
cd resolv
cp .env.example .env

# Configure .env with production values
vim .env

# Build and start
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check logs
docker compose logs -f
```

### Option 2: Kubernetes (Scalable)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resolv-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: resolv-backend
  template:
    metadata:
      labels:
        app: resolv-backend
    spec:
      containers:
      - name: backend
        image: your-registry/resolv-backend:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: resolv-secrets
              key: db-host
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

### Option 3: AWS ECS/Fargate

```json
{
  "family": "resolv",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [{
    "name": "backend",
    "image": "your-registry/resolv-backend:1.0.0",
    "portMappings": [{
      "containerPort": 3000,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "NODE_ENV", "value": "production"}
    ],
    "secrets": [
      {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:..."}
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:3000/health/live || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3
    },
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/resolv",
        "awslogs-region": "eu-central-1",
        "awslogs-stream-prefix": "backend"
      }
    }
  }]
}
```

---

## Troubleshooting

### High CPU Usage

```bash
# Check metrics
curl http://localhost:3000/health/metrics

# If CPU > 80%:
# 1. Scale horizontally (add instances)
# 2. Check slow queries
# 3. Review Sentry for performance issues
# 4. Enable query cache in Redis
```

### High Memory Usage

```bash
# Check Node.js heap
curl http://localhost:3000/health/metrics | grep heap

# If heap > 90%:
# 1. Increase NODE_OPTIONS --max-old-space-size
# 2. Check for memory leaks in Sentry
# 3. Restart application
```

### Database Connection Issues

```bash
# Check database health
curl http://localhost:3000/health/ready

# Check connections
mysql -h localhost -u root -p -e "SHOW PROCESSLIST;"

# Increase max_connections if needed
mysql -h localhost -u root -p -e "SET GLOBAL max_connections=300;"
```

### Rate Limiting Too Strict

```bash
# Temporarily increase (requires restart)
RATE_LIMIT_MAX=200

# Or whitelist specific IPs in code
```

---

## Production Checklist

**Before Going Live:**

- [ ] All secrets generated and secure
- [ ] HTTPS configured and working
- [ ] CORS restricted to production domains
- [ ] Sentry configured and tested
- [ ] Backups tested (create + restore)
- [ ] Rate limiting tested
- [ ] Database encrypted (if using sensitive data)
- [ ] Monitoring dashboards configured
- [ ] Health checks responding
- [ ] Performance tested (load testing)
- [ ] Documentation updated
- [ ] Team trained on monitoring tools
- [ ] Incident response plan documented
- [ ] Regular backup schedule automated
- [ ] Log retention policy configured

**Monthly Tasks:**
- [ ] Review Sentry errors
- [ ] Test backup restoration
- [ ] Review performance metrics
- [ ] Update dependencies (security patches)
- [ ] Review and rotate secrets

---

## Support

Per supporto:
1. Check Sentry for errors
2. Review logs in monitoring dashboard
3. Check `/health/metrics` endpoint
4. Consult this documentation

**Emergency Contacts:**
- DevOps Team: devops@yourdomain.com
- Database Admin: dba@yourdomain.com
- Security Team: security@yourdomain.com
