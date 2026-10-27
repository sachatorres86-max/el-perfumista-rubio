@echo off
setlocal EnableExtensions
chcp 65001 >nul
title El Perfumista Rubio - Servidor local
cd /d "%~dp0"

set "PG_SERVICE=postgresql-x64-16"
set "APP_URL=http://127.0.0.1:8000"
set "PYTHON=%~dp0backend\.venv\Scripts\python.exe"

if not exist "%PYTHON%" (
  echo.
  echo [ERROR] No se encontro el entorno virtual de Python en:
  echo         %PYTHON%
  echo.
  echo Revisa el README.md para instalar las dependencias.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',8000); $c.Close(); exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  echo La aplicacion ya esta en ejecucion. Abriendo el navegador...
  start "" "%APP_URL%"
  exit /b 0
)

echo Comprobando PostgreSQL en el puerto 5433...
powershell -NoProfile -Command "try { $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',5433); $c.Close(); exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo PostgreSQL no responde. Intentando iniciar el servicio %PG_SERVICE%...
  net start %PG_SERVICE% >nul 2>&1
  if errorlevel 1 (
    echo.
    echo [AVISO] No se pudo iniciar PostgreSQL automaticamente.
    echo         Abre una consola como administrador y ejecuta:
    echo             net start %PG_SERVICE%
    echo         O abre "Servicios" de Windows y arranca PostgreSQL 16.
    echo.
    pause
    exit /b 1
  )
  timeout /t 3 /nobreak >nul
)

echo Iniciando el servidor y abriendo el navegador...
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "for ($i=0; $i -lt 40; $i++) { try { Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%/api/health' -TimeoutSec 2 | Out-Null; Start-Process '%APP_URL%'; break } catch { Start-Sleep -Milliseconds 750 } }"

cd /d "%~dp0backend"
"%PYTHON%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000

echo.
echo El servidor se detuvo. Puedes cerrar esta ventana.
pause
