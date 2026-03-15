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
    // 2a. Copier les node_modules de standalone (pour les dépendances Next)
    if (fs.existsSync(path.join(standalonePath, 'node_modules'))) {
      console.log('   + node_modules (Next)');
      fs.copySync(path.join(standalonePath, 'node_modules'), path.join(targetDir, 'node_modules'), { overwrite: true });
    }

    // 2b. Copier sever.js de standalone
    if (fs.existsSync(path.join(standalonePath, 'server.js'))) {
      console.log('   + server.js');
      fs.copySync(path.join(standalonePath, 'server.js'), path.join(targetDir, 'server.js'));
    }

    // 2c. Copier le coeur de l'application depuis le sous-dossier imbriqué
    if (fs.existsSync(appSourcePath)) {
      console.log('   + Application core (vrai contenu)');
      fs.copySync(appSourcePath, targetDir, {
        overwrite: true,
        filter: (src) => !src.includes('node_modules') // On gère node_modules séparément pour plus de contrôle
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
