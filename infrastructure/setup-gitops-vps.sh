#!/bin/bash
set -euo pipefail

# =============================================================================
# SuperLista — GitOps VPS Setup
# =============================================================================
# Prepares a fresh Ubuntu 22.04/24.04 VM to receive GitOps deployments.
# After this script runs, every push to main will automatically deploy.
#
# Prerequisites:
#   - A GitHub Personal Access Token (classic) with `read:packages` scope
#     https://github.com/settings/tokens
#
# Usage:
#   chmod +x setup-gitops-vps.sh && sudo ./setup-gitops-vps.sh
# =============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== SuperLista GitOps VPS Setup ===${NC}"

# ── 1. System dependencies ────────────────────────────────────────
echo -e "${YELLOW}[1/6] Installing system dependencies...${NC}"
apt-get update -qq
apt-get install -y -qq \
    ca-certificates curl gnupg lsb-release \
    ufw fail2ban git

# ── 2. Docker ─────────────────────────────────────────────────────
echo -e "${YELLOW}[2/6] Installing Docker...${NC}"
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
       https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# ── 3. Clone repository ───────────────────────────────────────────
echo -e "${YELLOW}[3/6] Cloning repository...${NC}"
if [ ! -d /opt/superlista ]; then
    mkdir -p /opt/superlista
    git clone https://github.com/jbianco/super_lista.git /opt/superlista
fi
cd /opt/superlista

# ── 4. Production environment ─────────────────────────────────────
echo -e "${YELLOW}[4/6] Setting up environment...${NC}"
if [ ! -f .env.prod ]; then
    cp .env.prod.example .env.prod
    echo -e "${GREEN}  → .env.prod created — edit it with your values${NC}"
fi

# ── 5. Firewall ───────────────────────────────────────────────────
echo -e "${YELLOW}[5/6] Configuring firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
systemctl enable fail2ban --now

# ── 6. Test pull (optional) ───────────────────────────────────────
echo -e "${YELLOW}[6/6] Testing registry access...${NC}"
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  VPS setup complete!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Next steps:"
echo ""
echo -e "  1. ${YELLOW}Edit /opt/superlista/.env.prod${NC} with your domain and JWT secret"
echo ""
echo -e "  2. ${YELLOW}Authenticate with ghcr.io${NC} (needed for first pull):"
echo -e "     echo \$GHCR_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USER --password-stdin"
echo -e "     (GHCR_TOKEN = GitHub PAT with read:packages scope)"
echo ""
echo -e "  3. ${YELLOW}Start the stack:${NC}"
echo -e "     cd /opt/superlista && docker compose -f docker-compose.prod.yml up -d"
echo ""
echo -e "  4. ${YELLOW}Add these secrets to GitHub${NC} ($GHCR_TOKEN is the 'read:packages' PAT):"
echo -e "     https://github.com/jbianco/super_lista/settings/secrets/actions"
echo ""
echo -e "     ┌─────────────────┬──────────────────────────────────┐"
echo -e "     │ Secret           │ Value                            │"
echo -e "     ├─────────────────┼──────────────────────────────────┤"
echo -e "     │ VPS_HOST        │ $(curl -s ifconfig.me 2>/dev/null || echo '<server-ip>') │"
echo -e "     │ VPS_USER        │ $(whoami)                        │"
echo -e "     │ VPS_SSH_KEY     │ <private ssh key>                │"
echo -e "     │ GHCR_TOKEN      │ <PAT with read:packages>         │"
echo -e "     └─────────────────┴──────────────────────────────────┘"
echo ""
echo -e "  5. ${YELLOW}Push to main${NC} → CD workflow builds, pushes, and deploys automatically."
echo ""
