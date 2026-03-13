const { PrismaClient } = require('@prisma/client')
const fs = require('fs')

async function checkDb(name, path) {
  if (!fs.existsSync(path)) {
    console.log(`[${name}] Fichier inexistant: ${path}`)
    return
  }
  
  const prisma = new PrismaClient({
    datasources: {
      db: { url: `file:${path}` }
    }
  })
  
  try {
    const count = await prisma.produit.count()
    console.log(`[${name}] ✅ Nombre de produits: ${count}`)
  } catch (e) {
    console.log(`[${name}] ❌ Erreur (Table peut-être absente ou DB bloquée): ${e.message.substring(0, 100)}...`)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  console.log('🧐 Audit final des bases de données pour confirmation d\'inexistence...')
  
  await checkDb('PRODUCTION', 'C:/gesticom/gesticom.db')
  await checkDb('LOCAL_DEV', './prisma/gesticom.db')
  await checkDb('DOCS_OLD', 'C:/GestiCom/app/docs/gesticom_production.db')
  
  console.log('--- Fin de l\'audit ---')
}

main()
