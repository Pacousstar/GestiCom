@echo off
setlocal enabledelayedexpansion
TITLE GestiCom Pro - Installateur Unique
COLOR 0B
cls

echo ============================================================
echo           GESTICOM PRO - INSTALLATEUR OFFICIEL
echo ============================================================
echo.

:: 1. Privileges Administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Ce script doit etre execute en tant qu'ADMINISTRATEUR.
    echo Cliquez droit sur le fichier et choisissez "Executer en tant qu'administrateur".
    echo.
    pause
    exit /b
)

:: 2. Forcer le repertoire de travail
cd /d "%~dp0"

:: 3. Verification Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe sur ce PC.
    echo GestiCom Pro necessite Node.js pour fonctionner.
    echo.
    pause
    exit /b
)

echo [1/5] Preparation des repertoires de production...
if not exist "C:\gesticom" mkdir "C:\gesticom"
if not exist "C:\GestiCom\app" mkdir "C:\GestiCom\app"
icacls "C:\gesticom" /grant Everyone:(OI)(CI)F /T >nul 2>&1

echo Copie des fichiers vers C:\GestiCom\app...
:: On exclut le dossier d'installation lui-meme et les fichiers de chantier via une liste temporaire
echo .git\ > "%temp%\exclude.txt"
echo \install\ >> "%temp%\exclude.txt"
echo \INSTALLATION_GESTICOM\ >> "%temp%\exclude.txt"
echo Quincaillerie ETB.xlsx >> "%temp%\exclude.txt"
echo GestiCom CA+.pdf >> "%temp%\exclude.txt"
echo exclude_list.txt >> "%temp%\exclude.txt"
echo INSTALLER-PRO.bat >> "%temp%\exclude.txt"
echo NOTICE-INSTALLATION.txt >> "%temp%\exclude.txt"
echo .env.example >> "%temp%\exclude.txt"

xcopy /E /I /Y /Q "*" "C:\GestiCom\app\" /EXCLUDE:"%temp%\exclude.txt"
del "%temp%\exclude.txt"
echo [OK] Dossiers prets.

echo.
echo [2/5] Verification des dependances...
cd /d "C:\GestiCom\app"

:: Le pack Standalone contient deja node_modules. On verifie.
if exist "node_modules\" (
    echo [OK] Dependances detectees (Mode Offline activé).
) else (
    echo [ERREUR] Dependances manquantes dans le pack.
    echo L'installation ne peut pas continuer sans internet si node_modules est absent.
    pause
    exit /b
)

echo.
echo [3/5] Initialisation de la base de donnees...
:: Utilisation du binaire Prisma local pour etre 100% offline
set PRISMA_BIN=.\node_modules\.bin\prisma
if not exist "%PRISMA_BIN%" set PRISMA_BIN=npx prisma

echo Initialisation du schema...
call %PRISMA_BIN% db push --accept-data-loss
echo [OK] Base de donnees prete.

echo.
echo [4/5] Enregistrement du Service Windows...
:: On lance le script d'installation du service
call node scripts\install-service.js
echo [OK] Service "GestiCom-Server" demarre.

echo.
echo [5/5] Finalisation de l'installation...

:: Création du raccourci Bureau
echo Configuration du raccourci...
set "ICON_PATH=C:\GestiCom\app\gesticom.ico"
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $l = [Environment]::GetFolderPath('Desktop') + '\GestiCom Pro.lnk'; $s = $ws.CreateShortcut($l); $s.TargetPath = 'C:\GestiCom\app\LANCER-SILENCIEUX.vbs'; $s.IconLocation = '%ICON_PATH%'; $s.Save()"
echo [OK] Raccourci cree sur le Bureau.

echo.
echo ============================================================
echo           INSTALLATION REUSSIE AVEC SUCCES !
echo ============================================================
echo.
echo GestiCom Pro est desormais installe dans C:\GestiCom\app
echo Le service tourne en arriere-plan et demarrera avec Windows.
echo.
:: Détection du port dans le .env pour l'URL finale
set "APP_PORT=3000"
if exist ".env" (
    for /f "tokens=2 delims==" %%a in ('findstr "PORT=" .env') do (
        set "VAL=%%a"
        set "VAL=!VAL:"=!"
        set "APP_PORT=!VAL: =!"
    )
)

echo [LANCEMENT DE L'APPLICATION SUR LE PORT !APP_PORT! DANS 3 SECONDES...]
timeout /t 3 >nul
start "" "http://localhost:!APP_PORT!"

echo.
echo Vous pouvez fermer cette fenetre.
echo ============================================================
echo.
pause
exit /b
