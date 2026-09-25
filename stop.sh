#!/usr/bin/env bash
# Universal React NAS Engine - Linux Server Stop Script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if command -v pm2 &> /dev/null; then
    echo "🛑 Stopping Universal React NAS Engine with PM2..."
    pm2 stop nas-drive
else
    OCCUPIED_PID=$(lsof -ti:3001 2>/dev/null)
    if [ -n "$OCCUPIED_PID" ]; then
        kill -9 $OCCUPIED_PID 2>/dev/null
    fi
fi

echo "✅ NAS Server stopped."
