#!/usr/bin/env bash
# ==============================================================================
# Format Kilat (⚡) - Automated Certbot & Nginx SSL Provisioner for AWS Lightsail
# Usage:
#   sudo ./scripts/init_ssl.sh your-domain.com your-email@example.com [--staging]
# ==============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

DOMAIN="${1:-formatkilat.caberawit.my.id}"
EMAIL="${2:-admin@caberawit.my.id}"
STAGING=0

if [ "${3:-}" == "--staging" ] || [ "${1:-}" == "--staging" ] || [ "${2:-}" == "--staging" ]; then
  STAGING=1
  echo -e "${YELLOW}⚠️ Running in Let's Encrypt Staging mode (test certificates)...${NC}"
fi

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_DIR}"

# Free host port 80/443 if host-level webserver is running
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet nginx; then
    echo -e "${YELLOW}Stopping host-level nginx to free ports 80/443 for Docker...${NC}"
    systemctl stop nginx
    systemctl disable nginx || true
  fi
  if systemctl is-active --quiet httpd; then
    systemctl stop httpd
    systemctl disable httpd || true
  fi
fi

echo -e "${CYAN}${BOLD}======================================================================${NC}"
echo -e "${CYAN}${BOLD}⚡ Format Kilat SSL Engine: Provisioning HTTPS for ${DOMAIN}${NC}"
echo -e "${CYAN}${BOLD}======================================================================${NC}"

# 1. Ensure docker compose file is available
COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "${COMPOSE_FILE}" ]; then
  if [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
  else
    echo -e "${RED}Error: Neither docker-compose.prod.yml nor docker-compose.yml found.${NC}"
    exit 1
  fi
fi

# 2. Ensure Nginx and Certbot volumes and conf directories exist
mkdir -p nginx/conf.d

# 3. Ensure base HTTP Nginx is running
echo -e "\n${BOLD}[1/4] Ensuring Nginx is running on port 80 for ACME validation...${NC}"
docker compose -f "${COMPOSE_FILE}" up -d nginx certbot

# Give Nginx 3 seconds to bind port 80
sleep 3

# 4. Request Certificate via Certbot Webroot
echo -e "\n${BOLD}[2/4] Requesting Let's Encrypt Certificate for ${DOMAIN}...${NC}"
STAGING_FLAG=""
if [ "${STAGING}" -eq 1 ]; then
  STAGING_FLAG="--staging"
fi

# Execute certbot container
docker compose -f "${COMPOSE_FILE}" run --rm certbot certonly \
  --webroot \
  -w /var/www/certbot \
  --email "${EMAIL}" \
  -d "${DOMAIN}" \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  ${STAGING_FLAG}

# 5. Verify certificate generation
echo -e "\n${BOLD}[3/4] Activating Nginx SSL Virtual Host...${NC}"
if [ ! -f "nginx/conf.d/ssl.conf.template" ]; then
  echo -e "${RED}Error: nginx/conf.d/ssl.conf.template not found!${NC}"
  exit 1
fi

# Substitute __DOMAIN__ in ssl.conf
sed "s/__DOMAIN__/${DOMAIN}/g" nginx/conf.d/ssl.conf.template > nginx/conf.d/ssl.conf
echo -e "${GREEN}✓ Created nginx/conf.d/ssl.conf for ${DOMAIN}${NC}"

# 6. Test and Reload Nginx
echo -e "\n${BOLD}[4/4] Validating Nginx syntax and reloading...${NC}"
docker compose -f "${COMPOSE_FILE}" exec nginx nginx -t
docker compose -f "${COMPOSE_FILE}" exec nginx nginx -s reload

echo -e "\n${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 SUCCESS! HTTPS IS NOW FULLY ACTIVE & SECURED BY LET'S ENCRYPT!${NC}"
echo -e "   • Public URL: ${CYAN}https://${DOMAIN}${NC}"
echo -e "   • API Endpoint: ${CYAN}https://${DOMAIN}/api/v1${NC}"
echo -e "   • Auto-renewal: Managed automatically by format_kilat_certbot (every 12h)"
echo -e "${GREEN}${BOLD}======================================================================${NC}"

