const fs = require('fs-extra');
const path = require('path');

const sourceDir = 'C:/Users/GSN EXPETISES  GROUP/Projets/gesticom2';
const targetPacks = [
  'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM_client_ETB',
  'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM_bd_vide'
];

const excludeList = [
  '.git',
  '.next',
  'node_modules',
  'prisma/gesticom.db', // Ne pas écraser la base de données spécifique
  '.env',               // Ne pas écraser la config spécifique si elle existe
  'tmp',
  'scripts/import-etb-final.js' // Script temporaire
];

async function sync() {
  for (const target of targetPacks) {
    console.log(`📦 Synchronisation vers : ${target}`);
    try {
      await fs.copy(sourceDir, target, {
        overwrite: true,
        filter: (src, dest) => {
          const relativePath = path.relative(sourceDir, src).replace(/\\/g, '/');
          if (excludeList.some(excluded => relativePath.startsWith(excluded))) {
            return false;
          }
          return true;
        }
      });
      console.log(`✅ ${target} mis à jour.`);
    } catch (err) {
      console.error(`❌ Erreur pour ${target}:`, err);
    }
  }
}

sync();
