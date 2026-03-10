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

REM ── Vérification si lancé depuis un dossier temporaire ─────
echo %~dp0 | findstr /i "Temp Rar$ Zip" >nul
IF NOT ERRORLEVEL 1 (
    color 0C
    echo.
    echo ❌ ERREUR CRITIQUE : L'INSTALLATEUR EST DANS UN DOSSIER TEMPORAIRE.
    echo.
    echo VOUS DEVEZ EXTRAIRE (DÉCOMPRESSER) LE DOSSIER COMPLET DEPUIS 
    echo LE FICHIER ZIP/RAR VERS VOTRE BUREAU OU VOTRE DISQUE C:
    echo AVANT DE LANCER L'INSTALLATION.
    echo.
    echo Ne lancez pas le fichier directement depuis WinRAR ou ZIP.
    pause
    exit /b 1
)

REM ── Configuration de l'environnement portable ────────────────
set "NODE_DIR=%~dp0bin\node"
set "PATH=%NODE_DIR%;%PATH%"

echo [1/5] Vérification de l'environnement portable...
IF NOT EXIST "%NODE_DIR%\node.exe" (
    color 0C
    echo.
    echo ❌ ERREUR : Node.js portable n'est pas trouvé dans %NODE_DIR%
    echo.
    echo Assurez-vous d'avoir extrait TOUT le contenu du fichier compressé.
    echo Le dossier "bin" doit être à côté de "INSTALLER.bat".
    pause
    exit /b 1
)
echo    ✓ Node.js portable détecté.

REM ── Création du dossier d'installation ─────────────────────
echo [2/5] Préparation du dossier d'installation...
IF NOT EXIST "C:\GestiCom" mkdir "C:\GestiCom"
IF NOT EXIST "C:\gesticom" mkdir "C:\gesticom"

REM Copier les fichiers du logiciel
echo Copie des fichiers en cours...
xcopy /E /I /Y /Q "%~dp0app" "C:\GestiCom\app" >nul
echo    ✓ Fichiers de l'application copiés.

REM Copier Node.js portable
IF NOT EXIST "C:\GestiCom\bin\node" mkdir "C:\GestiCom\bin\node"
xcopy /E /I /Y /Q "%NODE_DIR%" "C:\GestiCom\bin\node" >nul
echo    ✓ Environnement Node.js copié dans C:\GestiCom\bin\

REM ── Vérification des modules ───────────────────────────────
echo [3/5] Finalisation de l'environnement applicatif...
IF NOT EXIST "C:\GestiCom\app\node_modules" (
    echo.
    echo ⚠ ATTENTION : Les modules de l'application sont manquants.
    echo L'installation risque de ne pas fonctionner.
)
echo    ✓ Environnement prêt.

REM ── Configuration de la base de données ────────────────────
echo [4/5] Initialisation de la base de données...
cd /d "C:\GestiCom\app"
call npx prisma generate
call npx prisma db push --accept-data-loss
call npm run db:seed
IF ERRORLEVEL 1 (
    echo.
    echo ⚠ ATTENTION : L'initialisation a rencontré un problème.
    echo Si le login ne fonctionne pas, lancez "reparer_base.bat".
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
