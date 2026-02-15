#!/usr/bin/env bash
# =============================================================================
# Setup/update script for Resolv production server (159.69.31.119)
# Safe to re-run: checks everything before acting.
#
# Run from your LOCAL machine.
# Usage: ./scripts/setup-server.sh
# =============================================================================
set -euo pipefail

SERVER_IP="159.69.31.119"
SERVER_USER="deploy"
REMOTE_DIR="/opt/resolv"
LOCAL_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

echo "============================================="
echo "  Resolv Production Server Setup"
echo "  Server: $SERVER_USER@$SERVER_IP"
echo "  Remote path: $REMOTE_DIR"
echo "============================================="
echo ""

# -------------------------------------------------------------------------
# Step 0: Verify local files exist
# -------------------------------------------------------------------------
echo "==> Step 0: Checking local files"
MISSING=false
for f in ".env.production" "apps/frontend/.env.production" "apps/checkup-frontend/.env.production"; do
  if [[ -f "$LOCAL_DIR/$f" ]]; then
    echo "    ✓ $f"
  else
    echo "    ✗ $f MISSING"
    MISSING=true
  fi
done
if [[ "$MISSING" == "true" ]]; then
  echo "    ERROR: Missing required files. Aborting."
  exit 1
fi

# -------------------------------------------------------------------------
# Step 1: Check DNS
# -------------------------------------------------------------------------
echo ""
echo "==> Step 1: DNS Check"

check_dns() {
  local domain=$1
  local resolved
  resolved=$(dig +short "$domain" A 2>/dev/null | head -1)
  if [[ "$resolved" == "$SERVER_IP" ]]; then
    echo "    ✓ $domain → $resolved"
    return 0
  else
    echo "    ✗ $domain → ${resolved:-NOT FOUND} (expected $SERVER_IP)"
    return 1
  fi
}

DNS_OK=true
check_dns "resolv.legal" || DNS_OK=false
check_dns "www.resolv.legal" || DNS_OK=false
check_dns "checkup.resolv.legal" || DNS_OK=false

if [[ "$DNS_OK" != "true" ]]; then
  echo ""
  echo "    WARNING: Some DNS records are not configured."
  echo "    Required A records:"
  echo "      resolv.legal         → $SERVER_IP"
  echo "      www.resolv.legal     → $SERVER_IP"
  echo "      checkup.resolv.legal → $SERVER_IP"
  echo ""
  read -p "    Continue anyway? (y/N) " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# -------------------------------------------------------------------------
# Step 2: Check server prerequisites (Docker, git, etc.)
# -------------------------------------------------------------------------
echo ""
echo "==> Step 2: Checking server prerequisites"
ssh "$SERVER_USER@$SERVER_IP" << 'REMOTE_SCRIPT'
# Docker
if command -v docker &> /dev/null; then
  echo "    ✓ Docker: $(docker --version | head -1)"
else
  echo "    ✗ Docker not found. Installing..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "    ✓ Docker installed: $(docker --version | head -1)"
fi

# Docker Compose (v2, plugin)
if docker compose version &> /dev/null; then
  echo "    ✓ Docker Compose: $(docker compose version | head -1)"
else
  echo "    ✗ Docker Compose plugin not found. Installing..."
  apt-get update -qq && apt-get install -y -qq docker-compose-plugin
  echo "    ✓ Docker Compose installed."
fi

# Git
if command -v git &> /dev/null; then
  echo "    ✓ Git: $(git --version)"
else
  echo "    ✗ Git not found. Installing..."
  apt-get update -qq && apt-get install -y -qq git
  echo "    ✓ Git installed."
fi

# openssl (for cert inspection)
if command -v openssl &> /dev/null; then
  echo "    ✓ OpenSSL: $(openssl version | head -1)"
else
  echo "    ✗ OpenSSL not found. Installing..."
  apt-get update -qq && apt-get install -y -qq openssl
fi
REMOTE_SCRIPT

# -------------------------------------------------------------------------
# Step 3: Check repository
# -------------------------------------------------------------------------
echo ""
echo "==> Step 3: Checking repository on server"

# Get remote URL from local repo to use for cloning
REPO_URL=$(git -C "$LOCAL_DIR" remote get-url origin 2>/dev/null || echo "")

ssh "$SERVER_USER@$SERVER_IP" << REMOTE_SCRIPT
if [[ -d "$REMOTE_DIR/.git" ]]; then
  echo "    ✓ Repository exists at $REMOTE_DIR"
  cd "$REMOTE_DIR"
  CURRENT_BRANCH=\$(git branch --show-current)
  CURRENT_COMMIT=\$(git log -1 --oneline)
  echo "    Branch: \$CURRENT_BRANCH"
  echo "    Commit: \$CURRENT_COMMIT"
  echo "    Pulling latest..."
  git fetch origin
  git pull --ff-only origin main
  echo "    ✓ Updated to: \$(git log -1 --oneline)"
else
  echo "    ✗ Repository not found, cloning..."
  mkdir -p "\$(dirname "$REMOTE_DIR")"
  git clone "$REPO_URL" "$REMOTE_DIR"
  echo "    ✓ Cloned to $REMOTE_DIR"
fi
REMOTE_SCRIPT

# -------------------------------------------------------------------------
# Step 4: Upload .env files
# -------------------------------------------------------------------------
echo ""
echo "==> Step 4: Uploading environment files"

# Check if .env.production already exists on server and compare
REMOTE_EXISTS=$(ssh "$SERVER_USER@$SERVER_IP" "[[ -f $REMOTE_DIR/.env.production ]] && echo yes || echo no")

if [[ "$REMOTE_EXISTS" == "yes" ]]; then
  echo "    .env.production already exists on server"
  # Compare checksums
  LOCAL_HASH=$(md5 -q "$LOCAL_DIR/.env.production" 2>/dev/null || md5sum "$LOCAL_DIR/.env.production" | awk '{print $1}')
  REMOTE_HASH=$(ssh "$SERVER_USER@$SERVER_IP" "md5sum $REMOTE_DIR/.env.production 2>/dev/null | awk '{print \$1}'")
  if [[ "$LOCAL_HASH" == "$REMOTE_HASH" ]]; then
    echo "    ✓ .env.production is up to date (same checksum)"
  else
    echo "    ↻ .env.production differs, updating..."
    scp "$LOCAL_DIR/.env.production" "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/.env.production"
    echo "    ✓ .env.production updated"
  fi
else
  scp "$LOCAL_DIR/.env.production" "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/.env.production"
  echo "    ✓ .env.production uploaded (new)"
fi

# Frontend env files (always upload, they're small and not sensitive)
scp "$LOCAL_DIR/apps/frontend/.env.production" "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/apps/frontend/.env.production"
echo "    ✓ apps/frontend/.env.production uploaded"
scp "$LOCAL_DIR/apps/checkup-frontend/.env.production" "$SERVER_USER@$SERVER_IP:$REMOTE_DIR/apps/checkup-frontend/.env.production"
echo "    ✓ apps/checkup-frontend/.env.production uploaded"

# -------------------------------------------------------------------------
# Step 5: Check existing Docker services
# -------------------------------------------------------------------------
echo ""
echo "==> Step 5: Checking existing Docker services"
ssh "$SERVER_USER@$SERVER_IP" << REMOTE_SCRIPT
cd "$REMOTE_DIR"

# Check running containers
RUNNING=\$(docker compose -f docker-compose.prod.yml --env-file .env.production ps --format '{{.Name}} {{.Status}}' 2>/dev/null || echo "")
if [[ -n "\$RUNNING" ]]; then
  echo "    Running containers:"
  echo "\$RUNNING" | while read line; do echo "      \$line"; done
else
  echo "    No containers running."
fi

# Check Docker volumes (data persistence)
echo ""
echo "    Docker volumes:"
for vol in resolv_mysql_data resolv_redis_data resolv_backend_logs resolv_backup_data; do
  # Try both with and without project prefix
  if docker volume inspect "\$vol" &>/dev/null || docker volume inspect "resolv-\$vol" &>/dev/null; then
    echo "      ✓ \$vol exists"
  else
    echo "      - \$vol (will be created)"
  fi
done
REMOTE_SCRIPT

# -------------------------------------------------------------------------
# Step 6: Check SSL certificates
# -------------------------------------------------------------------------
echo ""
echo "==> Step 6: Checking SSL certificates"
ssh "$SERVER_USER@$SERVER_IP" << REMOTE_SCRIPT
CERT_DIR="$REMOTE_DIR/certbot/conf/live/resolv.legal"

if [[ -f "\$CERT_DIR/fullchain.pem" ]]; then
  echo "    ✓ SSL certificate exists"

  # Check expiry
  EXPIRY=\$(openssl x509 -in "\$CERT_DIR/fullchain.pem" -noout -enddate 2>/dev/null | cut -d= -f2)
  echo "    Expires: \$EXPIRY"

  # Check covered domains
  CERT_DOMAINS=\$(openssl x509 -in "\$CERT_DIR/fullchain.pem" -noout -text 2>/dev/null \
    | grep -oP '(?<=DNS:)[^,\s]+' || true)
  echo "    Covers:"
  echo "\$CERT_DOMAINS" | while read d; do [[ -n "\$d" ]] && echo "      - \$d"; done

  if echo "\$CERT_DOMAINS" | grep -q "checkup.resolv.legal"; then
    echo "    ✓ checkup.resolv.legal is covered"
  else
    echo "    ✗ checkup.resolv.legal NOT covered — will expand cert"
  fi
else
  echo "    ✗ No SSL certificate found — will request new one"
fi
REMOTE_SCRIPT

# -------------------------------------------------------------------------
# Step 7: Run init-ssl.sh on server (handles all cases)
# -------------------------------------------------------------------------
echo ""
echo "==> Step 7: Running init-ssl.sh (handles certs + full stack)"
read -p "    Proceed with deploy? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "    Aborted."
  exit 0
fi

ssh "$SERVER_USER@$SERVER_IP" << REMOTE_SCRIPT
cd "$REMOTE_DIR"
chmod +x scripts/*.sh
./scripts/init-ssl.sh
REMOTE_SCRIPT

echo ""
echo "============================================="
echo "  Setup complete!"
echo "============================================="
echo ""
echo "  https://resolv.legal"
echo "  https://checkup.resolv.legal"
echo ""
echo "  Future deploys:"
echo "    ./scripts/deploy-remote.sh"
echo ""
echo "  SSH access:"
echo "    ssh $SERVER_USER@$SERVER_IP"
echo "    cd $REMOTE_DIR"
echo "============================================="
