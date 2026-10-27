@echo off
chcp 65001 >nul
title Detener El Perfumista Rubio
echo Deteniendo el servidor de El Perfumista Rubio...
powershell -NoProfile -Command "$c = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue; if ($c) { $c | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force; Write-Host ('Servidor detenido. Proceso: ' + $_) } } else { Write-Host 'No hay ningun servidor escuchando en el puerto 8000.' }"
echo.
pause
