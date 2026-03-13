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
  
  // 1. Entité
  let entite = await prisma.entite.findFirst()
  if (!entite) {
    entite = await prisma.entite.create({
      data: {
        code: 'MM01',
        nom: 'Maison Mere',
        type: 'MAISON_MERE',
        localisation: 'Siege',
        active: true,
      },
    })
    console.log('Entite creee.')
  }

  // 2. Nettoyage et Création Magasin
  console.log('Nettoyage des magasins existants...')
  try {
    await prisma.magasin.deleteMany({})
    console.log('Magasins nettoyes.')
  } catch (e) {
    console.log('Note: Nettoyage magasins ignore (peut etre lie a des donnees existantes).')
  }
  
  let magasin = await prisma.magasin.create({
    data: {
      code: 'MAG01',
      nom: 'Magasin 01',
      localisation: entite.localisation,
      entiteId: entite.id,
      actif: true,
    },
  })
  console.log('Magasin par defaut cree (MAG01).')

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
