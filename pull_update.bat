@echo off
chcp 65001 >nul
set "SOURCE=C:\Users\kadatherion\Desktop\TRAMITOLOGIA_SISTEMA_V1"
set "DEST=%~dp0"

echo [PULL] Jalando actualizaciones de %SOURCE%...
copy /Y "%SOURCE%\electron.js" "%DEST%\"
copy /Y "%SOURCE%\preload.js" "%DEST%\"
copy /Y "%SOURCE%\database.js" "%DEST%\"
copy /Y "%SOURCE%\performance-optimizer.js" "%DEST%\"
copy /Y "%SOURCE%\launcher_directo.bat" "%DEST%\"

echo Copiando carpeta public...
xcopy /Y /S /I "%SOURCE%\public" "%DEST%\public"

echo [PULL] Actualizacion Finalizada.
