#!/usr/bin/env bash
# =============================================================================
# Remote deploy: pushes to git, SSHs into server, runs deploy.sh
#
# Usage:
#   ./scripts/deploy-remote.sh              # Deploy latest main
#   ./scripts/deploy-remote.sh --follow     # Deploy and follow logs
# =============================================================================
set -euo pipefail

SERVER_IP="159.69.31.119"
SERVER_USER="deploy"
REMOTE_DIR="/opt/resolv"
FOLLOW_FLAG=""

if [[ "${1:-}" == "--follow" ]]; then
  FOLLOW_FLAG="--follow"
fi

echo "==> Deploying Resolv to production ($SERVER_IP)"
echo ""

ssh "$SERVER_USER@$SERVER_IP" "cd $REMOTE_DIR && ./scripts/deploy.sh $FOLLOW_FLAG"
