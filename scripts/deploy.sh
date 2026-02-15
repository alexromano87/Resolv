#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
ENV_FILE="$ROOT_DIR/.env.production"
EXPECTED_COMMIT=""
FOLLOW_LOGS="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --expect-commit)
      EXPECTED_COMMIT="$2"
      shift 2
      ;;
    --follow)
      FOLLOW_LOGS="true"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

cd "$ROOT_DIR"

# Check .env.production exists
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env.production not found at $ENV_FILE"
  exit 1
fi

echo "==> Pulling latest changes"
git fetch origin
git pull --ff-only origin main

LATEST_COMMIT=$(git rev-parse HEAD)
LATEST_SUMMARY=$(git log -1 --oneline)

echo "==> Latest commit: $LATEST_SUMMARY"

if [[ -n "$EXPECTED_COMMIT" ]]; then
  if [[ "$LATEST_COMMIT" != "$EXPECTED_COMMIT" ]]; then
    echo "Expected commit $EXPECTED_COMMIT but got $LATEST_COMMIT"
    exit 1
  fi
  echo "==> Expected commit is present"
fi

echo "==> Building backend image"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache backend

echo "==> Starting services"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "==> Ensuring frontend build"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d frontend

echo "==> Ensuring checkup-frontend build"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d checkup-frontend

echo "==> Reloading nginx (pick up new frontend builds)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec nginx nginx -s reload 2>/dev/null || true

echo "==> Container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

if [[ "$FOLLOW_LOGS" == "true" ]]; then
  echo "==> Following logs (Ctrl+C to stop)"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f --tail=200
fi
