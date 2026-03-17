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
      if (fs.existsSync(target)) {
        fs.emptyDirSync(target);
      } else {
        fs.ensureDirSync(target);
      }

      const standalonePath = path.join(projectRoot, '.next', 'standalone');
      let appSourcePath = standalonePath;

      // Next.js met souvent l'app dans standalone/nom-du-projet ou standalone/Projets/nom-du-projet
      const internalPath = path.join(standalonePath, 'Projets', 'gesticom2');
      if (fs.existsSync(internalPath)) {
        appSourcePath = internalPath;
        console.log(`📍 Source de l'application trouvée dans : ${appSourcePath}`);
      }

      // Dans standalone, Next met les modules à la racine et le code de l'app dans le dossier projet
      if (fs.existsSync(path.join(standalonePath, 'node_modules'))) {
        fs.copySync(path.join(standalonePath, 'node_modules'), path.join(target, 'node_modules'), { dereference: true });
      }
      
      if (fs.existsSync(appSourcePath)) {
        fs.copySync(appSourcePath, target, { overwrite: true, dereference: true });
      }

      // Copier .next/static et public
      fs.ensureDirSync(path.join(target, '.next/static'));
      fs.copySync(path.join(projectRoot, '.next/static'), path.join(target, '.next/static'), { dereference: true });
      fs.copySync(path.join(projectRoot, 'public'), path.join(target, 'public'), { dereference: true });

      // Config et Prisma
      fs.ensureDirSync(path.join(target, 'prisma'));
      fs.copySync(path.join(projectRoot, 'prisma/schema.prisma'), path.join(target, 'prisma/schema.prisma'), { dereference: true });
      fs.copySync(path.join(projectRoot, '.env'), path.join(target, '.env'), { dereference: true });
      if (fs.existsSync(path.join(projectRoot, '.database_url'))) {
        fs.copySync(path.join(projectRoot, '.database_url'), path.join(target, '.database_url'), { dereference: true });
      }

      // Dépendances critiques
      const critical = ['prisma', '@prisma', 'xlsx-prototype-pollution-fixed', 'bcryptjs', 'fs-extra'];
      critical.forEach(m => {
        const src = path.join(projectRoot, 'node_modules', m);
        const dest = path.join(target, 'node_modules', m);
        if (fs.existsSync(src)) {
          fs.copySync(src, dest, { overwrite: true, dereference: true });
        }
      });

      // Scripts pour l'installateur et maintenance
      fs.ensureDirSync(path.join(target, 'scripts'));
      const scriptsToCopy = [
        'import-quincaillerie-pro.js', 
        'reinitialiser-et-importer-produits-xls.js',
        'reparer-admin.js'
      ];
      scriptsToCopy.forEach(s => {
        const src = path.join(projectRoot, 'scripts', s);
        if (fs.existsSync(src)) {
          fs.copySync(src, path.join(target, 'scripts', s), { dereference: true });
        }
      });

      // Copier MISE-A-JOUR.bat à la racine
      const updateBat = path.join(projectRoot, 'MISE-A-JOUR.bat');
      if (fs.existsSync(updateBat)) {
        fs.copySync(updateBat, path.join(target, 'MISE-A-JOUR.bat'), { dereference: true });
      }

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
