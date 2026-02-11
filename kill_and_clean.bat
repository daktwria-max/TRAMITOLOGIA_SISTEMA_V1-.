@echo off
title MATANDO PROCESOS FANTASMA...
echo [PRIORIDAD] Deteniendo ejecucion desde OneDrive...

:: 1. Force kill everything related to the app
taskkill /F /IM electron.exe /T 
taskkill /F /IM "TRAMITOLOGIA CDMX.exe" /T 
taskkill /F /IM node.exe /T 

echo Esperando liberacion de archivos...
timeout /t 3 /nobreak >nul

:: 2. Define ghost path (The one causing problems)
set "GHOST_DIR=c:\Users\kadatherion\OneDrive\Documentos\Datos adjuntos de correo electrónico\Desktop\EXPEDIENTES_GENERADOS\gestor-virtual"
set "EMPTY_DIR=%TEMP%\empty_ghost_%RANDOM%"
mkdir "%EMPTY_DIR%"

:: 3. Nuke the folder using Robocopy (Mirror an empty folder into the target)
echo [LIMPIEZA] Eliminando carpeta fantasma: %GHOST_DIR%
if exist "%GHOST_DIR%" (
    echo Borrando contenido...
    robocopy "%EMPTY_DIR%" "%GHOST_DIR%" /MIR /NFL /NDL /NJH /NJS >nul 2>&1
    echo Borrando directorio raiz...
    rmdir /s /q "%GHOST_DIR%" >nul 2>&1
)

:: Cleanup temp
rmdir /s /q "%EMPTY_DIR%"

echo [LISTO] Procesos terminados y carpeta eliminada.
exit
