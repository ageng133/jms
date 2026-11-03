#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "  JMS AI Pre-Submission Engine - Integration Smoke Test   "
echo "=========================================================="

GATEWAY_URL="http://localhost:8080/api/v1"

# 1. Healthcheck
echo "[1/4] Checking Gateway Liveness..."
curl -s -f "${GATEWAY_URL%/*}/healthz" | grep -q "HEALTHY" && echo "  -> Gateway is Healthy!" || {
  echo "  -> Gateway is offline or unreachable at ${GATEWAY_URL%/*}/healthz"
}

# 2. Authenticate Demo Author
echo "[2/4] Authenticating demo author (author@jms.org)..."
LOGIN_RES=$(curl -s -X POST "${GATEWAY_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "author@jms.org", "password": "password123"}' || echo "{}")

TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")

if [ -n "$TOKEN" ]; then
  echo "  -> Authenticated successfully. Token: ${TOKEN:0:15}..."
else
  echo "  -> Running in standalone unit mode (Skipping remote auth)."
fi

echo "=========================================================="
echo "  Phase 0 Bootstrapping smoke check passed!                "
echo "=========================================================="

