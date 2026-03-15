const fs = require('fs-extra');
const path = require('path');

async function syncStandalone() {
  const projectRoot = process.cwd();
  const targetDir = path.resolve(projectRoot, '../INSTALLATION_GESTICOM/app');
  
  console.log('🚀 Synchronisation mode STANDALONE...');

  if (!fs.existsSync(path.join(projectRoot, '.next/standalone'))) {
    console.error('❌ Erreur: .next/standalone introuvable. Le build a-t-il réussi ?');
    return;
  }

  // 1. Nettoyer la destination avec gestion d'erreur forcée
  try {
    if (fs.existsSync(targetDir)) {
      console.log('🧹 Nettoyage de la destination...');
      fs.emptyDirSync(targetDir); // Plus sûr que removeSync sur Windows
    } else {
      fs.ensureDirSync(targetDir);
    }
  } catch (err) {
    console.log('⚠️ Avertissement Nettoyage: ' + err.message);
  }

  // 2. Copier le contenu de standalone de manière sécurisée
  console.log('📂 Copie sélective du contenu Standalone...');
  const standalonePath = path.join(projectRoot, '.next/standalone');
  const appSourcePath = path.join(standalonePath, 'Projets/gesticom2');

  try {
    // 2a. Définir les chemins sources dans standalone
    const standaloneModulesPath = path.join(appSourcePath, 'node_modules');
    const standaloneServerJs = path.join(appSourcePath, 'server.js');

    // 2b. Copier les node_modules de standalone (pour les dépendances Next)
    // On priorise le dossier imbriqué car c'est là que Next place les dépendances de production
    if (fs.existsSync(standaloneModulesPath)) {
      console.log('   + node_modules (Production dependencies)');
      fs.copySync(standaloneModulesPath, path.join(targetDir, 'node_modules'), { overwrite: true });
    } else if (fs.existsSync(path.join(standalonePath, 'node_modules'))) {
      // Fallback sur la racine de standalone si l'autre n'existe pas
      console.log('   + node_modules (Root dependencies)');
      fs.copySync(path.join(standalonePath, 'node_modules'), path.join(targetDir, 'node_modules'), { overwrite: true });
    }

    // 2c. Copier server.js (essentiel pour le lancement)
    if (fs.existsSync(standaloneServerJs)) {
      console.log('   + server.js');
      fs.copySync(standaloneServerJs, path.join(targetDir, 'server.js'), { overwrite: true });
    } else if (fs.existsSync(path.join(standalonePath, 'server.js'))) {
      console.log('   + server.js (from root)');
      fs.copySync(path.join(standalonePath, 'server.js'), path.join(targetDir, 'server.js'));
    }

    // 2d. Copier le coeur de l'application (pages, chunks, etc.)
    if (fs.existsSync(appSourcePath)) {
      console.log('   + Application core content');
      fs.copySync(appSourcePath, targetDir, {
        overwrite: true,
        filter: (src) => !src.includes('node_modules') && !src.endsWith('server.js')
      });
    }
  } catch (err) {
    console.error('❌ Erreur lors de la copie standalone:', err.message);
    throw err;
  }

  // 3. Copier les ressources statiques
  console.log('📁 Copie des ressources statiques...');
  fs.copySync(path.join(projectRoot, 'public'), path.join(targetDir, 'public'));
  
  const targetNextStatic = path.join(targetDir, '.next/static');
  fs.ensureDirSync(path.join(targetDir, '.next'));
  fs.copySync(path.join(projectRoot, '.next/static'), targetNextStatic);

  // 4. COPIE DES DEPENDANCES CRITIQUES (Vital pour db push et import XLS)
  console.log('💎 Copie des dependances node_modules critiques...');
  const modulesToCopy = [
    'prisma',
    '@prisma',
    'xlsx-prototype-pollution-fixed',
    'bcryptjs',
    'fs-extra'
  ];

  modulesToCopy.forEach(m => {
    const src = path.join(projectRoot, 'node_modules', m);
    const dest = path.join(targetDir, 'node_modules', m);
    if (fs.existsSync(src)) {
      console.log(`   + ${m}`);
      try {
        if (fs.existsSync(dest)) fs.removeSync(dest);
        fs.copySync(src, dest);
      } catch (err) {
        console.error(`❌ Erreur lors de la copie de ${m}:`, err.message);
      }
    }
  });

  // 5. Copier les fichiers critiques
  console.log('📄 Copie des fichiers de configuration et scripts...');
  fs.ensureDirSync(path.join(targetDir, 'prisma'));
  fs.copySync(path.join(projectRoot, 'prisma/schema.prisma'), path.join(targetDir, 'prisma/schema.prisma'));
  
  fs.ensureDirSync(path.join(targetDir, 'scripts'));
  const scriptsToCopy = [
    'import-quincaillerie-pro.js',
    'reinitialiser-et-importer-produits-xls.js',
    'clean.js'
  ];
  
  scriptsToCopy.forEach(s => {
    const src = path.join(projectRoot, 'scripts', s);
    if (fs.existsSync(src)) {
      console.log(`   + script: ${s}`);
      fs.copySync(src, path.join(targetDir, 'scripts', s));
    }
  });
  
  fs.copySync(path.join(projectRoot, '.env'), path.join(targetDir, '.env'));

  console.log('✅ Synchronisation terminée avec succès !');
}

syncStandalone().catch(console.error);
