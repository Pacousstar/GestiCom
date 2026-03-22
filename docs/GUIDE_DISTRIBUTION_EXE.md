# Guide de Distribution GestiCom Pro (.exe)

Ce guide explique comment transformer votre code `gesticom2` en un installateur professionnel pour vos clients.

## 1. Pré-requis (Côté Développeur)
*   **Node.js** installé sur la machine cible.
*   **Inno Setup** (Téléchargez-le sur [jrsoftware.org](https://jrsoftware.org/isdl.php)). C’est l’outil standard pour créer des `.exe`.

## 2. Préparation du "Build"
Avant de créer l'installateur, lancez toujours :
```powershell
npm run build
```
Cela génère le dossier `.next`, qui est la version ultra-rapide et optimisée de GestiCom.

## 3. Rendre GestiCom "Installable"
La meilleure pratique pour un client local est d'utiliser un **Service Windows**. Ainsi, GestiCom démarre dès que l'ordinateur s'allume, sans que l'utilisateur n'ait à ouvrir un terminal.

### Outil recommandé : WinSW (Windows Service Wrapper)
1. Téléchargez `WinSW-x64.exe`.
2. Renommez-le en `GestiComService.exe`.
3. Créez un fichier `GestiComService.xml` avec cette configuration :
```xml
<service>
  <id>GestiComPro</id>
  <name>GestiCom Pro Server</name>
  <description>Serveur de gestion commerciale GestiCom</description>
  <executable>node</executable>
  <arguments>node_modules/next/dist/bin/next start</arguments>
  <log mode="roll"></log>
</service>
```

## 4. Création de l'installateur avec Inno Setup
Créez un script `.iss` dans Inno Setup qui :
1. Copie tous les fichiers du projet (sauf `node_modules` et les dossiers de dev) dans `C:\Program Files\GestiCom`.
2. Lance une commande `npm install --production` à la fin de l'installation.
3. Enregistre le service via `GestiComService.exe install`.
4. Crée un raccourci sur le Bureau pointant vers `http://localhost:3000`.

## 5. Pourquoi cette méthode ?
*   **Fiabilité** : Si le PC redémarre, le serveur GestiCom revient tout seul.
*   **Simplicité** : Le client ne voit jamais de code ou de console noire.
*   **Mises à jour** : Il suffit de relancer un nouvel `.exe` pour écraser l'ancienne version.

---
*Note : Je peux vous aider à rédiger le script exact pour Inno Setup dès que nous aurons validé la structure finale.*
