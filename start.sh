#!/usr/bin/env bash
# Universal React NAS Engine - Linux Server Startup Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if command -v pm2 &> /dev/null; then
    echo "🚀 Starting Universal React NAS Engine with PM2..."
    pm2 start ecosystem.config.js
    pm2 save
else
    echo "🚀 Starting Universal React NAS Engine with node background..."
    nohup node server/src/index.js >> "$SCRIPT_DIR/server.log" 2>&1 &
fi

sleep 2
if curl -s http://127.0.0.1:3001/api/health | grep -q '"status":"ok"'; then
    echo "✅ NAS Server started successfully!"
    echo "   URL: https://drive.home.codingbot.kr"
else
    echo "⚠️ Waiting for server..."
fi
