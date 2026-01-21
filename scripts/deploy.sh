#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
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
docker compose -f "$COMPOSE_FILE" build --no-cache backend

echo "==> Starting services"
docker compose -f "$COMPOSE_FILE" up -d

echo "==> Ensuring frontend build"
docker compose -f "$COMPOSE_FILE" up -d frontend

echo "==> Container status"
docker compose -f "$COMPOSE_FILE" ps

if [[ "$FOLLOW_LOGS" == "true" ]]; then
  echo "==> Following logs (Ctrl+C to stop)"
  docker compose -f "$COMPOSE_FILE" logs -f --tail=200
fi
