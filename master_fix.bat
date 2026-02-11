@echo off
title CORRECCION DEFINITIVA DE UBICACION
color 4f
echo [ATENCION] DETECTADO HILO DE EJECUCION EN CARPETA INCORRECTA (ONEDRIVE)
echo [ACCION] CERRANDO PROCESOS FANTASMA...

:: 1. MATAR TODO LO QUE SE MUEVA
taskkill /F /IM electron.exe /T >nul 2>&1
taskkill /F /IM "TRAMITOLOGIA CDMX.exe" /T >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1

:: Esperar desbloqueo
timeout /t 2 /nobreak >nul

:: 2. ELIMINAR LA CARPETA ONEDRIVE (AHORA QUE ESTA DESBLOQUEADA)
set "BAD_DIR=c:\Users\kadatherion\OneDrive\Documentos\Datos adjuntos de correo electrónico\Desktop\EXPEDIENTES_GENERADOS\gestor-virtual"
set "EMPTY_DIR=%TEMP%\empty_%RANDOM%"
mkdir "%EMPTY_DIR%"

echo [LIMPIEZA] Eliminando carpeta corrupta de OneDrive...
if exist "%BAD_DIR%" (
    robocopy "%EMPTY_DIR%" "%BAD_DIR%" /MIR /NFL /NDL /NJH /NJS >nul 2>&1
    rmdir /s /q "%BAD_DIR%" >nul 2>&1
)
rmdir /s /q "%EMPTY_DIR%"

:: 3. LANZAR LA VERSION CORRECTA
echo [EXITO] Carpeta incorrecta eliminada.
echo [LANZAMIENTO] Iniciando la version REAL del Escritorio...

cd /d "C:\Users\kadatherion\Desktop\TRAMITOLOGIA_SISTEMA_V1"
start "" "launcher_directo.bat"

exit
