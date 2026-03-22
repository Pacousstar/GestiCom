/**
 * Ajoute les colonnes manquantes dans la base (backup ancien) pour correspondre au schéma Prisma.
 * À lancer depuis la racine : node scripts/ajouter-colonnes-manquantes-bd.js
 */

const path = require('path')
const fs = require('fs')

const projectRoot = path.resolve(__dirname, '..')
const envPath = path.join(projectRoot, '.env')
let dbPath = path.join(projectRoot, 'prisma', 'gesticom.db')

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  const m = content.match(/^DATABASE_URL\s*=\s*["']?file:(.+?)["']?\s*$/m)
  if (m) {
    let p = m[1].trim().replace(/\?.*$/, '')
    if (p.startsWith('./')) p = path.join(projectRoot, p.slice(2))
    else if (!path.isAbsolute(p)) p = path.join(projectRoot, p)
    dbPath = path.normalize(p)
  }
}

console.log('🔍 Chemin DB cible:', dbPath)

if (!fs.existsSync(dbPath)) {
  console.error('❌ Base introuvable:', dbPath)
  process.exit(1)
}

const Database = require('better-sqlite3')
const db = new Database(dbPath)

function hasColumn(db, table, col) {
  const rows = db.prepare(`SELECT name FROM pragma_table_info(?) WHERE name = ?`).all(table, col)
  return rows.length > 0
}

function addColumn(db, table, col, sqlType, defaultValue) {
  if (hasColumn(db, table, col)) return false
  const def = defaultValue ? ` DEFAULT ${defaultValue}` : ''
  db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${sqlType}${def}`).run()
  return true
}

try {
  let changed = false

  // Produit.updatedAt (Prisma DateTime -> SQLite TEXT avec default)
  if (addColumn(db, 'Produit', 'updatedAt', 'TEXT', "current_timestamp")) {
    console.log('✅ Colonne Produit.updatedAt ajoutée.')
    changed = true
  }

  // Stock.updatedAt
  if (addColumn(db, 'Stock', 'updatedAt', 'TEXT', "current_timestamp")) {
    console.log('✅ Colonne Stock.updatedAt ajoutée.')
    changed = true
  }

  // Client.updatedAt (dashboard + liste clients)
  if (addColumn(db, 'Client', 'updatedAt', 'TEXT', "current_timestamp")) {
    console.log('✅ Colonne Client.updatedAt ajoutée.')
    changed = true
  }

  // Fournisseur.updatedAt
  if (addColumn(db, 'Fournisseur', 'updatedAt', 'TEXT', "current_timestamp")) {
    console.log('✅ Colonne Fournisseur.updatedAt ajoutée.')
    changed = true
  }
  
  // Fournisseur.avoirInitial
  if (addColumn(db, 'Fournisseur', 'avoirInitial', 'REAL', '0')) {
    console.log('✅ Colonne Fournisseur.avoirInitial ajoutée.')
    changed = true
  }

  if (!changed) {
    console.log('Aucune colonne manquante. La base est déjà à jour.')
  } else {
    console.log('')
    console.log('Redémarrez le serveur (npm run dev:legacy) et rechargez la page.')
  }
} finally {
  db.close()
}
