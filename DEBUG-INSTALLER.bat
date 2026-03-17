
cd /d "%~dp0"
echo [DEBUG] Repertoire courant : %CD%
echo [DEBUG] Verification des droits...
net session
if %errorLevel% neq 0 (
    echo [ERREUR] Pas les droits administrateur !
) else (
    echo [OK] Droits administrateur confirmes.
)
echo.
echo [DEBUG] Verification de Node.js...
node -v
if %errorLevel% neq 0 (
    echo [ERREUR] Node.js est introuvable.
) else (
    echo [OK] Node.js detecte.
)
echo.
echo [DEBUG] Tentative de lancement de l'installateur reel...
pause
call INSTALLER-PRO.bat
echo.
echo [DEBUG] Script termine.
pause
