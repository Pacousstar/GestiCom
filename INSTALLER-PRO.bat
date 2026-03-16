@echo off
TITLE GestiCom Pro - Installateur Unique
COLOR 0B
cls

echo ============================================================
echo           GESTICOM PRO - INSTALLATEUR INTEGRE
echo ============================================================
echo.

:: Vérification des privilèges administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Ce script doit etre execute en tant qu'ADMINISTRATEUR.
    echo Cliquez droit sur le fichier et choisissez "Executer en tant qu'administrateur".
    pause
    exit /b
)

set "TARGET_DIR=C:\GestiCom\app"
set "DB_DIR=C:\gesticom"

echo [1/5] Preparation de l'environnement...
if not exist "%DB_DIR%" mkdir "%DB_DIR%"
if not exist "C:\GestiCom" mkdir "C:\GestiCom"
icacls "%DB_DIR%" /grant Everyone:(OI)(CI)F /T >nul 2>&1
echo [OK] Dossiers prets.

echo.
echo [2/5] Installation des dependances systeme...
if not exist "node_modules\node-windows" (
    echo Installation de node-windows (requis pour le service)...
    npm install node-windows
)
echo [OK] Dependances installees.

echo.
echo [3/5] Initialisation de la base de donnees...
:: On verifie si la base existe deja pour ne pas l'ecraser brutalement
if not exist "%DB_DIR%\gesticom.db" (
    echo Premiere installation : Creation de la structure...
    npx prisma db push --accept-data-loss
) else (
    echo Base existante detectee : Mise a jour de la structure si necessaire...
    npx prisma db push
)
echo [OK] Base de donnees prête.

echo.
echo [4/5] Enregistrement du Service Windows (Silencieux)...
:: On arrete l'ancien service s'il existe pour mettre à jour
node scripts\install-service.js
echo [OK] Service "GestiCom-Server" configure.

echo.
echo [5/5] Creation du raccourci Bureau...
set "ICON_PATH=%~dp0gesticom.ico"
if not exist "%ICON_PATH%" set "ICON_PATH=C:\GestiCom\app\gesticom.ico"
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $l = [Environment]::GetFolderPath('Desktop') + '\GestiCom Pro.lnk'; $s = $ws.CreateShortcut($l); $s.TargetPath = 'http://localhost:3000'; $s.IconLocation = '%ICON_PATH%'; $s.Save()"
echo [OK] Raccourci cree sur le Bureau.

echo.
echo ============================================================
echo           INSTALLATION REUSSIE !
echo ============================================================
echo GestiCom Pro est maintenant installe en tant que service.
echo Le logiciel demarrera automatiquement avec Windows.
echo.
echo Vous pouvez fermer cette fenetre et lancer GestiCom depuis 
echo le raccourci sur votre bureau.
echo ============================================================
echo.
pause
exit /b
