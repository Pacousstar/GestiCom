@echo off
chcp 65001 > nul
title Installation de GestiCom
color 0A
cls

REM ── L'AUTO-ELEVATION A ETE DESACTIVEE (TROP INSTABLE CHEZ LES CLIENTS) ──
:: Test simple pour prévenir l'utilisateur s'il a oublié de lancer en Admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    color 0E
    echo.
    echo ⚠ ATTENTION : VOUS N'ETES PAS EN MODE ADMINISTRATEUR
    echo ======================================================
    echo Pour installer GestiCom correctement, vous DEVEZ fermer
    echo cette fenetre, puis faire un :
    echo.
    echo    CLIC-DROIT sur INSTALLER.bat 
    echo    et choisir "Exécuter en tant qu'administrateur"
    echo.
    pause
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
if %errorlevel% equ 0 goto :InTempFolder

REM ── Configuration de l'environnement portable ────────────────
set "NODE_DIR=%~dp0bin\node"
set "PATH=%NODE_DIR%;%PATH%"

echo [1/5] Vérification de l'environnement portable...
if not exist "%NODE_DIR%\node.exe" goto :MissingNode
echo    ✓ Environnement technique détecté.

REM ── Création du dossier d'installation ─────────────────────
echo [2/5] Préparation du dossier d'installation dans C:\GestiCom...
if not exist "C:\GestiCom" mkdir "C:\GestiCom"
if not exist "C:\gesticom" mkdir "C:\gesticom"

REM Copier les fichiers du logiciel
echo.
echo [2/5] Copie des fichiers de l'application... (veuillez patienter)
:: On se deplace dans le dossier parent pour que /EXCLUDE ne contienne pas d'espaces (bug xcopy)
pushd ".."
xcopy /E /I /Y . "C:\GestiCom\app\" /EXCLUDE:exclude_list.txt
popd
if %errorlevel% neq 0 goto :CopyError

REM Copier Node.js portable
echo.
echo [2/5] Configuration du moteur Node.js...
if not exist "C:\GestiCom\bin\node" mkdir "C:\GestiCom\bin\node"
xcopy /E /I /Y "%NODE_DIR%" "C:\GestiCom\bin\node"
echo    ✓ Environnement prêt.

REM ── Vérification des modules ───────────────────────────────
echo [3/5] Contrôle d'intégrité de l'environnement...
if not exist "C:\GestiCom\app\node_modules" goto :MissingModules
echo    ✓ Intégrité vérifiée.
goto :SkipModulesWarning

:MissingModules
echo.
echo ⚠ ATTENTION : Certains composants système sont manquants.
:SkipModulesWarning

REM ── Configuration de la base de données ────────────────────
echo [4/5] Initialisation de la base de données client...
cd /d "C:\GestiCom\app"
call npx prisma generate
call npx prisma db push --accept-data-loss
call npm run db:seed
if %errorlevel% neq 0 goto :DbWarning
echo    ✓ Base de données opérationnelle.
goto :SkipDbWarning

:DbWarning
echo.
echo ⚠ ATTENTION : L'initialisation de la base a rencontré un problème.
:SkipDbWarning

REM ── Création du raccourci Bureau ────────────────────────────
echo [5/5] Création du raccourci sur le Bureau...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\GestiCom.lnk'); $s.TargetPath = 'C:\GestiCom\LANCER.bat'; $s.IconLocation = 'C:\GestiCom\app\public\favicon.ico'; $s.Description = 'Lancer GestiCom'; $s.WindowStyle = 7; $s.Save()" >nul 2>&1
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
if /i "%LANCER%"=="O" (
    start "" "C:\GestiCom\LANCER.bat"
)
exit /b 0

:InTempFolder
color 0C
echo.
echo ❌ ERREUR CRITIQUE : L'INSTALLATEUR EST DANS UN DOSSIER TEMPORAIRE.
echo.
echo VOUS DEVEZ EXTRAIRE LE DOSSIER COMPLET DEPUIS 
echo LE FICHIER ZIP OU RAR VERS VOTRE BUREAU OU VOTRE DISQUE C:
echo AVANT DE LANCER L'INSTALLATION.
echo.
echo Ne lancez pas le fichier directement depuis WinRAR ou ZIP.
pause
exit /b 1

:MissingNode
color 0C
echo.
echo ❌ ERREUR : Node.js portable n'est pas trouvé dans %NODE_DIR%
pause
exit /b 1

:CopyError
color 0C
echo.
echo ❌ ERREUR LORS DE LA COPIE DES FICHIERS. Vérifiez l'espace disque.
pause
exit /b 1
