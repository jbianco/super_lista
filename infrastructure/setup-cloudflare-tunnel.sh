#!/bin/bash
set -euo pipefail

# =============================================================================
# SuperLista — Cloudflare Tunnel Setup
# =============================================================================
# Cloudflare Tunnel creates an encrypted tunnel from Cloudflare's edge to your
# server, so you NEVER need to open ports or expose a public IP.
#
# Prerequisites:
#   1. A domain with DNS managed by Cloudflare (free plan works)
#   2. Cloudflare account: https://dash.cloudflare.com/sign-up
#   3. Docker already installed on the server
#
# Usage:
#   chmod +x setup-cloudflare-tunnel.sh
#   ./setup-cloudflare-tunnel.sh
# =============================================================================

echo "=== Cloudflare Tunnel Setup ==="

# --- Install cloudflared ---
if ! command -v cloudflared &>/dev/null; then
    echo "Installing cloudflared..."
    curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
        | sudo tee /usr/local/bin/cloudflared > /dev/null
    sudo chmod +x /usr/local/bin/cloudflared
fi

# --- Authenticate ---
echo ""
echo "Open the URL below in your browser, log in to Cloudflare,"
echo "and select the domain you want to use for SuperLista."
echo ""
cloudflared tunnel login

# --- Create tunnel ---
TUNNEL_NAME="superlista"
echo ""
echo "Creating tunnel '$TUNNEL_NAME'..."
cloudflared tunnel create "$TUNNEL_NAME" || true

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"

# --- Create DNS config ---
DOMAIN=""
while [ -z "$DOMAIN" ]; do
    read -r -p "Enter your domain (e.g., superlista.example.com): " DOMAIN
done

echo ""
echo "Creating DNS config..."
cat > ~/.cloudflared/"$TUNNEL_ID".yml <<EOF
tunnel: $TUNNEL_ID
credentials-file: /home/$USER/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: $DOMAIN
    service: http://localhost:80
  - service: http_status:404
EOF

# --- Route DNS ---
echo "Routing $DOMAIN to tunnel..."
cloudflared tunnel route dns "$TUNNEL_ID" "$DOMAIN"

# --- Install as system service ---
echo ""
echo "Installing tunnel as system service..."
sudo cloudflared service install

echo ""
echo "=== Cloudflare Tunnel setup complete ==="
echo ""
echo "Your SuperLista will be available at: https://$DOMAIN"
echo ""
echo "IMPORTANT: Make sure docker-compose.prod.yml is running:"
echo "  docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "The tunnel runs as a systemd service and starts automatically on boot."
echo "To check status: sudo systemctl status cloudflared"
