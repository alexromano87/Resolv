#!/usr/bin/env sh
set -e

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
