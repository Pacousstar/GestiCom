@echo off
chcp 65001 > nul
title Installation de GestiCom (Dev)
color 0A
cls

REM --- VERIFICATION ADMINISTRATEUR ---
net session >nul 2>&1
if %errorLevel% neq 0 (
    color 0E
    echo.
    echo ! ATTENTION : DROITS ADMINISTRATEUR MANQUANTS
    echo ======================================================
    echo Pour installer GestiCom, vous DEVEZ :
    echo.
    echo    1. Fermer cette fenetre
    echo    2. Faire un CLIC-DROIT sur INSTALLER.bat 
    echo    3. Choisir "Executer en tant qu'administrateur"
    echo.
    pause
    exit /b
)

:AdminOK
cd /d "%~dp0."

echo ======================================================
echo           INSTALLATION DE GESTICOM
echo ======================================================
echo.
echo Ce programme va installer GestiCom sur votre ordinateur.
echo.
pause

REM --- CONFIG PORTABLE ---
set "NODE_DIR=%~dp0bin\node"
set "PATH=%NODE_DIR%;%PATH%"

echo [1/5] Verification environnement...
if not exist "%NODE_DIR%\node.exe" (
    echo ERREUR: Moteur Node non trouve dans %NODE_DIR%
    pause
    exit /b 1
)
echo OK.

echo [2/5] Preparation dossiers...
if not exist "C:\GestiCom" mkdir "C:\GestiCom"
if not exist "C:\gesticom" mkdir "C:\gesticom"

echo [2/5] Copie des fichiers (Veuillez patienter...)...
:: Utilisation de ROBOCOPY pour plus de fiabilite
robocopy ".." "C:\GestiCom\app" /E /Z /R:5 /W:5 /MT:32 /V /NFL /NDL /XD "node_modules\.cache" ".git" ".next\cache" /XF "exclude_list.txt"
if %errorlevel% geq 8 (
    echo ERREUR: Echec de la copie des fichiers (Code: %errorlevel%).
    pause
    exit /b 1
)

echo [2/5] Configuration moteur...
if not exist "C:\GestiCom\bin\node" mkdir "C:\GestiCom\bin\node"
robocopy "%NODE_DIR%" "C:\GestiCom\bin\node" /E /NJH /NJS
echo OK.

echo [3/5] Controle des composants...
if not exist "C:\GestiCom\app\node_modules" (
    echo Attention: Composants systeme manquants.
) else (
    echo OK.
)

echo [4/5] Base de donnees...
cd /d "C:\GestiCom\app"
:: Appel direct de Prisma via node pour eviter les soucis de resolution NPX
call node "node_modules\prisma\build\index.js" generate
call node "node_modules\prisma\build\index.js" db push --accept-data-loss
call npm run db:seed
echo OK.

echo [5/5] Creation du raccourci Bureau...
:: Raccourci simplifie
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $l = [Environment]::GetFolderPath('Desktop') + '\GestiCom.lnk'; $s = $ws.CreateShortcut($l); $s.TargetPath = 'C:\GestiCom\LANCER.bat'; $s.WorkingDirectory = 'C:\GestiCom'; $s.Save()"
copy /Y "%~dp0LANCER.bat" "C:\GestiCom\LANCER.bat" >nul
echo OK.

echo.
echo ======================================================
echo           INSTALLATION REUSSIE !
echo ======================================================
echo.
echo Utilisez le raccourci GestiCom sur votre Bureau.
echo.
pause
exit /b 0
