@echo off
title GESTOR VIRTUAL
echo ===========================================
echo   INICIANDO GESTOR VIRTUAL
echo ===========================================

:: 1. LIMPIEZA AUTOMATICA
:: Esto arregla el problema de "no abre despues de cerrar"
:: Mata cualquier proceso fantasma que se haya quedado pegado.
echo Limpiando memoria...
taskkill /F /IM electron.exe >nul 2>&1
taskkill /F /IM "TRAMITOLOGIA CDMX.exe" >nul 2>&1

:: Espuma de seguridad
timeout /t 1 /nobreak >nul

:: 2. ARRANQUE
echo.
echo Arrancando aplicacion...
if exist "node_modules\electron\dist\electron.exe" (
    :: Ejecuta usando el motor interno, oculta la consola negra despues si es posible
    start "" "node_modules\electron\dist\electron.exe" .
) else (
    echo [ERROR CRITICO] No se encuentran los archivos del sistema.
    pause
)

exit
