#!/bin/bash
# =============================================================================
# reset-db.sh — Pulizia DB mantenendo:
#   - users con ruolo superadmin / admin_studio / admin
#   - checkup_users con ruolo superadmin / admin_studio
#   - checkup_studios
#   - checkup_licenses + checkup_sublicenses
#   - Domande modello pre-assessment (question_macro_areas, sections, fields, models)
#   - Tabelle di sistema (nazioni, tasso_interesse, typeorm_migrations)
# =============================================================================

set -e

# Leggi credenziali da .env.production (o passa manualmente)
ENV_FILE="${1:-/opt/resolv/.env.production}"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ File env non trovato: $ENV_FILE"
  echo "   Uso: $0 /path/to/.env"
  exit 1
fi

DB_USER=$(grep "^DB_USERNAME=" "$ENV_FILE" | cut -d'=' -f2-)
DB_PASS=$(grep "^DB_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2-)
DB_NAME=$(grep "^DB_DATABASE=" "$ENV_FILE" | cut -d'=' -f2-)
CONTAINER=$(docker ps --format "{{.Names}}" | grep mysql | head -1)

if [ -z "$CONTAINER" ]; then
  echo "❌ Container MySQL non trovato"
  exit 1
fi

echo "⚠️  ATTENZIONE: stai per resettare il database '$DB_NAME'"
echo "   Container: $CONTAINER"
echo "   Verranno ELIMINATI tutti i dati tranne:"
echo "   - Utenti superadmin/admin_studio/admin"
echo "   - Domande modello pre-assessment"
echo "   - Tabelle di sistema (nazioni, tasso_interesse, migrations)"
echo ""
read -p "   Digita 'CONFERMA' per procedere: " CONFIRM

if [ "$CONFIRM" != "CONFERMA" ]; then
  echo "❌ Operazione annullata"
  exit 0
fi

echo ""
echo "🧹 Pulizia in corso..."

docker exec "$CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" <<'SQL'

SET FOREIGN_KEY_CHECKS = 0;

-- ── App principale ──────────────────────────────────────────────
TRUNCATE TABLE alerts;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE avvocati;
TRUNCATE TABLE cartelle_closure;
TRUNCATE TABLE cartelle;
TRUNCATE TABLE clienti_debitori;
TRUNCATE TABLE clienti;
TRUNCATE TABLE debitori;
TRUNCATE TABLE documenti;
TRUNCATE TABLE movimenti_finanziari;
TRUNCATE TABLE notifications;
TRUNCATE TABLE pratiche_avvocati;
TRUNCATE TABLE pratiche_collaboratori;
TRUNCATE TABLE piani_ammortamento;
TRUNCATE TABLE rate_ammortamento;
TRUNCATE TABLE pratiche;
TRUNCATE TABLE tickets;
TRUNCATE TABLE user_studi;
TRUNCATE TABLE license_requests;

-- Mantieni solo admin / admin_studio / superadmin
DELETE FROM users WHERE ruolo NOT IN ('superadmin', 'admin_studio', 'admin');

-- ── Modulo Checkup ───────────────────────────────────────────────
TRUNCATE TABLE checkup_alerts;
TRUNCATE TABLE checkup_answers;
TRUNCATE TABLE checkup_chat_messages;
TRUNCATE TABLE checkup_preassessment_documents;
TRUNCATE TABLE checkup_preassessment_messages;
TRUNCATE TABLE checkup_ticket_messages;
TRUNCATE TABLE checkup_tickets;
TRUNCATE TABLE checkup_preassessments;
TRUNCATE TABLE checkup_documents;
TRUNCATE TABLE checkup_questionnaires;
TRUNCATE TABLE checkup_sections;
TRUNCATE TABLE checkup_questions;
TRUNCATE TABLE checkup_templates;
TRUNCATE TABLE checkup_clients;
TRUNCATE TABLE checkup_sublicenses;
TRUNCATE TABLE checkup_licenses;
TRUNCATE TABLE checkup_studios;

-- Mantieni solo admin / admin_studio / superadmin checkup
DELETE FROM checkup_users WHERE ruolo NOT IN ('superadmin', 'admin_studio');

-- ── App principale: pulisci anche studi ──────────────────────────
TRUNCATE TABLE studi;

-- ── Tabelle di sistema / riferimento: NON toccare ───────────────
-- typeorm_migrations            ← invariato
-- nazioni                       ← invariato
-- tasso_interesse               ← invariato
-- checkup_question_macro_areas  ← invariato
-- checkup_question_sections     ← invariato
-- checkup_question_fields       ← invariato
-- checkup_question_models       ← invariato

SET FOREIGN_KEY_CHECKS = 1;

SQL

echo ""
echo "🗂️  Pulizia file caricati..."

# Determina il path uploads in base all'ambiente
if docker volume ls --format "{{.Name}}" | grep -q "uploads_data"; then
  # Locale: cancella via container temporaneo
  UPLOADS_VOL=$(docker volume ls --format "{{.Name}}" | grep "uploads" | head -1)
  if [ -n "$UPLOADS_VOL" ]; then
    docker run --rm -v "$UPLOADS_VOL":/uploads alpine sh -c "rm -rf /uploads/* && echo 'Volume uploads svuotato'"
  fi
elif [ -d "/mnt/resolv-data/uploads" ]; then
  # Server: cancella dal bind mount
  rm -rf /mnt/resolv-data/uploads/*
  echo "Directory /mnt/resolv-data/uploads svuotata"
fi

echo ""
echo "✅ Database e file resettati con successo!"
echo ""
echo "Utenti rimasti (main app):"
docker exec "$CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -e "SELECT id, email, ruolo FROM users;" 2>/dev/null

echo ""
echo "Utenti rimasti (checkup):"
docker exec "$CONTAINER" mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  -e "SELECT id, email, ruolo FROM checkup_users;" 2>/dev/null
