#!/usr/bin/env bash
# AWS topology correction 2026-11-27: production is AWS-only; this file's legacy on-prem references are not deployment authority. See AWS_INFRA_REFERENCE.md for its replacement and disposition. Loopback development and physical-device fixtures are separate.
# Run once on the Ubuntu guest (e.g. 192.168.0.198) as a user with sudo.
# Installs Docker, clones MYCODAO if missing, copies .env.example → .env.production if missing, builds and starts stack.
set -euo pipefail

REPO_URL="${MYCODAO_REPO_URL:-https://github.com/MycosoftLabs/MYCODAO.git}"
INSTALL_DIR="${MYCODAO_INSTALL_DIR:-/opt/mycodao}"

if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME:-jammy}") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "${SUDO_USER:-$USER}" || true
fi

sudo mkdir -p "$(dirname "$INSTALL_DIR")"
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  sudo git clone "$REPO_URL" "$INSTALL_DIR"
  sudo chown -R "${SUDO_USER:-$USER}:" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"
git fetch origin && git reset --hard origin/main

if [[ ! -f .env.production ]]; then
  cp .env.example .env.production
  echo "Created .env.production from .env.example — edit FINNHUB_API_KEY, CLOUDFLARE_TUNNEL_TOKEN (tunnel), MAS/MINDEX URLs, then re-run:"
  echo "  MYCODAO_COMPOSE_PROFILE=tunnel ./deploy/vm-bootstrap.sh   # or tls for Caddy on 443"
  exit 0
fi

PROFILE="${MYCODAO_COMPOSE_PROFILE:-tls}"
if [[ "${PROFILE}" == "tunnel" ]]; then
  docker compose up -d --build
  docker compose --profile tunnel up -d --build
  echo "OK: app + Cloudflare tunnel. Set CLOUDFLARE_TUNNEL_TOKEN in .env.production. Logs: docker compose logs -f cloudflared"
else
  docker compose --profile tls up -d --build
  echo "OK: app + Caddy TLS. Check: docker compose ps && docker compose logs -f"
fi
