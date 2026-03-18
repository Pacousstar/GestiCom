@echo off
setlocal
cd /d "%~dp0"
title GestiCom - Mise a jour de l'application
color 0B

echo ============================================================
echo           GESTICOM - MISE A JOUR DE PRODUCTION
echo ============================================================
echo.

:: Verifier si on est bien dans le dossier de prod
if not exist "server.js" (
    echo [ERREUR] Ce script doit etre lance depuis le dossier d'installation (C:\GestiCom\app).
    pause
    exit /b
)

echo [1/3] Mise a jour de la structure de la base de donnees...
:: Utilisation du binaire Prisma local pour etre 100% offline
set PRISMA_BIN=.\node_modules\.bin\prisma
if not exist "%PRISMA_BIN%" set PRISMA_BIN=npx prisma

call %PRISMA_BIN% db push --accept-data-loss

echo.
echo [2/3] Verification des acces admin...
node scripts/reparer-admin.js

echo.
echo [3/3] Nettoyage du cache...
if exist ".next\cache" rmdir /s /q ".next\cache"

echo.
echo ============================================================
echo ✅ MISE A JOUR TERMINÉE AVEC SUCCÈS !
echo ============================================================
echo.
pause
exit /b
