#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
ENV_FILE="$ROOT_DIR/.env.production"
EXPECTED_COMMIT=""
FOLLOW_LOGS="false"
SEED_DEMO="true"

# Legge un valore da .env.production senza fare il source dell'intero file.
read_env_value() {
  local line
  line=$(grep -E "^$1=" "$ENV_FILE" | tail -n 1 || true)
  local value="${line#*=}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "$value"
}

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
    --skip-demo-seed)
      SEED_DEMO="false"
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
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate

echo "==> Ensuring frontend build"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate frontend

echo "==> Ensuring checkup-frontend build"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate checkup-frontend

echo "==> Reloading nginx (pick up new frontend builds)"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec nginx nginx -s reload 2>/dev/null || true

if [[ "$SEED_DEMO" == "true" ]]; then
  DEMO_STUDIO_PASSWORD=$(read_env_value DEMO_STUDIO_PASSWORD)
  DEMO_CLIENT_PASSWORD=$(read_env_value DEMO_CLIENT_PASSWORD)

  if [[ -z "$DEMO_STUDIO_PASSWORD" || -z "$DEMO_CLIENT_PASSWORD" ]]; then
    echo "==> Demo seed saltato: imposta DEMO_STUDIO_PASSWORD e DEMO_CLIENT_PASSWORD in .env.production"
  else
    echo "==> Waiting for backend to be healthy (migrations included)"
    BACKEND_ID=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q backend)
    BACKEND_STATUS="unknown"
    for _ in $(seq 1 60); do
      BACKEND_STATUS=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$BACKEND_ID" 2>/dev/null || echo "unknown")
      [[ "$BACKEND_STATUS" == "healthy" ]] && break
      sleep 5
    done

    if [[ "$BACKEND_STATUS" != "healthy" ]]; then
      echo "WARNING: backend non healthy (stato: $BACKEND_STATUS), demo seed non eseguito"
    else
      echo "==> Demo environment (seed only if missing)"
      if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T \
        -e DEMO_STUDIO_PASSWORD="$DEMO_STUDIO_PASSWORD" \
        -e DEMO_CLIENT_PASSWORD="$DEMO_CLIENT_PASSWORD" \
        backend node dist/src/seed-demo.js --if-missing; then
        echo "==> Demo environment OK"
      else
        echo "WARNING: demo seed fallito (il deploy resta valido); rilancialo a mano per vedere l'errore"
      fi
    fi
  fi
fi

echo "==> Container status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

if [[ "$FOLLOW_LOGS" == "true" ]]; then
  echo "==> Following logs (Ctrl+C to stop)"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f --tail=200
fi
