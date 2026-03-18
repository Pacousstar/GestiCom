@echo off
setlocal
cd /d "%~dp0"
title GestiCom - Reparation Admin
color 0E

echo ============================================================
echo [🛡️] REPARATION DU COMPTE ADMINISTRATEUR (SUPER_ADMIN)
echo ============================================================
echo.
echo Ce script va :
echo 1. Creer l'Entite "SIEGE SOCIAL" (si manquante)
echo 2. Creer le Magasin "MAGASIN PRINCIPAL" (si manquant)
echo 3. Creer/Reinitialiser le compte 'admin'
echo.

:: Verifier Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe.
    pause
    exit /b
)

:: Execution du script JS
node scripts/reparer-admin.js

if %errorLevel% neq 0 (
    echo.
    echo [ERREUR] La reparation a echoue. Verifiez les logs ci-dessus.
) else (
    echo.
    echo [SUCCES] Operation terminee avec succes.
    echo.
    echo IDENTIFIANTS PAR DEFAUT :
    echo Login    : admin
    echo Password : Admin@123
)

echo.
echo ============================================================
pause
exit /b
