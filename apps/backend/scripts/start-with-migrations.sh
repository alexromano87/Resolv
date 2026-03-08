#!/usr/bin/env sh
set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p \
    /usr/src/app/logs \
    /usr/src/app/backups \
    /usr/src/app/uploads \
    /usr/src/app/uploads/checkup \
    /usr/src/app/uploads/checkup-preassessment \
    /usr/src/app/uploads/documenti \
    /usr/src/app/uploads/utilita
  chown -R appuser:appgroup /usr/src/app/logs /usr/src/app/backups /usr/src/app/uploads
  chmod -R u+rwX,g+rwX /usr/src/app/logs /usr/src/app/backups /usr/src/app/uploads
  exec su-exec appuser "$0" "$@"
fi

if [ "$SKIP_MIGRATIONS" = "true" ]; then
  echo "[startup] Skipping migrations (SKIP_MIGRATIONS=true)"
else
  echo "[startup] Running pending migrations..."
  npm run migration:run
  echo "[startup] Seeding admin user..."
  npm run seed:admin || true
fi

echo "[startup] Starting NestJS app"
exec npm run start:prod
