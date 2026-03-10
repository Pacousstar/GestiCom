# Script de création de raccourci pour GestiCom
$ShortcutPath = "$([Environment]::GetFolderPath("Desktop"))\GestiCom.lnk"
$TargetContext = "c:\Users\GSN EXPETISES  GROUP\Projets\gesticom2"
$IconPath = "c:\Users\GSN EXPETISES  GROUP\Projets\gesticom2\public\logo_shortcut.png"

$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-NoExit -Command `"cd '$TargetContext'; npm run dev`""
$Shortcut.WorkingDirectory = $TargetContext
$Shortcut.IconLocation = $IconPath
$Shortcut.Description = "Lancer GestiCom (Mode Développement)"
$Shortcut.Save()

Write-Host "Le raccourci GestiCom a été créé sur votre bureau." -ForegroundColor Green
