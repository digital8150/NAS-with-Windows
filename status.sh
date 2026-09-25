#!/usr/bin/env bash
# Universal React NAS Engine - Linux Server Status Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if command -v pm2 &> /dev/null; then
    pm2 status nas-drive
fi

echo ""
echo "📡 Healthcheck: "
curl -s http://127.0.0.1:3001/api/health || echo "Failed to connect to healthcheck endpoint"
echo ""
echo "🌐 Domain: https://drive.home.codingbot.kr"
