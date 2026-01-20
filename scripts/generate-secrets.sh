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

# Genera SESSION_SECRET (64 caratteri base64)  
SESSION_SECRET=$(openssl rand -base64 48 | tr -d '\n')
echo "SESSION_SECRET=$SESSION_SECRET"
echo ""

# Genera DB_PASSWORD sicura (32 caratteri alfanumerici + simboli)
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | head -c 32)
echo "DB_PASSWORD=$DB_PASSWORD"
echo ""

echo "==================================="
echo "⚠️  IMPORTANTE:"
echo "1. Copia questi valori nel tuo file .env di PRODUZIONE"
echo "2. NON committare questi valori su Git"
echo "3. Conserva una copia sicura (password manager)"
echo "==================================="
