#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.local-prod.yml"
ENV_FILE="$ROOT_DIR/.env.local"
FOLLOW_LOGS="false"
DO_MIGRATE="false"
FRESH_START="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --follow)
      FOLLOW_LOGS="true"
      shift
      ;;
    --migrate)
      DO_MIGRATE="true"
      shift
      ;;
    --fresh)
      FRESH_START="true"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Run: cp .env.local.example .env.local"
  exit 1
fi

cd "$ROOT_DIR"

if [[ "$FRESH_START" == "true" ]]; then
  echo "==> Stopping and removing local stack (with volumes)"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v
fi

echo "==> Building and starting local stack"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

echo "==> Ensuring frontend build container runs"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d frontend

if [[ "$DO_MIGRATE" == "true" ]]; then
  echo "==> Running migrations"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec backend npm run migration:run
fi

echo "==> Container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

if [[ "$FOLLOW_LOGS" == "true" ]]; then
  echo "==> Following logs (Ctrl+C to stop)"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f --tail=200
fi
