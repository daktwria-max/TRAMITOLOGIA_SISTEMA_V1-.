@echo off
title LIMPIEZA TOTAL DE VERSIONES ANTIGUAS
echo [CRITICO] Eliminando version de OneDrive (Zombie)...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 2 /nobreak >nul

rmdir /s /q "c:\Users\kadatherion\OneDrive\Documentos\Datos adjuntos de correo electrónico\Desktop\EXPEDIENTES_GENERADOS\gestor-virtual"

echo [EXITO] Carpeta OneDrive eliminada.
echo [INFO] Solo queda TRAMITOLOGIA_SISTEMA_V1 en Escritorio.
pause
