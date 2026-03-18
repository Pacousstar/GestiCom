# Guide de Démarrage de GestiCom

## Problème résolu : npm non reconnu

Le problème était que Node.js était installé mais le PATH n'était pas rechargé dans la session PowerShell actuelle.

## Solutions pour démarrer l'application

### Option 1 : Utiliser le fichier batch (RECOMMANDÉ)

Double-cliquez sur `demarrer.bat` ou exécutez dans PowerShell :
```powershell
.\demarrer.bat
```

Ce fichier recharge automatiquement le PATH et lance l'application.

### Option 2 : Utiliser PowerShell directement

Si vous voulez utiliser PowerShell, rechargez d'abord le PATH :

```powershell
# Recharger le PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Vérifier que npm fonctionne
npm --version

# Lancer l'application
npm run dev
```

### Option 3 : Activer l'exécution de scripts PowerShell (pour utiliser demarrer.ps1)

Si vous voulez utiliser le script `demarrer.ps1`, vous devez d'abord autoriser l'exécution de scripts PowerShell :

**Méthode 1 : Pour la session actuelle uniquement**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\demarrer.ps1
```

**Méthode 2 : Pour l'utilisateur actuel (permanent)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\demarrer.ps1
```

**Note** : La méthode 2 nécessite d'exécuter PowerShell en tant qu'administrateur si vous n'avez pas les droits.

## Vérification de l'installation

Pour vérifier que tout fonctionne :

```powershell
# Recharger le PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Vérifier Node.js
node --version

# Vérifier npm
npm --version
```

## Accès à l'application

Une fois démarrée, l'application est accessible sur :
- **URL** : http://localhost:3000
- **Arrêt** : Appuyez sur `Ctrl+C` dans le terminal

## Résolution permanente du problème PATH

Si vous voulez que npm soit toujours disponible sans recharger le PATH, vous pouvez :

1. Redémarrer PowerShell (le PATH système sera automatiquement chargé)
2. Ou ajouter Node.js manuellement au PATH utilisateur via les paramètres Windows :
   - Paramètres Windows → Système → À propos → Paramètres système avancés
   - Variables d'environnement → Variables utilisateur → Path
   - Ajouter : `C:\Program Files\nodejs`
