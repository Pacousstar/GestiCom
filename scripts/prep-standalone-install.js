const fs = require('fs-extra');
const path = require('path');

async function syncStandalone() {
  const projectRoot = 'C:/Users/GSN EXPETISES  GROUP/Projets/gesticom2';
  const targetDir = 'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM/app';
  
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

  // 2. Copier le contenu de standalone
  console.log('📂 Copie du coeur de l\'application (standalone)...');
  const standalonePath = path.join(projectRoot, '.next/standalone');
  const nestedAppPath = path.join(standalonePath, 'Projets/gesticom2');

  // Copier toute la racine de standalone (contient node_modules vitaux)
  fs.copySync(standalonePath, targetDir);

  // Remonter les fichiers de l'app imbriquée à la racine de targetDir
  try {
    if (fs.existsSync(nestedAppPath)) {
      console.log('📦 Extraction des fichiers imbriques...');
      fs.copySync(nestedAppPath, targetDir, { overwrite: true });
      // Nettoyer le dossier Projets imbrique
      console.log('🧹 Nettoyage du dossier temporaire Projets...');
      fs.removeSync(path.join(targetDir, 'Projets'));
    }
  } catch (err) {
    console.error('❌ Erreur lors de l\'extraction:', err.message);
    throw err; // Faire échouer le script proprement avec l'erreur
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
      fs.copySync(src, dest);
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
