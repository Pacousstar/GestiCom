@echo off
chcp 65001 > nul
title GestiCom — Démarrage

REM Vérifier que GestiCom est installé
IF NOT EXIST "C:\GestiCom\app" (
    echo ERREUR : GestiCom n'est pas installé.
    echo Veuillez d'abord exécuter INSTALLER.bat
    pause
    exit /b 1
)

REM Configuration de l'environnement GestiCom
set "NODE_LOCAL=C:\GestiCom\bin\node"
IF EXIST "%NODE_LOCAL%" (
    set "PATH=%NODE_LOCAL%;%PATH%"
) ELSE (
    echo ERREUR : Environnement Node.js non trouvé. 
    echo Veuillez réinstaller GestiCom.
    pause
    exit /b 1
)

REM Vérifier si le port 3000 est déjà utilisé (GestiCom déjà lancé)
netstat -ano | findstr ":3000 " >nul 2>&1
IF NOT ERRORLEVEL 1 (
    echo GestiCom est déjà en cours d'exécution.
    echo Ouverture du navigateur...
    start "" "http://localhost:3000"
    exit
)

echo Démarrage de GestiCom...
echo ^(Ne fermez pas cette fenêtre — elle fait tourner le logiciel^)
echo.

REM Ouvrir le navigateur après 4 secondes
start /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

REM Démarrer le serveur Next.js
cd /d "C:\GestiCom\app"
npm start
