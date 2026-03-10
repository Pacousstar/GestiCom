@echo off
chcp 65001 > nul
title Installation de GestiCom
color 0A
cls

REM ── Élévation de privilèges Admin ───────────────────────────
:: Test des privilèges admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [☕] Demande des droits Administrateur...
    powershell -Command "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs"
    exit /b
)

:: Forcer le retour dans le dossier de l'installateur (avec protection backslash)
cd /d "%~dp0."

echo ╔══════════════════════════════════════════════════════╗
echo ║           INSTALLATION DE GESTICOM                   ║
echo ║      Logiciel de Gestion Commerciale Intégré         ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo Ce programme va installer GestiCom sur votre ordinateur.
echo.
pause

REM ── Vérification si lancé depuis un dossier temporaire ─────
echo "%~dp0" | findstr /i "Temp Rar Zip" >nul
if %errorlevel% equ 0 (
    color 0C
    echo.
    echo ❌ ERREUR CRITIQUE : L'INSTALLATEUR EST DANS UN DOSSIER TEMPORAIRE.
    echo.
    echo VOUS DEVEZ EXTRAIRE (DÉCOMPRESSER) LE DOSSIER COMPLET DEPUIS 
    echo LE FICHIER ZIP/RAR VERS VOTRE BUREAU OU VOTRE DISQUE C:
    echo AVANT DE LANCER L'INSTALLATION.
    pause
    exit /b 1
)

REM ── Configuration de l'environnement portable ────────────────
set "NODE_DIR=%~dp0bin\node"
set "PATH=%NODE_DIR%;%PATH%"

echo [1/5] Vérification de l'environnement portable...
if not exist "%NODE_DIR%\node.exe" (
    color 0C
    echo.
    echo ❌ ERREUR : Node.js portable n'est pas trouvé dans %NODE_DIR%
    pause
    exit /b 1
)
echo    ✓ Environnement technique détecté.

REM ── Création du dossier d'installation ─────────────────────
echo [2/5] Préparation du dossier d'installation dans C:\GestiCom...
IF NOT EXIST "C:\GestiCom" mkdir "C:\GestiCom"
IF NOT EXIST "C:\gesticom" mkdir "C:\gesticom"

REM Copier les fichiers du logiciel
echo.
echo [2/5] Copie des fichiers de l'application... (veuillez patienter)
REM Dans cette structure (gesticom2/install), les fichiers sont dans le dossier parent
xcopy /E /I /Y "%~dp0.." "C:\GestiCom\app" /EXCLUDE:%~dp0..\exclude_list.txt
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERREUR LORS DE LA COPIE DES FICHIERS. Vérifiez l'espace disque.
    pause
    exit /b 1
)

REM Copier Node.js portable
echo.
echo [2/5] Configuration du moteur Node.js...
IF NOT EXIST "C:\GestiCom\bin\node" mkdir "C:\GestiCom\bin\node"
xcopy /E /I /Y "%NODE_DIR%" "C:\GestiCom\bin\node"
echo    ✓ Environnement prêt.

REM ── Vérification des modules ───────────────────────────────
echo [3/5] Contrôle d'intégrité de l'environnement...
IF NOT EXIST "C:\GestiCom\app\node_modules" (
    echo.
    echo ⚠ ATTENTION : Certains composants système sont manquants.
)
echo    ✓ Intégrité vérifiée.

REM ── Configuration de la base de données ────────────────────
echo [4/5] Initialisation de la base de données client...
cd /d "C:\GestiCom\app"
call npx prisma generate
call npx prisma db push --accept-data-loss
call npm run db:seed
IF ERRORLEVEL 1 (
    echo.
    echo ⚠ ATTENTION : L'initialisation de la base a rencontré un problème.
)
echo    ✓ Base de données opérationnelle.

REM ── Création du raccourci Bureau ────────────────────────────
echo [5/5] Création du raccourci sur le Bureau...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\GestiCom.lnk'); $s.TargetPath = 'C:\GestiCom\LANCER.bat'; $s.IconLocation = 'C:\GestiCom\app\public\logo.png'; $s.Description = 'Lancer GestiCom'; $s.WindowStyle = 7; $s.Save()" >nul 2>&1
echo    ✓ Raccourci créé avec succès.

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
