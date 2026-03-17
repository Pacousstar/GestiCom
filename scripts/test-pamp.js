const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testPAMP() {
  console.log('--- TEST DU CALCUL PAMP ---')
console.log('DATABASE_URL:', process.env.DATABASE_URL)
  
  // 1. Créer ou récupérer un produit de test
  let produit = await prisma.produit.upsert({
    where: { code: 'TEST-PAMP' },
    update: { pamp: 1000, prixAchat: 1000 },
    create: {
      code: 'TEST-PAMP',
      designation: 'Produit Test PAMP',
      categorie: 'TEST',
      unite: 'unite',
      prixAchat: 1000,
      pamp: 1000,
      actif: true
    }
  })

  // S'assurer qu'une entité existe
  let entite = await prisma.entite.findFirst();
  if (!entite) {
    console.log('Création d\'une entité de test...')
    entite = await prisma.entite.create({
      data: {
        code: 'GSN-TEST',
        nom: 'GSN TEST',
        type: 'SARL',
        localisation: 'Abidjan'
      }
    })
  }

  // S'assurer qu'il y a un magasin
  let magasin = await prisma.magasin.findFirst()
  if (!magasin) {
    console.log('Création d\'un magasin de test...')
    magasin = await prisma.magasin.create({
      data: {
        code: 'MAG-TEST',
        nom: 'Magasin Test',
        localisation: 'Abidjan',
        entiteId: entite.id
      }
    })
  }

  // 2. Initialiser le stock à 10 unités à 1000 FCFA

  // 2. Initialiser le stock à 10 unités à 1000 FCFA
  await prisma.stock.upsert({
    where: { produitId_magasinId: { produitId: produit.id, magasinId: magasin.id } },
    update: { quantite: 10 },
    create: { produitId: produit.id, magasinId: magasin.id, quantite: 10 }
  })

  console.log(`Initial : Stock = 10, PAMP = ${produit.pamp}`)

  // 3. Simuler un achat de 10 unités à 2000 FCFA
  // Formule attendue : ((10 * 1000) + (10 * 2000)) / 20 = 30000 / 20 = 1500 FCFA
  const qteAchetee = 10
  const prixNouveau = 2000
  
  const targetProduit = await prisma.produit.findUnique({
    where: { id: produit.id },
    include: { stocks: true }
  })
  
  const stockGlobalActuel = targetProduit.stocks.reduce((acc, s) => acc + s.quantite, 0)
  const pampActuel = targetProduit.pamp || targetProduit.prixAchat || 0
  
  const nouveauStockGlobal = stockGlobalActuel + qteAchetee
  const nouveauPamp = ((stockGlobalActuel * pampActuel) + (qteAchetee * prixNouveau)) / nouveauStockGlobal

  await prisma.produit.update({
    where: { id: produit.id },
    data: { pamp: nouveauPamp }
  })

  const result = await prisma.produit.findUnique({ where: { id: produit.id } })
  console.log(`Résultat : Stock Global = ${nouveauStockGlobal}, Nouveau PAMP = ${result.pamp}`)
  
  if (result.pamp === 1500) {
    console.log('✅ TEST PAMP RÉUSSI !')
  } else {
    console.log(`❌ ÉCHEC DU TEST : Attendu 1500, obtenu ${result.pamp}`)
  }

  await prisma.$disconnect()
}

testPAMP()
