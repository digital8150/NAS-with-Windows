@echo off
chcp 65001 > nul
title Universal React NAS Engine (Production Server)

echo ====================================================
echo  🚀 Universal React NAS Engine (Production Server)
echo  🌐 Domain: https://pc.codingbot.kr
echo  📍 Local:  http://localhost
echo ====================================================
echo.

node -v > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

:: 프론트엔드 최신 빌드 검사
if not exist "client\dist" (
    echo [*] Building frontend production bundle...
    call npm.cmd --prefix client run build
)

:: Nginx 실행 여부 확인 및 구동
tasklist /FI "IMAGENAME eq nginx.exe" 2>NUL | find /I /N "nginx.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo [*] Nginx Reverse Proxy is already running.
    echo [*] Reloading Nginx configuration...
    cd /d C:\nginx
    nginx.exe -s reload -p C:\nginx
    cd /d %~dp0
) else (
    echo [*] Starting Nginx Reverse Proxy (Port 80 / 443)...
    cd /d C:\nginx
    start "" nginx.exe -p C:\nginx
    cd /d %~dp0
)

echo.
echo [*] Launching NAS Backend Engine (Port 3001)...
echo [*] Access NAS at: https://pc.codingbot.kr or http://localhost
echo.

start "" https://pc.codingbot.kr
node server\src\index.js

pause
