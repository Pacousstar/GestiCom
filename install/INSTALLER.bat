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

REM ── Configuration de l'environnement portable ────────────────
set "NODE_DIR=%~dp0bin\node"
set "PATH=%NODE_DIR%;%PATH%"

echo [1/5] Vérification de Node.js (Version Portable)...
"%NODE_DIR%\node.exe" --version >nul 2>&1
IF ERRORLEVEL 1 (
    echo.
    echo ❌ ERREUR : Node.js portable n'est pas trouvé dans %NODE_DIR%
    echo Vérifiez que vous avez bien copié le dossier 'bin/node' dans 'install'.
    pause
    exit /b 1
)
echo    ✓ Node.js portable prêt.
REM ── Création du dossier d'installation ─────────────────────
echo [2/5] Préparation du dossier d'installation...
IF NOT EXIST "C:\GestiCom" mkdir "C:\GestiCom"
IF NOT EXIST "C:\gesticom" mkdir "C:\gesticom"

REM Copier les fichiers du logiciel
xcopy /E /I /Y /Q "%~dp0gesticom2" "C:\GestiCom\app" >nul
echo    ✓ Fichiers de l'application copiés.

REM Copier Node.js portable
IF NOT EXIST "C:\GestiCom\bin\node" mkdir "C:\GestiCom\bin\node"
xcopy /E /I /Y /Q "%~dp0bin\node" "C:\GestiCom\bin\node" >nul
echo    ✓ Environnement Node.js (portable) copié dans C:\GestiCom\bin\

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
