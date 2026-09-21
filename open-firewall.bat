@echo off
chcp 65001 > nul
title Windows Firewall Setup for Universal React NAS

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [*] 관리자 권한이 필요합니다. 관리자 권한으로 자동 승격합니다...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ====================================================
echo  🛡️ Universal React NAS 방화벽 인바운드 포트 개방 (80, 443)
echo ====================================================
echo.

echo [*] HTTP (포트 80) 방화벽 허용 등록 중...
netsh advfirewall firewall add rule name="Universal React NAS Nginx HTTP (Port 80)" dir=in action=allow protocol=TCP localport=80

echo [*] HTTPS (포트 443) 방화벽 허용 등록 중...
netsh advfirewall firewall add rule name="Universal React NAS Nginx HTTPS (Port 443)" dir=in action=allow protocol=TCP localport=443

echo.
echo [✓] 방화벽 포트(80, 443)가 성공적으로 개방되었습니다.
echo [*] 이제 외부 네트워크 및 동일 공유기 내 기기에서 접속할 수 있습니다.
echo.
pause
