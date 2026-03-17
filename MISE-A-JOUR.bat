@echo off
setlocal
title GestiCom - Mise a jour de l'application
color 0B

echo ============================================================
echo           GESTICOM - MISE A JOUR DE PRODUCTION
echo ============================================================
echo.

echo [1/3] Mise a jour de la structure de la base de donnees...
npx prisma db push --accept-data-loss

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
