const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:C:/gesticom/gesticom.db'
    }
  }
})

const ADMIN_LOGIN = 'admin'
const ADMIN_PASSWORD = 'Admin@123'

async function main() {
  console.log('--- SEED GESTICOM PORTABLE ---')
  
  // 1. Entité (Maison Mère)
  const entiteCode = 'MM01'
  let entite = await prisma.entite.findUnique({ where: { code: entiteCode } })
  if (!entite) {
    entite = await prisma.entite.create({
      data: {
        code: entiteCode,
        nom: 'GSN EXPERTISES GROUP',
        type: 'MAISON_MERE',
        localisation: 'Siège',
        active: true,
      },
    })
    console.log('Entité créée.')
  } else {
    console.log('Entité existe déjà.')
  }

  // 2. Magasin par défaut
  const magasinCode = 'MAG01'
  let magasin = await prisma.magasin.findUnique({ where: { code: magasinCode } })
  if (!magasin) {
    magasin = await prisma.magasin.create({
      data: {
        code: magasinCode,
        nom: 'MAG01 Maison Mère',
        localisation: entite.localisation,
        entiteId: entite.id,
        actif: true,
      },
    })
    console.log('Magasin par défaut créé (MAG01).')
  } else {
    console.log('Magasin MAG01 existe déjà.')
  }

  // 3. Utilisateur Admin
  const existing = await prisma.utilisateur.findUnique({ where: { login: ADMIN_LOGIN } })
  if (!existing) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
    await prisma.utilisateur.create({
      data: {
        login: ADMIN_LOGIN,
        nom: 'Administrateur',
        email: 'admin@gesticom.local',
        motDePasse: passwordHash,
        role: 'SUPER_ADMIN',
        entiteId: entite.id,
        actif: true,
      },
    })
    console.log('Utilisateur admin cree (admin / Admin@123).')
  } else {
    console.log('Utilisateur admin existe deja.')
  }

  // 4. Paramètres
  const params = await prisma.parametre.findFirst()
  if (!params) {
    await prisma.parametre.create({
      data: {
        nomEntreprise: 'GestiCom',
        devise: 'FCFA',
        tvaParDefaut: 0,
      }
    })
    console.log('Parametres crees.')
  }

  // 5. Validation Finale
  const userCount = await prisma.utilisateur.count()
  console.log(`Verification Prisma : ${userCount} utilisateur(s) trouve(s) dans la base.`)
  console.log('Seed termine avec succes ! Base de donnees opérationnelle.')
}

main()
  .catch(e => {
    console.error('Erreur Seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
