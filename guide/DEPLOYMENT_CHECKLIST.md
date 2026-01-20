# Resolv Production Deployment Checklist

## Pre-Deployment Checklist

### 1. Environment Configuration ✅

- [ ] Copy `.env.example` to `.env` in project root
- [ ] Generate strong JWT secrets:
  ```bash
  # JWT Secret (min 32 characters)
  openssl rand -base64 64

  # JWT Refresh Secret (min 32 characters)
  openssl rand -base64 64
  ```
- [ ] Update database credentials (never use default passwords in production)
- [ ] Configure CORS origins with production domain
- [ ] Set `NODE_ENV=production`
- [ ] Configure SMTP settings for email notifications
- [ ] Add Sentry DSN for error tracking (optional but recommended)

**Critical Environment Variables:**
```bash
# Security
JWT_SECRET=<strong-random-string>
JWT_REFRESH_SECRET=<strong-random-string>
MYSQL_ROOT_PASSWORD=<strong-password>
DB_PASSWORD=<strong-password>

# Application
NODE_ENV=production
CORS_ORIGINS=https://yourdomain.com

# Monitoring (optional)
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
```

### 2. Server Requirements ✅

**Minimum Server Specifications:**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- OS: Ubuntu 22.04 LTS (recommended) or similar

**Recommended for Production:**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 50 GB SSD
- OS: Ubuntu 22.04 LTS

**Required Software:**
- Docker Engine 24.0+
- Docker Compose 2.20+
- Git
- UFW or iptables (firewall)

### 3. Security Setup ✅

- [ ] Setup firewall rules:
  ```bash
  # Allow SSH
  sudo ufw allow 22/tcp

  # Allow HTTP/HTTPS
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp

  # Enable firewall
  sudo ufw enable
  ```

- [ ] Disable password authentication for SSH
  ```bash
  # Edit /etc/ssh/sshd_config
  PasswordAuthentication no
  PermitRootLogin no

  # Restart SSH
  sudo systemctl restart sshd
  ```

- [ ] Setup fail2ban for brute force protection:
  ```bash
  sudo apt-get install fail2ban
  sudo systemctl enable fail2ban
  sudo systemctl start fail2ban
  ```

- [ ] Configure automatic security updates:
  ```bash
  sudo apt-get install unattended-upgrades
  sudo dpkg-reconfigure --priority=low unattended-upgrades
  ```

### 4. SSL Certificate Setup ✅

**Using Let's Encrypt (Recommended):**

- [ ] Update `nginx.conf` with your domain name
- [ ] Create certbot directories:
  ```bash
  mkdir -p certbot/conf certbot/www
  ```

- [ ] Obtain SSL certificate:
  ```bash
  # First, start nginx without SSL to get certificate
  docker-compose -f docker-compose.prod.yml up -d nginx

  # Obtain certificate
  docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d yourdomain.com \
    -d www.yourdomain.com \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email

  # Restart nginx with SSL enabled
  docker-compose -f docker-compose.prod.yml restart nginx
  ```

- [ ] Test automatic renewal:
  ```bash
  docker-compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
  ```

## Deployment Steps

### 1. Clone Repository ✅

```bash
# Clone the repository
git clone https://github.com/yourusername/resolv.git
cd resolv

# Checkout production branch (or main)
git checkout main
```

### 2. Configure Environment ✅

```bash
# Copy environment template
cp .env.example .env

# Edit .env with production values
nano .env

# Verify configuration
cat .env | grep -v "^#" | grep -v "^$"
```

### 3. Build and Start Services ✅

```bash
# Build all images (first time or after code changes)
docker-compose -f docker-compose.prod.yml build --no-cache

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Verify Deployment ✅

- [ ] Check all containers are healthy:
  ```bash
  docker-compose -f docker-compose.prod.yml ps
  ```

- [ ] Test backend health endpoint:
  ```bash
  curl https://yourdomain.com/api/health
  ```

- [ ] Test frontend accessibility:
  ```bash
  curl -I https://yourdomain.com
  ```

- [ ] Test login functionality with default admin user:
  ```
  Email: admin@resolv.it
  Password: admin123
  ```

- [ ] **IMPORTANT:** Change default admin password immediately

### 5. Database Initialization ✅

Migrations and admin user creation run automatically on container startup via `start-with-migrations.sh`.

Manual database operations if needed:
```bash
# Run migrations manually
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run

# Create admin user manually (if needed)
docker-compose -f docker-compose.prod.yml exec backend npm run seed:admin

# Database backup
docker-compose -f docker-compose.prod.yml exec backend \
  mysqldump -h mysql -u root -p${MYSQL_ROOT_PASSWORD} recupero_crediti > backup.sql
```

## Post-Deployment Configuration

### 1. Monitoring Setup ✅

**Sentry Error Tracking:**
- [ ] Create Sentry account at sentry.io
- [ ] Create new project for Resolv
- [ ] Copy DSN to `.env` as `SENTRY_DSN`
- [ ] Restart backend: `docker-compose -f docker-compose.prod.yml restart backend`
- [ ] Test by triggering an error and checking Sentry dashboard

**Performance Monitoring:**
- [ ] Access metrics endpoint: `https://yourdomain.com/api/health/metrics`
- [ ] Setup monitoring dashboard (Grafana, Datadog, or CloudWatch)
- [ ] Configure alerts for:
  - CPU usage > 80%
  - Memory usage > 80%
  - Disk usage > 85%
  - Database connection failures
  - High error rates (> 1% of requests)

### 2. Backup Strategy ✅

**Automated Backups:**

The application includes automatic daily backups. Configure external backup storage:

- [ ] Setup S3 bucket or equivalent cloud storage
- [ ] Configure backup retention policy (default: 30 days)
- [ ] Create backup upload script:
  ```bash
  #!/bin/bash
  # /usr/local/bin/backup-to-s3.sh

  BACKUP_DIR="/var/lib/docker/volumes/resolv_backup_data/_data"
  S3_BUCKET="s3://your-backup-bucket/resolv/"

  # Upload today's backup
  aws s3 sync $BACKUP_DIR $S3_BUCKET --exclude "*" --include "backup-$(date +%Y-%m-%d)*.sql"

  # Delete local backups older than 7 days
  find $BACKUP_DIR -name "backup-*.sql" -mtime +7 -delete
  ```

- [ ] Add to crontab:
  ```bash
  # Run backup upload daily at 2 AM
  0 2 * * * /usr/local/bin/backup-to-s3.sh >> /var/log/backup-sync.log 2>&1
  ```

**Test Backup Restore:**
```bash
# List available backups
docker-compose -f docker-compose.prod.yml exec backend ls -lah /usr/src/app/backups

# Restore from backup (via API)
curl -X POST https://yourdomain.com/api/backup/restore/backup-2025-12-29.sql \
  -H "Authorization: Bearer <admin-token>"
```

### 3. Log Management ✅

**Configure Log Rotation:**

```bash
# Create /etc/logrotate.d/resolv
cat > /etc/logrotate.d/resolv << 'EOF'
/var/log/nginx/resolv_*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        docker-compose -f /path/to/resolv/docker-compose.prod.yml exec nginx nginx -s reload
    endscript
}
EOF
```

**Centralized Logging (Optional):**
- [ ] Setup ELK Stack, CloudWatch, or Datadog
- [ ] Configure log shipping from Docker containers
- [ ] Create log analysis dashboards
- [ ] Setup log-based alerts

### 4. Performance Tuning ✅

**Database Optimization:**
- [ ] Review slow query log: `docker-compose -f docker-compose.prod.yml exec mysql cat /var/log/mysql/slow.log`
- [ ] Add indexes for frequently queried columns
- [ ] Optimize `innodb_buffer_pool_size` based on available RAM (default: 1GB)

**Redis Optimization:**
- [ ] Monitor cache hit rate
- [ ] Adjust `maxmemory` based on usage patterns
- [ ] Consider Redis Sentinel for high availability

**Backend Scaling:**
- [ ] Monitor CPU and memory usage
- [ ] Increase `replicas` in docker-compose.prod.yml if needed
- [ ] Setup load balancer for multi-server deployment

## Maintenance Procedures

### Regular Tasks ✅

**Daily:**
- [ ] Check application logs for errors
- [ ] Verify backups completed successfully
- [ ] Monitor disk space usage

**Weekly:**
- [ ] Review performance metrics
- [ ] Check security alerts
- [ ] Verify SSL certificate validity

**Monthly:**
- [ ] Test backup restoration
- [ ] Review and rotate logs
- [ ] Update dependencies (security patches)
- [ ] Review user access and permissions

### Update Procedures ✅

**Application Updates:**
```bash
# Backup database before update
docker-compose -f docker-compose.prod.yml exec backend npm run backup:create

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run migrations if any
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run

# Verify deployment
curl https://yourdomain.com/api/health
```

**Database Migrations:**
```bash
# Check pending migrations
docker-compose -f docker-compose.prod.yml exec backend npm run typeorm migration:show

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migration:run

# Rollback if needed
docker-compose -f docker-compose.prod.yml exec backend npm run migration:revert
```

## Troubleshooting

### Common Issues ✅

**Backend won't start:**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Common causes:
# - Invalid JWT_SECRET
# - Database connection failed
# - Redis connection failed
# - Port 3000 already in use

# Verify environment variables
docker-compose -f docker-compose.prod.yml exec backend env | grep -E "DB_|JWT_|REDIS_"
```

**Database connection errors:**
```bash
# Check MySQL container
docker-compose -f docker-compose.prod.yml logs mysql

# Test connection
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p${MYSQL_ROOT_PASSWORD} -e "SHOW DATABASES;"
```

**SSL certificate issues:**
```bash
# Check certificate validity
docker-compose -f docker-compose.prod.yml exec nginx \
  openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -noout -dates

# Renew certificate manually
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
```

**High memory usage:**
```bash
# Check container resource usage
docker stats

# Adjust resource limits in docker-compose.prod.yml
# Restart specific service
docker-compose -f docker-compose.prod.yml restart <service-name>
```

### Emergency Procedures ✅

**Complete System Restore:**
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Restore database from backup
docker-compose -f docker-compose.prod.yml up -d mysql
docker-compose -f docker-compose.prod.yml exec -T mysql \
  mysql -u root -p${MYSQL_ROOT_PASSWORD} recupero_crediti < backup.sql

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

**Rollback Deployment:**
```bash
# Checkout previous version
git log --oneline  # Find commit to rollback to
git checkout <commit-hash>

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Revert database migrations if needed
docker-compose -f docker-compose.prod.yml exec backend npm run migration:revert
```

## Security Checklist

### Production Security Requirements ✅

- [ ] Strong passwords for all accounts (min 16 characters, mixed case, numbers, symbols)
- [ ] JWT secrets generated with cryptographically secure random generator
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Firewall configured and enabled
- [ ] SSH key-based authentication only (password auth disabled)
- [ ] Fail2ban configured for brute force protection
- [ ] Automatic security updates enabled
- [ ] Database accessible only from backend containers (not exposed to internet)
- [ ] Redis accessible only from backend containers
- [ ] Regular security audits scheduled
- [ ] Monitoring and alerting configured
- [ ] Backup and restore procedures tested
- [ ] Disaster recovery plan documented
- [ ] Access logs reviewed regularly
- [ ] Security headers configured in Nginx
- [ ] Rate limiting enabled on all endpoints
- [ ] CORS properly configured for production domains only
- [ ] Default admin password changed immediately after first login
- [ ] User roles and permissions reviewed

## Performance Benchmarks

### Expected Performance Metrics ✅

**With recommended server specs (4 CPU, 8GB RAM):**
- API response time (p95): < 100ms
- Database query time (p95): < 50ms
- Frontend load time: < 2s
- Concurrent users supported: 100+
- Requests per second: 500+

**Monitoring Thresholds:**
- CPU usage alert: > 80%
- Memory usage alert: > 80%
- Disk usage alert: > 85%
- API error rate alert: > 1%
- Response time alert: p95 > 500ms
- Database connection pool alert: > 80% utilization

## Support and Documentation

- **User Guide:** See `GUIDA_UTENTE.md` for end-user documentation
- **Technical Guide:** See `PRODUCTION.md` for detailed technical information
- **Setup Guide:** See `guide/SETUP.md` for development setup
- **API Documentation:** Access Swagger UI at `https://yourdomain.com/api/docs` (if enabled)
- **Health Checks:**
  - Liveness: `https://yourdomain.com/api/health/live`
  - Readiness: `https://yourdomain.com/api/health/ready`
  - Full health: `https://yourdomain.com/api/health`
  - Metrics: `https://yourdomain.com/api/health/metrics`

## Deployment Complete! ✅

After completing this checklist, your Resolv application should be:
- ✅ Securely deployed with HTTPS
- ✅ Fully monitored with error tracking and performance metrics
- ✅ Protected with rate limiting and security headers
- ✅ Backed up automatically with tested restore procedures
- ✅ Optimized for production performance
- ✅ Ready to scale horizontally if needed

**Next Steps:**
1. Change default admin password
2. Create initial studio and users
3. Configure email notifications (if not done)
4. Setup monitoring dashboards
5. Schedule first backup test
6. Document any custom configurations
7. Train users with GUIDA_UTENTE.md

**Emergency Contacts:**
- System Administrator: [Your Contact]
- Database Administrator: [Your Contact]
- Security Officer: [Your Contact]
