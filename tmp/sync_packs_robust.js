const fs = require('fs-extra');
const path = require('path');

const sourceDir = 'C:/Users/GSN EXPETISES  GROUP/Projets/gesticom2';
const targetPacks = [
  'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM_client_ETB',
  'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM_bd_vide'
];

const filesToDeleteInPacks = [
  'app/activation',
  'app/api/license',
  'components/ActivationModal.tsx',
  'components/SecurityWrapper.tsx',
  'contexts/ActivationContext.tsx',
  'GestiCom-KeyGen.html',
  'test-keygen.js'
];

async function cleanAndSync() {
  for (const target of targetPacks) {
    console.log(`🧹 Nettoyage des résidus de licence dans : ${target}`);
    for (const file of filesToDeleteInPacks) {
      const fullPath = path.join(target, file);
      if (await fs.exists(fullPath)) {
        await fs.remove(fullPath);
        console.log(`   🗑️ Supprimé : ${file}`);
      }
    }

    console.log(`📦 Synchronisation du code frais vers : ${target}`);
    try {
      await fs.copy(sourceDir, target, {
        overwrite: true,
        filter: (src, dest) => {
          const relativePath = path.relative(sourceDir, src).replace(/\\/g, '/');
          const excludeList = [
            '.git',
            '.next',
            'node_modules',
            'prisma/gesticom.db',
            '.env',
            'tmp',
            'scripts/import-etb-final.js'
          ];
          if (excludeList.some(excluded => relativePath.startsWith(excluded) || relativePath === excluded)) {
            return false;
          }
          return true;
        }
      });
      console.log(`✅ ${target} synchronisé.`);
    } catch (err) {
      console.error(`❌ Erreur pour ${target}:`, err);
    }
  }
}

cleanAndSync();
