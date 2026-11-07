#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Format Kilat (⚡) - Docker Hub Multi-Arch Build & Push Automation
# Target Registry: docker.io/ageng133
# ==============================================================================

DOCKER_USER="${DOCKER_USER:-ageng133}"
TAG="${1:-latest}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

# Color codes
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "⚡ FORMAT KILAT: DOCKER HUB BUILD & PUSH ENGINE"
echo "Target User: ${DOCKER_USER} · Tag: ${TAG} · Target Arch: linux/amd64"
echo "======================================================================"
echo -e "${NC}"

# Check Docker
if ! docker info >/dev/null 2>&1; then
  echo -e "${YELLOW}Error: Docker daemon is not running. Please start Docker Desktop first.${NC}"
  exit 1
fi

# 1. Login verification
echo -e "${BOLD}[1/4] Verifying Docker Hub Authentication...${NC}"
if ! docker login >/dev/null 2>&1; then
  echo -e "${YELLOW}Please authenticate with Docker Hub:${NC}"
  docker login -u "${DOCKER_USER}"
fi
echo -e "${GREEN}✓ Docker Hub authentication verified.${NC}"

# 2. Build & Push Database (PostgreSQL with pre-baked migrations & seeds)
echo -e "\n${BOLD}[2/5] Building & Pushing Database (PostgreSQL)...${NC}"
DB_IMG="${DOCKER_USER}/format-kilat-db:${TAG}"
docker build \
  --platform linux/amd64 \
  -t "${DB_IMG}" \
  -f backend/db/Dockerfile \
  backend/db
docker push "${DB_IMG}"
echo -e "${GREEN}✓ Pushed ${DB_IMG}${NC}"

# 3. Build & Push AI Worker (Python PyMuPDF Engine)
echo -e "\n${BOLD}[3/5] Building & Pushing AI Worker (PyMuPDF Engine)...${NC}"
WORKER_IMG="${DOCKER_USER}/format-kilat-ai-worker:${TAG}"
docker build \
  --platform linux/amd64 \
  -t "${WORKER_IMG}" \
  -f backend/ai-worker/Dockerfile \
  backend/ai-worker
docker push "${WORKER_IMG}"
echo -e "${GREEN}✓ Pushed ${WORKER_IMG}${NC}"

# 4. Build & Push Gateway (Go API Gateway)
echo -e "\n${BOLD}[4/5] Building & Pushing Go API Gateway...${NC}"
GATEWAY_IMG="${DOCKER_USER}/format-kilat-gateway:${TAG}"
docker build \
  --platform linux/amd64 \
  -t "${GATEWAY_IMG}" \
  -f backend/gateway/Dockerfile \
  backend/gateway
docker push "${GATEWAY_IMG}"
echo -e "${GREEN}✓ Pushed ${GATEWAY_IMG}${NC}"

# 5. Build & Push Frontend (Next.js 15)
echo -e "\n${BOLD}[5/5] Building & Pushing Frontend (Next.js 15 UI)...${NC}"
FRONTEND_IMG="${DOCKER_USER}/format-kilat-frontend:${TAG}"
PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8080/api/v1}"
GOOGLE_CLIENT_ID="${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-${GOOGLE_CLIENT_ID:-848169731628-e0nokifp89osi2kdo1q5hc202aeomn12.apps.googleusercontent.com}}"

docker build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL="${PUBLIC_API_URL}" \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" \
  -t "${FRONTEND_IMG}" \
  -f frontend/Dockerfile \
  frontend
docker push "${FRONTEND_IMG}"
echo -e "${GREEN}✓ Pushed ${FRONTEND_IMG}${NC}"

echo -e "\n${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 ALL IMAGES SUCCESSFULLY BUILT AND PUSHED TO DOCKER HUB!${NC}"
echo -e "   • ${DB_IMG}"
echo -e "   • ${WORKER_IMG}"
echo -e "   • ${GATEWAY_IMG}"
echo -e "   • ${FRONTEND_IMG}"
echo -e "${GREEN}${BOLD}======================================================================${NC}"

