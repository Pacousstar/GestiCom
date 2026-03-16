@echo off
TITLE GestiCom Pro - Installation Service Windows
COLOR 0A

:: Vérification des privilèges administrateur
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Privileges Administrateur identifies.
) else (
    echo [ERREUR] Ce script doit etre execute en tant qu'ADMINISTRATEUR.
    echo Cliquez droit sur le fichier et choisissez "Executer en tant qu'administrateur".
    pause
    exit
)

cd /d "%~dp0"

echo.
echo ============================================================
echo   INSTALLATION DE GESTICOM EN TANT QUE SERVICE WINDOWS
echo ============================================================
echo.
echo [1/2] Verification des dependances...
if not exist "node_modules\node-windows" (
    echo [INFO] Installation de node-windows...
    npm install node-windows
)

echo.
echo [2/2] Enregistrement du service système...
node scripts\install-service.js

echo.
echo ------------------------------------------------------------
echo Processus termine. 
echo Verifiez si le service "GestiCom-Server" apparait dans 
echo l'outil "Services" de Windows (services.msc).
echo ------------------------------------------------------------
echo.
pause
