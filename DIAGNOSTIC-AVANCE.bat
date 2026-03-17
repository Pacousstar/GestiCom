@echo off
setlocal enabledelayedexpansion
TITLE GestiCom Pro - DIAGNOSTIC AVANCE
echo.
echo ============================================================
echo      DIAGNOSTIC AVANCE - GESTICOM PRO
echo ============================================================
echo.

set "LOGFILE=%~dp0debug_log.txt"
echo [LOG START] %DATE% %TIME% > "%LOGFILE%"

cd /d "%~dp0"
echo [1] Repertoire courant : %CD%
echo [1] Repertoire courant : %CD% >> "%LOGFILE%"

echo.
echo [2] Test Node...
node -v
node -v >> "%LOGFILE%" 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Node non trouve. >> "%LOGFILE%"
    pause
    exit /b
)

echo.
echo [3] Test NPM...
call npm -v
call npm -v >> "%LOGFILE%" 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] NPM non trouve. >> "%LOGFILE%"
    pause
    exit /b
)

echo.
echo [4] Tentative Installation Prisma (Verbeux)...
echo CETTE ETAPE PEUT PRENDRE 2 A 5 MINUTES. 
echo Si la fenetre se ferme, regardez le fichier 'debug_log.txt'.
echo.
echo Lancement de l'installation...
call npm install prisma@5.22.0 @prisma/client@5.22.0 --no-save --loglevel info >> "%LOGFILE%" 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] npm install a echoue. Voir debug_log.txt. >> "%LOGFILE%"
    echo [ERREUR] npm install a echoue.
) else (
    echo [OK] Prisma installe. >> "%LOGFILE%"
    echo [OK] Prisma installe.
)

echo.
echo [5] Tentative Prisma DB Push...
call npx prisma db push --accept-data-loss >> "%LOGFILE%" 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Prisma DB Push a echoue. >> "%LOGFILE%"
    echo [ERREUR] Prisma DB Push a echoue.
) else (
    echo [OK] Base de donnees prete. >> "%LOGFILE%"
    echo [OK] Base de donnees prete.
)

echo.
echo ============================================================
echo      DIAGNOSTIC TERMINE. Verifiez 'debug_log.txt'.
echo ============================================================
echo [LOG END] >> "%LOGFILE%"
pause
