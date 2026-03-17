/**
 * Réinitialise le mot de passe de l'utilisateur admin à Admin@123.
 * Utile après une restauration de base : l'admin de la sauvegarde peut avoir un autre mot de passe.
 * Exécuter depuis la racine du projet : node scripts/reset-admin-password.js
 */

const path = require('path')
const bcrypt = require('bcryptjs')

// Forcer l'utilisation de la base de PRODUCTION
const dbPath = 'C:/gesticom/gesticom.db'
process.env.DATABASE_URL = `file:${dbPath}`

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const ADMIN_LOGIN = 'admin'
const ADMIN_PASSWORD = 'Admin@123'

/** Ajoute les colonnes manquantes si la base a été restaurée depuis une ancienne sauvegarde. */
async function ensureUtilisateurColumns() {
  const columns = await prisma.$queryRawUnsafe(
    "SELECT name FROM pragma_table_info('Utilisateur') WHERE name='permissionsPersonnalisees'"
  )
  if (!Array.isArray(columns) || columns.length === 0) {
    await prisma.$executeRawUnsafe('ALTER TABLE Utilisateur ADD COLUMN permissionsPersonnalisees TEXT')
    console.log('Colonne Utilisateur.permissionsPersonnalisees ajoutée.')
  }
}

async function main() {
  await ensureUtilisateurColumns()

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10)

  const existing = await prisma.utilisateur.findUnique({ where: { login: ADMIN_LOGIN } })
  if (existing) {
    await prisma.utilisateur.update({
      where: { id: existing.id },
      data: { motDePasse: hash },
    })
    const after = await prisma.utilisateur.findUnique({
      where: { id: existing.id },
      select: { motDePasse: true },
    })
    const ok = after && (await bcrypt.compare(ADMIN_PASSWORD, after.motDePasse))
    if (ok) {
      console.log('✅ Mot de passe de l\'utilisateur "admin" réinitialisé à : Admin@123')
      console.log('   Vérification : le mot de passe correspond au hash en base.')
    } else {
      console.log('⚠️ Mot de passe mis à jour mais la vérification a échoué. Réessayez le script.')
    }
    return
  }

  // Pas d'admin : créer entité + magasin + admin (comme le seed)
  let entite = await prisma.entite.findFirst()
  if (!entite) {
    entite = await prisma.entite.create({
      data: {
        code: 'MM01',
        nom: 'Maison Mère',
        type: 'MAISON_MERE',
        localisation: 'Siège',
        active: true,
      },
    })
  }

  let magasin = await prisma.magasin.findUnique({ where: { code: 'MAG01' } })
  if (!magasin) {
    magasin = await prisma.magasin.create({
      data: {
        code: 'MAG01',
        nom: 'Magasin 01',
        localisation: entite.localisation,
        entiteId: entite.id,
        actif: true,
      },
    })
  }

  await prisma.utilisateur.create({
    data: {
      login: ADMIN_LOGIN,
      nom: 'Super Admin',
      email: 'admin@gesticom.local',
      motDePasse: hash,
      role: 'SUPER_ADMIN',
      entiteId: entite.id,
      actif: true,
    },
  })
  const ok = await bcrypt.compare(ADMIN_PASSWORD, hash)
  console.log('✅ Utilisateur "admin" créé avec le mot de passe : Admin@123')
  if (ok) console.log('   Vérification : le mot de passe correspond au hash.')
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
