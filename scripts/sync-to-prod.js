const fs = require('fs-extra');
const path = require('path');

async function syncToProd() {
  const projectRoot = process.cwd();
  const prodDir = 'C:\\GestiCom\\app';
  const installDir = 'C:\\Users\\GSN EXPETISES  GROUP\\Projets\\INSTALLATION_GESTICOM\\app';
  
  const syncDir = (target) => {
    console.log(`📂 Déploiement vers ${target}...`);
    console.log(`🏠 Racine projet : ${projectRoot}`);
    try {
      // SÉCURITÉ : Ne jamais vider le dossier pour préserver data/ et .env
      fs.ensureDirSync(target);

      const standalonePath = path.join(projectRoot, '.next', 'standalone');
      let appSourcePath = standalonePath;

      const internalPath = path.join(standalonePath, 'Projets', 'gesticom2');
      if (fs.existsSync(internalPath)) {
        appSourcePath = internalPath;
        console.log(`📍 Source de l'application trouvée dans : ${appSourcePath}`);
      }

      // 1. node_modules (uniquement les critiques si on veut aller vite, ou tout le dossier)
      if (fs.existsSync(path.join(standalonePath, 'node_modules'))) {
        fs.copySync(path.join(standalonePath, 'node_modules'), path.join(target, 'node_modules'), { dereference: true, overwrite: true });
      }
      
      // 2. Code de l'application
      if (fs.existsSync(appSourcePath)) {
        // On copie fichier par fichier ou on utilise filter pour exclure .env et data
        fs.copySync(appSourcePath, target, { 
            overwrite: true, 
            dereference: true,
            filter: (src) => {
                const name = path.basename(src);
                return name !== '.env' && name !== 'data';
            }
        });
      }

      // 3. .next/static et public
      fs.ensureDirSync(path.join(target, '.next/static'));
      fs.copySync(path.join(projectRoot, '.next/static'), path.join(target, '.next/static'), { dereference: true, overwrite: true });
      fs.copySync(path.join(projectRoot, 'public'), path.join(target, 'public'), { dereference: true, overwrite: true });

      // 4. Config et Prisma (Schema uniquement)
      fs.ensureDirSync(path.join(target, 'prisma'));
      fs.copySync(path.join(projectRoot, 'prisma/schema.prisma'), path.join(target, 'prisma/schema.prisma'), { dereference: true, overwrite: true });
      
      // SÉCURITÉ : Ne copier .env que s'il n'existe pas déjà sur la cible
      if (!fs.existsSync(path.join(target, '.env'))) {
          console.log(`📝 Création du .env par défaut (n'existait pas)...`);
          fs.copySync(path.join(projectRoot, '.env'), path.join(target, '.env'), { dereference: true });
      }

      // 5. Scripts critiques et maintenance
      fs.ensureDirSync(path.join(target, 'scripts'));
      const scriptsToCopy = [
        'import-quincaillerie-pro.js', 
        'reparer-admin.js',
        'standalone-launcher.js',
        'install-service.js',
        'check-etb-final.js'
      ];
      scriptsToCopy.forEach(s => {
        const src = path.join(projectRoot, 'scripts', s);
        if (fs.existsSync(src)) {
          fs.copySync(src, path.join(target, 'scripts', s), { dereference: true, overwrite: true });
        }
      });

      // 6. Lanceurs et utilitaires racine
      const rootFiles = ['MISE-A-JOUR.bat', 'INSTALLER-PRO.bat', 'REPARER-ADMIN.bat', 'LANCER-SILENCIEUX.vbs'];
      rootFiles.forEach(f => {
        const src = path.join(projectRoot, f);
        if (fs.existsSync(src)) {
          fs.copySync(src, path.join(target, f), { dereference: true, overwrite: true });
        }
      });

    } catch (err) {
      console.error(`❌ Erreur lors de la copie vers ${target}:`, err.message);
    }
  };

  console.log('🚀 Synchronisation GLOBALE (Production + Installateur)...');
  const standaloneCandidate = path.join(projectRoot, '.next', 'standalone');
  console.log(`🔍 Vérification standalone : ${standaloneCandidate}`);
  if (!fs.existsSync(standaloneCandidate)) {
    console.error('❌ Erreur: .next/standalone introuvable.');
    // Chercher un niveau au dessus au cas où Next l'a mis à la racine du workspace
    const workspaceCandidate = path.join(projectRoot, '..', '..', '.next', 'standalone');
    console.log(`🔍 Recherche alternative : ${workspaceCandidate}`);
    if (fs.existsSync(workspaceCandidate)) {
       console.log('✅ Trouvé à la racine du workspace !');
       // Ajustement des chemins si nécessaire
    } else {
       return;
    }
  }
  const prodETB = 'C:\\Users\\GSN EXPETISES  GROUP\\Projets\\INSTALLATION_GESTICOM_client_ETB';
  const prodVide = 'C:\\Users\\GSN EXPETISES  GROUP\\Projets\\INSTALLATION_GESTICOM_bd_vide';
  
  syncDir(prodDir);
  syncDir(installDir);
  syncDir(prodETB);
  syncDir(prodVide);

  console.log('✅ Synchronisation terminée !');
}

syncToProd().catch(console.error);
