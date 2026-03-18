@echo off
title GestiCom - Nettoyage Professionnel
echo ======================================================
echo          ATTENTION : NETTOYAGE DE LA BASE
echo ======================================================
echo.
echo Ce script va vider tous les produits, ventes, achats, 
echo clients et mouvements de la base de donnees.
echo.
echo Les comptes utilisateurs seront GARDES.
echo.
set /p confirm="Etes-vous sur de vouloir tout effacer ? (O/N) : "

if /I "%confirm%" NEQ "O" (
    echo Operation annulee.
    pause
    exit
)

echo.
echo Nettoyage en cours...
node scripts/raz-base-pro.js

echo.
echo Modification des fichiers de production...
copy /Y C:\gesticom\gesticom.db C:\gesticom\gesticom.db.bak > nul
echo.
echo ======================================================
echo          NETTOYAGE TERMINE AVEC SUCCES !
echo ======================================================
pause
