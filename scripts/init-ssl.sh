#!/usr/bin/env bash
# =============================================================================
# SSL + deploy script for Resolv production
# Safe to re-run: checks everything before acting.
#
# Handles all scenarios:
#   - Fresh server (no containers, no certs)
#   - Existing Resolv in production (adds checkup subdomain + deploys checkup)
#   - Everything already configured (just restarts/updates services)
#
# Usage: ./scripts/init-ssl.sh
# =============================================================================
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
ENV_FILE="$ROOT_DIR/.env.production"
CERT_DIR="$ROOT_DIR/certbot/conf/live/resolv.legal"
DOMAINS="-d resolv.legal -d www.resolv.legal -d checkup.resolv.legal"
EMAIL="admin@resolv.legal"

cd "$ROOT_DIR"

# =========================================================================
# Preflight checks
# =========================================================================
echo "==> Preflight checks"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "    ✗ .env.production not found"
  exit 1
fi
echo "    ✓ .env.production"

if ! command -v docker &> /dev/null; then
  echo "    ✗ Docker not installed"
  exit 1
fi
echo "    ✓ Docker: $(docker --version | head -1)"

if ! docker compose version &> /dev/null; then
  echo "    ✗ Docker Compose not available"
  exit 1
fi
echo "    ✓ Docker Compose: $(docker compose version | head -1)"

mkdir -p certbot/conf certbot/www

# =========================================================================
# Check existing services
# =========================================================================
echo ""
echo "==> Checking existing services"

check_running() {
  docker inspect --format='{{.State.Status}}' "$1" 2>/dev/null || echo "not_found"
}

MYSQL_ST=$(check_running "resolv-mysql-prod")
REDIS_ST=$(check_running "resolv-redis-prod")
BACKEND_ST=$(check_running "resolv-backend-prod")
NGINX_ST=$(check_running "resolv-nginx-prod")
FRONTEND_ST=$(check_running "resolv-frontend-build")
CHECKUP_FE_ST=$(check_running "resolv-checkup-frontend-build")
CERTBOT_ST=$(check_running "resolv-certbot")

echo "    MySQL:            $MYSQL_ST"
echo "    Redis:            $REDIS_ST"
echo "    Backend:          $BACKEND_ST"
echo "    Nginx:            $NGINX_ST"
echo "    Frontend:         $FRONTEND_ST"
echo "    Checkup frontend: $CHECKUP_FE_ST"
echo "    Certbot:          $CERTBOT_ST"

# =========================================================================
# Check SSL certificates
# =========================================================================
echo ""
echo "==> Checking SSL certificates"

NEED_CERT="false"

if [[ -f "$CERT_DIR/fullchain.pem" && -f "$CERT_DIR/privkey.pem" ]]; then
  EXPIRY=$(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
  echo "    ✓ Certificate exists (expires: $EXPIRY)"

  CERT_DOMAINS=$(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -text 2>/dev/null \
    | grep -oP '(?<=DNS:)[^,\s]+' || true)
  echo "    Covers: $(echo $CERT_DOMAINS | tr '\n' ' ')"

  if echo "$CERT_DOMAINS" | grep -q "checkup.resolv.legal"; then
    echo "    ✓ checkup.resolv.legal is covered"
  else
    echo "    ✗ checkup.resolv.legal NOT covered — will expand"
    NEED_CERT="expand"
  fi
else
  echo "    ✗ No certificate found — will request new one"
  NEED_CERT="new"
fi

# =========================================================================
# Obtain/expand SSL certificate if needed
# =========================================================================
if [[ "$NEED_CERT" != "false" ]]; then
  echo ""
  echo "==> Obtaining SSL certificate (mode: $NEED_CERT)"

  # Stop existing nginx to free port 80
  if [[ "$NGINX_ST" == "running" ]]; then
    echo "    Stopping nginx temporarily..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" stop nginx
  fi

  # Clean up any leftover temp container
  docker stop resolv-nginx-acme-temp 2>/dev/null || true
  docker rm resolv-nginx-acme-temp 2>/dev/null || true

  # Temporary ACME-only nginx
  cat > /tmp/nginx-acme-temp.conf << 'NGINX_CONF'
server {
    listen 80;
    listen [::]:80;
    server_name resolv.legal www.resolv.legal checkup.resolv.legal;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 "Resolv - SSL setup in progress...";
        add_header Content-Type text/plain;
    }
}
NGINX_CONF

  docker run -d \
    --name resolv-nginx-acme-temp \
    -p 80:80 \
    -v /tmp/nginx-acme-temp.conf:/etc/nginx/conf.d/default.conf:ro \
    -v "$ROOT_DIR/certbot/www:/var/www/certbot" \
    nginx:alpine

  sleep 3

  CERTBOT_FLAGS=""
  if [[ "$NEED_CERT" == "expand" ]]; then
    CERTBOT_FLAGS="--expand"
  fi

  docker run --rm \
    -v "$ROOT_DIR/certbot/conf:/etc/letsencrypt" \
    -v "$ROOT_DIR/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot -w /var/www/certbot \
    $DOMAINS \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    $CERTBOT_FLAGS

  echo "    ✓ Certificate obtained"

  docker stop resolv-nginx-acme-temp 2>/dev/null || true
  docker rm resolv-nginx-acme-temp 2>/dev/null || true
  rm -f /tmp/nginx-acme-temp.conf
else
  echo "    → Skipping (certificates already valid)"
fi

# =========================================================================
# Infrastructure (mysql, redis) — start only if not running
# =========================================================================
echo ""
echo "==> Infrastructure"

if [[ "$MYSQL_ST" == "running" ]]; then
  echo "    ✓ MySQL already running"
else
  echo "    ↻ Starting MySQL..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d mysql
  echo "    Waiting for MySQL to be healthy..."
  sleep 15
fi

if [[ "$REDIS_ST" == "running" ]]; then
  echo "    ✓ Redis already running"
else
  echo "    ↻ Starting Redis..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d redis
  sleep 3
fi

# =========================================================================
# Backend — rebuild and restart to pick up new code + env vars
# =========================================================================
echo ""
echo "==> Backend"

if [[ "$BACKEND_ST" == "running" ]]; then
  echo "    Backend is running, rebuilding with new code..."
else
  echo "    Building backend..."
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build backend
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d backend
echo "    ✓ Backend started"

# =========================================================================
# Frontend builds
# =========================================================================
echo ""
echo "==> Frontend builds"

# Main frontend — skip if already built
if [[ -d "$ROOT_DIR/apps/frontend/dist" ]] && [[ $(ls "$ROOT_DIR/apps/frontend/dist/" 2>/dev/null | wc -l) -gt 0 ]]; then
  echo "    ✓ Frontend already built (dist/ exists)"
else
  echo "    ↻ Building frontend..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d frontend
fi

# Checkup frontend — always rebuild (it's new or may have changes)
echo "    ↻ Building checkup-frontend..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d checkup-frontend

# Wait for checkup-frontend build
echo "    Waiting for checkup-frontend build..."
WAIT=0
while [[ $WAIT -lt 120 ]]; do
  if [[ -d "$ROOT_DIR/apps/checkup-frontend/dist" ]]; then
    CK_FILES=$(ls "$ROOT_DIR/apps/checkup-frontend/dist/" 2>/dev/null | wc -l)
    if [[ $CK_FILES -gt 0 ]]; then
      echo "    ✓ Checkup frontend built"
      break
    fi
  fi
  sleep 5
  WAIT=$((WAIT + 5))
done

if [[ $WAIT -ge 120 ]]; then
  echo "    ⚠ Build may not be complete yet, continuing..."
fi

# =========================================================================
# Nginx — start/restart with full config
# =========================================================================
echo ""
echo "==> Nginx"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d nginx
echo "    ✓ Nginx started"

# =========================================================================
# Certbot auto-renewal
# =========================================================================
echo ""
echo "==> Certbot auto-renewal"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d certbot
echo "    ✓ Certbot running"

# =========================================================================
# Final status
# =========================================================================
echo ""
echo "============================================="
echo "  Deploy complete!"
echo "============================================="
echo ""
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
echo ""
echo "  https://resolv.legal"
echo "  https://checkup.resolv.legal"
echo ""
echo "  Logs:"
echo "    docker compose -f docker-compose.prod.yml --env-file .env.production logs -f"
echo "    docker compose -f docker-compose.prod.yml --env-file .env.production logs -f nginx"
echo "============================================="
