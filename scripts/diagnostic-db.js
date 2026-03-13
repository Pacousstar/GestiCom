const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:C:/gesticom/gesticom.db'
    }
  }
})

async function main() {
  console.log('--- DIAGNOSTIC BASE DE DONNEES ---')
  
  try {
    const entites = await prisma.entite.count()
    console.log('Nombre d\'entités:', entites)
    if (entites > 0) {
      const e = await prisma.entite.findFirst()
      console.log('Première entité:', JSON.stringify(e))
    }

    const utilisateurs = await prisma.utilisateur.count()
    console.log('Nombre d\'utilisateurs:', utilisateurs)
    if (utilisateurs > 0) {
      const u = await prisma.utilisateur.findFirst()
      console.log('Premier utilisateur:', JSON.stringify({ ...u, motDePasse: '***' }))
    }

    const auditLogs = await prisma.auditLog.count()
    console.log('Nombre de logs d\'audit:', auditLogs)

    // Vérifier les contraintes
    if (utilisateurs > 0) {
      const u = await prisma.utilisateur.findFirst()
      const e = await prisma.entite.findUnique({ where: { id: u.entiteId } })
      console.log('Vérification relation Utilisateur -> Entite:', e ? 'OK' : 'ERREUR (ID Entité manquant: ' + u.entiteId + ')')
    }

  } catch (err) {
    console.error('Erreur diagnostic:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
