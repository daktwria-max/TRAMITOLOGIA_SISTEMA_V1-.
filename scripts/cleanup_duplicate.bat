@echo off
chcp 65001 >nul
echo [LIMPIEZA] Eliminando versión duplicada en Escritorio...
rmdir /s /q "C:\Users\kadatherion\Desktop\TRAMITOLOGIA_SISTEMA_V1"

echo [EXITO] Carpeta duplicada eliminada.
echo Por favor, usa SOLO la carpeta en OneDrive:
echo %~dp0
pause
