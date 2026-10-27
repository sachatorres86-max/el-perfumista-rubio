@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Reconstruir interfaz - El Perfumista Rubio
cd /d "%~dp0..\frontend"

echo Instalando dependencias (si hace falta)...
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto :error

echo Compilando la interfaz...
call npm.cmd run build
if errorlevel 1 goto :error

echo.
echo Interfaz compilada correctamente en frontend\dist.
echo Reinicia el servidor (stop.bat y start.bat) para servir la nueva version.
echo.
pause
exit /b 0

:error
echo.
echo [ERROR] La compilacion fallo. Revisa los mensajes anteriores.
echo.
pause
exit /b 1
