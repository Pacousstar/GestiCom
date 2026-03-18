' GestiCom Pro - Lanceur Intelligente & Silencieuse
' Ce script assure que le moteur tourne avant d'ouvrir le navigateur, sans fenetre noire.
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 1. Verifier si le port 3000 est deja ouvert
' On utilise une astuce PowerShell discrete pour verifier le port
CheckCmd = "powershell -Command ""Test-NetConnection -Port 3000 -ComputerName localhost"" "
Set exec = WshShell.Exec(CheckCmd)
Status = exec.StdOut.ReadAll()

' Si le port est ferme ou si l'appli ne repond pas, on tente de demarrer le service
If InStr(Status, "TcpTestSucceeded : True") = 0 Then
    ' Tenter de demarrer le service (necessite les droits admin, mais le service est deja en route par defaut)
    ' Si non, on lance discretement via node scripts/standalone-launcher.js
    WshShell.Run "cmd /c net start GestiCom-Server", 0, True
End If

' Attendre 2 secondes pour laisser le temps au navigateur de charger
WScript.Sleep 2000

' 2. Ouvrir l'URL locale
WshShell.Run "cmd /c start http://localhost:3000", 0, False
