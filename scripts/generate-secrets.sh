#!/bin/bash
# Script per generare secrets sicuri per produzione

echo "==================================="
echo "Generazione Secrets per Produzione"
echo "==================================="
echo ""

# Genera JWT_SECRET (64 caratteri base64)
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
echo "JWT_SECRET=$JWT_SECRET"
echo ""

# Genera JWT_REFRESH_SECRET (64 caratteri base64)
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""

# Genera CHECKUP_JWT_SECRET (64 caratteri base64)
CHECKUP_JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
echo "CHECKUP_JWT_SECRET=$CHECKUP_JWT_SECRET"
echo ""

# Genera DB_PASSWORD sicura (32 caratteri alfanumerici)
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | head -c 32)
echo "DB_PASSWORD=$DB_PASSWORD"
echo ""

# Genera MYSQL_ROOT_PASSWORD sicura (32 caratteri alfanumerici)
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | head -c 32)
echo "MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD"
echo ""

# Genera REDIS_PASSWORD sicura (32 caratteri base64)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo ""

echo "==================================="
echo "⚠️  IMPORTANTE:"
echo "1. Copia questi valori nel tuo file .env.production"
echo "2. NON committare questi valori su Git"
echo "3. Conserva una copia sicura (password manager)"
echo "==================================="
