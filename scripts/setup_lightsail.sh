#!/usr/bin/env bash
# ==============================================================================
# Format Kilat (⚡) - Turnkey AWS Lightsail (Amazon Linux 2023) Auto-Installer
# Usage on Amazon Linux:
#   curl -sSL https://raw.githubusercontent.com/ageng133/jms/master/scripts/setup_lightsail.sh | bash
# ==============================================================================
set -euo pipefail

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}======================================================================${NC}"
echo -e "${CYAN}${BOLD}⚡ Format Kilat — Automated AWS Lightsail Production Bootstrap${NC}"
echo -e "${CYAN}${BOLD}======================================================================${NC}"

# 1. Install Docker & Git
echo -e "\n${BOLD}[1/4] Installing Docker, Docker Compose, and Git...${NC}"
if command -v dnf >/dev/null 2>&1; then
  sudo dnf update -y
  sudo dnf install -y docker git
elif command -v yum >/dev/null 2>&1; then
  sudo yum update -y
  sudo yum install -y docker git
fi

# Ensure docker compose plugin exists
if ! docker compose version >/dev/null 2>&1; then
  echo -e "${YELLOW}Installing Docker Compose Plugin...${NC}"
  DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker}
  sudo mkdir -p $DOCKER_CONFIG/cli-plugins
  sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
  sudo chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
fi

# 2. Start and enable Docker daemon
echo -e "\n${BOLD}[2/4] Starting Docker Daemon...${NC}"
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER" || true

# Stop host-level nginx if running to free ports 80 and 443 for Docker
if systemctl is-active --quiet nginx; then
  echo -e "${YELLOW}Stopping host-level nginx to free ports 80/443 for Format Kilat Docker stack...${NC}"
  sudo systemctl stop nginx
  sudo systemctl disable nginx || true
fi
if systemctl is-active --quiet httpd; then
  sudo systemctl stop httpd
  sudo systemctl disable httpd || true
fi

# 3. Clone or update Format Kilat repository
echo -e "\n${BOLD}[3/4] Fetching Format Kilat Production Stack...${NC}"
TARGET_DIR="${HOME}/jms"
if [ ! -d "${TARGET_DIR}" ]; then
  git clone https://github.com/ageng133/jms.git "${TARGET_DIR}"
  cd "${TARGET_DIR}"
else
  cd "${TARGET_DIR}"
  git pull origin master
fi

# 4. Pull pre-built images from Docker Hub (ageng133) and launch
echo -e "\n${BOLD}[4/4] Pulling Docker Hub Images and Launching Microservices...${NC}"
sudo docker compose -f docker-compose.prod.yml pull
sudo docker compose -f docker-compose.prod.yml up -d

DEFAULT_DOMAIN="formatkilat.caberawit.my.id"

echo -e "\n${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 FORMAT KILAT PRODUCTION STACK IS LIVE!${NC}"
echo -e "   • Web UI (HTTP): ${CYAN}http://${DEFAULT_DOMAIN}${NC} (Port 80)"
echo -e "   • API Endpoint: ${CYAN}http://${DEFAULT_DOMAIN}/api/v1${NC}"
echo -e "   • Demo Author Login: author@jms.org / password123"
echo -e ""
echo -e "🔒 ${BOLD}Activate SSL / HTTPS via Let's Encrypt Certbot:${NC}"
echo -e "   Run the following command now:"
echo -e "   ${CYAN}cd ~/jms && sudo ./scripts/init_ssl.sh ${DEFAULT_DOMAIN} admin@caberawit.my.id${NC}"
echo -e "${GREEN}${BOLD}======================================================================${NC}"

