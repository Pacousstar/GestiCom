@echo off
setlocal enabledelayedexpansion
TITLE GestiCom Pro - Installateur Unique
COLOR 0B
cls

echo ============================================================
echo           GESTICOM PRO - INSTALLATEUR OFFICIEL
echo ============================================================
echo.

:: 1. Privilèges Administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Ce script doit etre execute en tant qu'ADMINISTRATEUR.
    echo Cliquez droit sur le fichier et choisissez "Executer en tant qu'administrateur".
    echo.
    pause
    exit /b
)

:: 2. Forcer le répertoire de travail (Correctif Admin)
cd /d "%~dp0"

:: 3. Vérification Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe sur ce PC.
    echo GestiCom Pro necessite Node.js pour fonctionner.
    echo.
    pause
    exit /b
)

echo [1/5] Preparation de l'environnement...
if not exist "C:\gesticom" mkdir "C:\gesticom"
if not exist "C:\GestiCom\app" mkdir "C:\GestiCom\app"
icacls "C:\gesticom" /grant Everyone:(OI)(CI)F /T >nul 2>&1
echo [OK] Dossiers prets.

echo.
echo [2/5] Installation des dependances (Prisma/Service)...
echo (Cette etape necessite une connexion internet au premier lancement)
echo.

:: Installation de node-windows si manquant
if not exist "node_modules\node-windows" (
    echo Installation du gestionnaire de service...
    call npm install node-windows --no-save
)

:: Installation de Prisma si manquant
if not exist "node_modules\prisma" (
    echo Installation du moteur de base de donnees...
    call npm install prisma @prisma/client --no-save
)
echo [OK] Dependances installees.

echo.
echo [3/5] Initialisation de la base de donnees...
:: On verifie si la base existe deja pour ne pas l'ecraser brutalement
if not exist "C:\gesticom\gesticom.db" (
    echo Premiere installation : Creation de la structure...
    call npx prisma db push --accept-data-loss
) else (
    echo Base existante detectee : Mise a jour de la structure...
    call npx prisma db push
)
echo [OK] Base de donnees prete.

echo.
echo [4/5] Enregistrement du Service Windows...
:: On arrete et réinstalle le service pour garantir la mise à jour
call node scripts\install-service.js
echo [OK] Service "GestiCom-Server" demarre.

echo.
echo [5/5] Finalisation de l'installation...

:: Création du raccourci Bureau
echo Configuration du raccourci...
set "ICON_PATH=%~dp0gesticom.ico"
if not exist "%ICON_PATH%" set "ICON_PATH=C:\GestiCom\app\gesticom.ico"
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $l = [Environment]::GetFolderPath('Desktop') + '\GestiCom Pro.lnk'; $s = $ws.CreateShortcut($l); $s.TargetPath = 'http://localhost:3000'; $s.IconLocation = '%ICON_PATH%'; $s.Save()"
echo [OK] Raccourci cree sur le Bureau.

echo.
echo ============================================================
echo           INSTALLATION REUSSIE AVEC SUCCES !
echo ============================================================
echo.
echo GestiCom Pro est desormais installe et tourne en arriere-plan.
echo.
echo [DEMARRAGE DE L'APPLICATION DANS 5 SECONDES...]
timeout /t 5 >nul
start "" "http://localhost:3000"

echo.
echo Vous pouvez fermer cette fenetre.
echo ============================================================
echo.
pause
exit /b
