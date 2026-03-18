# GestiCom

Gestion de quincaillerie — multi-magasins, stocks, ventes, Comptabilité (accès restreint).

## Installation

1. **Variables d'environnement**  
   Copier `.env.example` vers `.env`, puis renseigner `SESSION_SECRET` (min. 32 caractères).

2. **Dépendances**  
   `npm install`

3. **Base de données**  
   - `npx prisma db push` — synchronise le schéma (crée les tables/colonnes manquantes dans `prisma/gesticom.db`)  
   - ou `npm run db:migrate` si vous utilisez les migrations

4. **Données initiales**  
   `npm run db:seed`  
   → Compte par défaut : **admin** / **Admin@123**

5. **Lancer l'application**  
   `npm run dev` → [http://localhost:3000](http://localhost:3000)

6. **Option B — Lanceur standalone (sans `npm run dev`)**  
   - `npm run build`  
   - **Avant le 1er démarrage** : `npx prisma db push` et `npm run db:seed` (la base `prisma/gesticom.db` doit être à jour).  
   - Double-cliquer sur `scripts/demarrer-standalone.bat` ou : `npm run start:standalone`  
   - Puis ouvrir [http://localhost:3000](http://localhost:3000).  
   Le launcher charge `.env`, pointe la base `prisma/gesticom.db` et copie `public` / `.next/static` si besoin.

   **Si vous voyez** « no such table: Client », « column quantiteInitiale does not exist », etc. : la base n'est pas à jour. Arrêtez le serveur, puis dans le dossier du projet :
   ```bash
   npx prisma db push
   npm run db:seed
   ```
   Puis relancez `npm run start:standalone`.

   **Si vous aviez deux bases** (`prisma/gesticom.db` et `prisma/prisma/gesticom.db`) : fusion, dédoublonnage et nettoyage :
   ```bash
   npm install
   npm run fusion-bases
   npm run start:standalone
   ```
   Voir `scripts/fusion-bases.js`. Les sauvegardes sont dans `prisma/backup_avant_fusion/`.

   **Si « Unable to open the database file » (chemin avec espaces, ex. `GSN EXPETISES  GROUP`)** : le launcher copie la base vers `C:\Users\Public\gesticom\` ou `C:\gesticom\`. Si ça échoue (permissions) :
   - Déplacer le projet vers un chemin **sans espaces** : `C:\Projets\gesticom`
   - Ou exécuter le terminal en **administrateur**, ou : `icacls "C:\Users\GSN EXPETISES  GROUP\Projets\gesticom" /grant Everyone:F`

7. **Version portable (clé USB)**
   - `npm run build:portable` → crée **GestiCom-Portable/** (à copier sur clé USB).
   - Ajoutez **node.exe** dans GestiCom-Portable (zip Windows depuis [nodejs.org/dist](https://nodejs.org/dist/)).
   - Double-clic sur **Lancer.vbs** (sans fenêtre) ou **Lancer.bat** → http://localhost:3000
   - Base dans `data/gesticom.db`. Compte par défaut : admin / Admin@123
   - Si le chemin contient des espaces, le launcher copie la base vers `C:\gesticom_portable_data` et la resynchronise à l’arrêt.

8. **Catalogue produits (optionnel)**  
   - Placer ou mettre à jour `data/GestiCom_Produits_Master.json` (tableau : `code`, `designation`, `categorie`, `prix_achat`, `prix_vente`, `seuil_min`, `magasins[]`, `stock_initial`).  
   - Dans l'app : **Produits** → **Importer JSON** pour mettre à jour Produits et créer les Stocks produit×magasin si `magasins` est renseigné.  
   - Structure détaillée : `data/STRUCTURE_GestiCom_Produits_Master.md`. Exemple : `data/GestiCom_Produits_Master.exemple.json`.
   - **Import CSV** : même principe depuis `data/GestiCom_Produits_Master.csv` (colonnes : Code, Designation, Categorie, Prix_Achat, Prix_Vente, Seuil_Min). Bouton **Importer CSV** dans Produits.
   - **Enrichir le JSON avec magasins** : `npm run enrichir:magasins` ou `npx tsx scripts/enrichir-produits-avec-magasins.ts [MAG01,MAG02]` → génère `data/GestiCom_Produits_Master_avec_magasins.json`.

---

## Démarrage

Lancer le serveur de développement :

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.

Le projet utilise [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) pour charger les polices.

## Documentation

- **Documentation projet** : voir le dossier [docs/](docs/README.md) (topo, BD portable, installation, import Excel, prochaines étapes).

## En savoir plus

- [Documentation Next.js](https://nextjs.org/docs)
- [Tutoriel Next.js](https://nextjs.org/learn)
- [Dépôt Next.js](https://github.com/nextjs/next.js)

## Déploiement

Pour déployer une application Next.js, voir la [documentation de déploiement](https://nextjs.org/docs/app/building-your-application/deploying) (Vercel, etc.).
