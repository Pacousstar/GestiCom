@echo off
chcp 65001 > nul
title Installation de GestiCom
color 0A
cls

echo ╔══════════════════════════════════════════════════════╗
echo ║           INSTALLATION DE GESTICOM                   ║
echo ║      Logiciel de Gestion Commerciale Intégré         ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Ce programme va installer GestiCom sur votre ordinateur.
echo Durée estimée : 3 à 5 minutes selon votre connexion.
echo.
pause

REM ── Vérifie si Node.js est installé ─────────────────────────
echo [1/5] Vérification de Node.js...
node --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo.
    echo ⚠ Node.js n'est pas installé sur ce PC.
    echo.
    echo Téléchargement automatique de Node.js v22 LTS...
    echo ^(Si le téléchargement échoue, téléchargez manuellement :^)
    echo ^(https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi^)
    echo.
    
    REM Télécharger Node.js si curl disponible
    where curl >nul 2>&1
    IF NOT ERRORLEVEL 1 (
        curl -L -o "%TEMP%\node-installer.msi" "https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi"
        echo Installation de Node.js en cours...
        msiexec /i "%TEMP%\node-installer.msi" /qn
        del "%TEMP%\node-installer.msi"
        echo.
        echo Node.js installé. Veuillez relancer ce script.
        pause
        exit
    ) ELSE (
        echo ERREUR : Impossible de télécharger Node.js automatiquement.
        echo Veuillez installer Node.js manuellement depuis https://nodejs.org
        echo puis relancer ce script.
        pause
        exit
    )
)
echo    ✓ Node.js détecté : 

REM ── Création du dossier d'installation ─────────────────────
echo [2/5] Préparation du dossier d'installation...
IF NOT EXIST "C:\GestiCom" mkdir "C:\GestiCom"
IF NOT EXIST "C:\gesticom" mkdir "C:\gesticom"

REM Copier les fichiers du logiciel
xcopy /E /I /Y /Q "%~dp0gesticom2" "C:\GestiCom\app" >nul
echo    ✓ Fichiers copiés dans C:\GestiCom\

REM ── Installation des dépendances NPM ───────────────────────
echo [3/5] Installation des modules (peut prendre 2-3 min)...
cd /d "C:\GestiCom\app"
npm install --production --silent
IF ERRORLEVEL 1 (
    echo ERREUR : Échec de l'installation des modules npm.
    echo Vérifiez votre connexion Internet et relancez.
    pause
    exit /b 1
)
echo    ✓ Modules installés

REM ── Configuration de la base de données ────────────────────
echo [4/5] Initialisation de la base de données...
npx prisma generate --silent >nul 2>&1
npx prisma db push --accept-data-loss >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERREUR : Échec de l'initialisation de la base de données.
    pause
    exit /b 1
)
echo    ✓ Base de données initialisée dans C:\gesticom\

REM ── Création du raccourci Bureau ────────────────────────────
echo [5/5] Création du raccourci sur le Bureau...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\GestiCom.lnk'); $s.TargetPath = 'C:\GestiCom\LANCER.bat'; $s.IconLocation = 'C:\GestiCom\app\public\logo.png'; $s.Description = 'Lancer GestiCom'; $s.WindowStyle = 7; $s.Save()" >nul 2>&1
echo    ✓ Raccourci "GestiCom" créé sur le Bureau

REM Copier le lanceur
copy /Y "%~dp0LANCER.bat" "C:\GestiCom\LANCER.bat" >nul

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   ✅ INSTALLATION RÉUSSIE !                          ║
echo ║                                                      ║
echo ║   Double-cliquez sur l'icône "GestiCom"              ║
echo ║   sur votre Bureau pour démarrer le logiciel.        ║
echo ╚══════════════════════════════════════════════════════╝
echo.
set /p LANCER="Souhaitez-vous lancer GestiCom maintenant ? (O/N) : "
IF /I "%LANCER%"=="O" (
    start "" "C:\GestiCom\LANCER.bat"
)
pause
