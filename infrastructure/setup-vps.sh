#!/bin/bash
set -euo pipefail

# =============================================================================
# SuperLista — VPS Bootstrap Script
# =============================================================================
# Run this ONCE on a fresh Ubuntu 22.04/24.04 VM (Oracle Cloud, DigitalOcean,
# Hetzner, etc.) to install Docker + deploy SuperLista.
#
# Usage:
#   scp infrastructure/setup-vps.sh user@your-vm:~
#   ssh user@your-vm
#   chmod +x setup-vps.sh && ./setup-vps.sh
# =============================================================================

echo "=== SuperLista VPS Setup ==="

# --- System packages ---
sudo apt-get update -qq
sudo apt-get install -y -qq \
    ca-certificates curl gnupg lsb-release \
    ufw fail2ban

# --- Docker ---
if ! command -v docker &>/dev/null; then
    echo "Installing Docker..."
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
        sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
       https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo usermod -aG docker "$USER"
    echo "Docker installed. You may need to re-login for group changes."
fi

# --- Firewall: only SSH + HTTP/S ---
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
echo "Firewall rules applied."

# --- Fail2Ban (SSH protection) ---
sudo systemctl enable fail2ban --now

# --- Clone repo & deploy ---
if [ ! -d /opt/superlista ]; then
    sudo mkdir -p /opt/superlista
    sudo chown "$USER":"$USER" /opt/superlista
    git clone https://github.com/jbianco/super_lista.git /opt/superlista
fi

cd /opt/superlista

# Create production env file if missing
if [ ! -f .env.prod ]; then
    cp .env.prod.example .env.prod
    echo ""
    echo "============================================"
    echo "  IMPORTANT: Configure .env.prod first!"
    echo "  Edit /opt/superlista/.env.prod"
    echo "  Then run: docker compose -f docker-compose.prod.yml up -d"
    echo "============================================"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit /opt/superlista/.env.prod with your domain and secret"
echo "  2. Deploy: docker compose -f docker-compose.prod.yml up -d"
echo "  3. Check logs: docker compose -f docker-compose.prod.yml logs -f"
