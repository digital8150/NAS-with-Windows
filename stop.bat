@echo off
chcp 65001 > nul
title Stop Universal React NAS Engine

echo ====================================================
echo  🛑 Stopping Universal React NAS Engine Services
echo ====================================================
echo.

echo [*] Stopping Nginx...
cd /d C:\nginx
nginx.exe -s stop -p C:\nginx 2>nul
taskkill /F /IM nginx.exe >nul 2>&1
cd /d %~dp0

echo [*] Stopping Node.js NAS Backend...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [*] Stopping System Tray Application...
taskkill /F /IM ReelDriveTray.exe >nul 2>&1

echo.
echo [✓] All services have been stopped successfully.
pause
