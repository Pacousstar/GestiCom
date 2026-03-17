@echo off
setlocal enabledelayedexpansion
TITLE GestiCom Pro - DEBUG INSTALLER
echo.
echo ============================================================
echo      GESTICOM PRO - DEBUG MODE (PAUSE APRES CHAQUE ETAPE)
echo ============================================================
echo.

cd /d "%~dp0"
echo [DEBUG] Repertoire : %CD%
pause

echo [1] Verification Admin...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Lancez en tant qu'ADMINISTRATEUR !
    pause
    exit /b
)
echo [OK] Admin recu.
pause

echo [2] Verification Node...
node -v
if %errorLevel% neq 0 (
    echo [ERREUR] Node.js absent !
    pause
    exit /b
)
pause

echo [3] Installation Prisma (Local)...
echo Tentative de telechargement des outils de base de donnees...
call npm install prisma@5.22.0 @prisma/client@5.22.0 --no-save
if %errorLevel% neq 0 (
    echo [AVERTISSEMENT] npm install a renvoye une erreur.
    echo Cela peut arriver si vous n'avez pas de connexion internet.
)
pause

echo [4] Push de la base de donnees...
call npx prisma db push --accept-data-loss
if %errorLevel% neq 0 (
    echo [ERREUR CRITIQUE] Prisma n'a pas pu initialiser la base.
    echo Verifiez votre pare-feu ou votre connexion.
)
pause

echo [5] Enregistrement Service...
if exist "scripts\install-service.js" (
    call node scripts\install-service.js
) else (
    echo [ERREUR] scripts\install-service.js non trouve !
)
pause

echo.
echo ============================================================
echo           FIN DU SCRIPT DE DEBUG
echo ============================================================
pause
