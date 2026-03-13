const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Nettoyage total de la base de données en cours...')

  // Désactiver temporairement les contraintes (si possible en SQLite, sinon on vide dans l'ordre)
  // Dans SQLite, on vide simplement les tables dépendantes d'abord
  
  console.log('- Vidage des mouvements et lignes...');
  await prisma.mouvement.deleteMany()
  await prisma.stock.deleteMany()
  await prisma.venteLigne.deleteMany()
  await prisma.achatLigne.deleteMany()
  await prisma.transfertLigne.deleteMany()
  
  console.log('- Vidage des transactions...');
  await prisma.vente.deleteMany()
  await prisma.achat.deleteMany()
  await prisma.transfert.deleteMany()
  await prisma.caisse.deleteMany()
  await prisma.depense.deleteMany()
  await prisma.charge.deleteMany()
  await prisma.operationBancaire.deleteMany()
  
  console.log('- Vidage des entités de base...');
  await prisma.produit.deleteMany()
  await prisma.client.deleteMany()
  await prisma.fournisseur.deleteMany()
  await prisma.banque.deleteMany()
  await prisma.magasin.deleteMany()
  
  // On garde les paramètres entreprise et les licences pour éviter de re-paramétrer
  // Mais on peut vider les logs d'audit
  await prisma.auditLog.deleteMany()

  console.log('✅ Base de données vidée à 100% ! (Produits, Magasins, Stocks, Ventes, etc. = 0)')
}

main()
  .catch(e => {
    console.error('❌ Erreur lors du nettoyage :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
