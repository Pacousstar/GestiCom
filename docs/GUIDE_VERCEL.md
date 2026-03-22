# Guide de Déploiement Vercel (Suivi DG DIHI)

Ce guide vous accompagne pas à pas pour mettre GestiCom Pro en ligne sur Vercel afin que nous puissions suivre le développement ensemble.

## Étape 1 : Créer la Base de Données (PostgreSQL)
Vercel ne supporte pas SQLite (votre fichier `.db` actuel). Nous allons utiliser une base de données Cloud gratuite.
1. Allez sur [Neon.tech](https://neon.tech/) ou utilisez **Vercel Postgres**.
2. Créez un projet nommé `gesticom-cloud`.
3. Copiez la chaîne de connexion (`Connection String`). Elle ressemble à :
   `postgres://user:password@hostname/dbname?sslmode=require`

## Étape 2 : Importer le projet sur Vercel
1. Connectez-vous à [Vercel.com](https://vercel.com).
2. Cliquez sur **"Add New"** > **"Project"**.
3. Importez votre dépôt GitHub `Pacousstar/GestiCom`.

## Étape 3 : Configurer les Variables d'Environnement
Dans l'onglet **"Environment Variables"** de Vercel, ajoutez ces deux clés :
1. `DATABASE_URL` : Collez ici la chaîne de connexion de l'Étape 1.
2. `NEXTAUTH_SECRET` : Saisissez une phrase secrète complexe (ex: `GestiComProSecret2026!`).
3. `NEXTAUTH_URL` : Mettez l'adresse que Vercel vous donnera (ex: `https://votre-projet.vercel.app`).

## Étape 4 : Déploiement
1. Cliquez sur **"Deploy"**.
2. Vercel va lire mon fichier `vercel.json` et lancer automatiquement :
   *   `npx prisma generate` (pour préparer la base)
   *   `next build` (pour compiler l'app)

## Étape 5 : Initialiser les tables
Une fois l'application déployée, ouvrez un terminal sur votre machine locale (là où vous êtes actuellement) et lancez cette commande **une seule fois** pour créer les tables sur le Cloud :
```powershell
npx prisma db push
```
*(Assurez-vous que votre `.env` local pointe temporairement vers l'URL Neon pour cette commande, puis remettez l'URL SQLite locale).*

---
**Bravo !** GestiCom sera alors accessible partout pour nos tests de suivi.
