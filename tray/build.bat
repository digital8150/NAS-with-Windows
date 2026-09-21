@echo off
chcp 65001 > nul
title Build ReelDrive Tray

echo [*] Building ReelDriveTray.exe using built-in .NET Framework csc.exe...

set CSC=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe
if not exist "%CSC%" (
    set CSC=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe
)

if not exist "%CSC%" (
    echo [ERROR] .NET Framework csc.exe compiler not found.
    pause
    exit /b 1
)

"%CSC%" /target:winexe /optimize+ /out:"%~dp0ReelDriveTray.exe" "%~dp0ReelDriveTray.cs"

if %ERRORLEVEL% equ 0 (
    echo [✓] Build successful: %~dp0ReelDriveTray.exe
) else (
    echo [!] Build failed.
)

pause
