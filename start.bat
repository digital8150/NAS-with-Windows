@echo off
chcp 65001 > nul
title Universal React NAS Engine

echo ====================================================
echo  🚀 Universal React NAS Engine (Windows Host)
echo ====================================================
echo.

node -v > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

if not exist "client\dist" (
    echo [*] Building frontend production bundle...
    call npm.cmd run build
)

echo [*] Starting NAS Server...
start "" http://localhost:3001
node server\src\index.js

pause
