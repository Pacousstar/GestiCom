import { prisma } from './lib/db'

async function main() {
  console.log('--- Vérification des Utilisateurs ---')
  const users = await prisma.utilisateur.findMany()
  for (const u of users) {
    const entite = await prisma.entite.findUnique({ where: { id: u.entiteId } })
    console.log(`User: ${u.nom} (ID: ${u.id}, Login: ${u.login}) - EntiteId: ${u.entiteId} - Existe: ${!!entite}`)
  }

  console.log('\n--- Vérification des Entités ---')
  const entites = await prisma.entite.findMany()
  for (const e of entites) {
    console.log(`Entite: ${e.nom} (ID: ${e.id}, Code: ${e.code})`)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
