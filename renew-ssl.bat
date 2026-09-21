@echo off
chcp 65001 > nul
title Let's Encrypt SSL Certificate Renewal

echo ====================================================
echo  🔒 Renewing Let's Encrypt SSL Certificate (pc.codingbot.kr)
echo ====================================================
echo.

if not exist "C:\win-acme\wacs.exe" (
    echo [ERROR] win-acme client not found at C:\win-acme\wacs.exe
    pause
    exit /b 1
)

echo [*] Checking and renewing certificates via win-acme...
"C:\win-acme\wacs.exe" --renew --baseuri "https://acme-v02.api.letsencrypt.org/"

echo.
echo [*] Reloading Nginx with updated certificates...
cd /d C:\nginx
nginx.exe -s reload -p C:\nginx
cd /d %~dp0

echo.
echo [✓] SSL renewal check and Nginx reload complete.
pause
