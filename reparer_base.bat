@echo off
echo ===================================================
echo   GestiCom - Reparation de la Base de Donnees
echo ===================================================
echo.

REM Recharger le PATH pour s'assurer que node et npm sont presents
set "PATH=%SystemRoot%\system32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0\;C:\Program Files\nodejs\"

echo [1/3] Verification de l'environnement...
set "PATH=C:\GestiCom\bin\node;%PATH%"
cd /d "C:\GestiCom\app"

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: L'environnement GestiCom n'est pas accessible.
    echo Assurez-vous d'avoir installe le logiciel dans C:\GestiCom.
    pause
    exit /b 1
)

echo [2/3] Synchronisation du schema de la base de donnees...
echo (Cela peut prendre quelques instants)
call npx prisma db push --accept-data-loss

if %errorlevel% neq 0 (
    echo.
    echo ERREUR lors de la synchronisation de la base de donnees.
    echo Verifiez que le dossier du projet n'est pas en lecture seule.
    pause
    exit /b 1
)

echo.
echo [3/3] Creation de l'utilisateur Administrateur par defaut...
call npm run db:seed

if %errorlevel% neq 0 (
    echo.
    echo ERREUR lors du peuplement de la base (seed).
    echo L'utilisateur existe peut-etre deja.
)

echo.
echo ===================================================
echo   Reparation terminee !
echo   Login : admin
echo   Mot de passe : Admin@123
echo ===================================================
echo.
pause
