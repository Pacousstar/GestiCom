const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Démarrage de l\'injection des données client...')

  // 1. Récupérer l'entité par défaut (ou la créer si absente)
  let entite = await prisma.entite.findFirst()
  if (!entite) {
    console.log('Création de l\'entité par défaut...')
    entite = await prisma.entite.create({
      data: {
        code: 'ENT01',
        nom: 'GSN EXPERTISES GROUP',
        type: 'MAISON_MERE',
        localisation: 'DANANE'
      }
    })
  }

  // Données extraites de l'image (échantillon représentatif)
  const products = [
    { cat: 'TOLES', des: 'TOLE BLEU', mag: 'MAG01 Maison Mère', stock: 617, achat: 2000, vente: 2500 },
    { cat: 'TOLES', des: 'TOLE VERT', mag: 'MAG01 Maison Mère', stock: 739, achat: 2000, vente: 2500 },
    { cat: 'TOLES', des: 'TOLE ORANGE', mag: 'MAG01 Maison Mère', stock: 1035, achat: 2000, vente: 2500 },
    { cat: 'TOLES', des: 'TOLE ROUGE BORDEAUX', mag: 'MAG01 Maison Mère', stock: 2088, achat: 2000, vente: 2500 },
    { cat: 'TOLES', des: 'TOLE ALU', mag: 'MAG01 Maison Mère', stock: 154, achat: 2000, vente: 2500 },
    { cat: 'CHEVRONS', des: 'CHEVRON 6X8', mag: 'MAG01 Maison Mère', stock: 268, achat: 1100, vente: 1500 },
    { cat: 'CHEVRONS', des: 'CHEVRON 4X6', mag: 'MAG01 Maison Mère', stock: 520, achat: 800, vente: 1200 },
    { cat: 'POINTES', des: 'POINTES 100', mag: 'MAG01 Maison Mère', stock: 52, achat: 1100, vente: 1500 },
    { cat: 'POINTES', des: 'POINTES 80', mag: 'MAG01 Maison Mère', stock: 65, achat: 1100, vente: 1500 },
    { cat: 'POINTES', des: 'POINTES 63', mag: 'MAG01 Maison Mère', stock: 48, achat: 1100, vente: 1500 },
    { cat: 'POINTES', des: 'POINTES 50', mag: 'MAG01 Maison Mère', stock: 35, achat: 1100, vente: 1500 },
    { cat: 'CIMENT', des: 'CIMENT CPJ 45', mag: 'MAG01 Maison Mère', stock: 550, achat: 4500, vente: 5000 },
    { cat: 'FER', des: 'FER DE 12', mag: 'MAG01 Maison Mère', stock: 85, achat: 5500, vente: 6500 },
    { cat: 'FER', des: 'FER DE 10', mag: 'MAG01 Maison Mère', stock: 120, achat: 4500, vente: 5500 },
    { cat: 'FER', des: 'FER DE 8', mag: 'MAG01 Maison Mère', stock: 200, achat: 3500, vente: 4500 },
    { cat: 'Visserie', des: 'VIS TOLE 50', mag: 'MAG01 Maison Mère', stock: 2500, achat: 25, vente: 50 },
    { cat: 'Visserie', des: 'VIS TOLE 70', mag: 'MAG01 Maison Mère', stock: 1800, achat: 35, vente: 75 }
  ]

  let count = 0
  for (const p of products) {
    // 2. S'assurer que le magasin existe (recherche par nom via findFirst)
    let magasin = await prisma.magasin.findFirst({ where: { nom: p.mag } })
    if (!magasin) {
      console.log(`Création du magasin: ${p.mag}`)
      magasin = await prisma.magasin.create({
        data: {
          nom: p.mag,
          code: `MAG-${Math.floor(Math.random() * 1000)}`,
          localisation: 'DANANE',
          entiteId: entite.id,
          actif: true
        }
      })
    }

    // 3. Créer le produit (upsert par code pour éviter doublons)
    const codeGen = p.des.substring(0, 3).toUpperCase() + '-' + Math.floor(Math.random() * 10000)
    
    // On cherche d'abord par désignation
    const existingProduit = await prisma.produit.findFirst({ where: { designation: p.des } })
    
    const produit = await prisma.produit.upsert({
      where: { id: existingProduit?.id || -1 },
      update: {
        prixAchat: p.achat,
        prixVente: p.vente,
        categorie: p.cat
      },
      create: {
        designation: p.des,
        categorie: p.cat,
        prixAchat: p.achat,
        prixVente: p.vente,
        unite: 'U',
        actif: true,
        code: codeGen
      }
    })

    // 4. Initialiser le stock (dans le modèle Stock, pas StockMagasin)
    await prisma.stock.upsert({
      where: {
        produitId_magasinId: {
          produitId: produit.id,
          magasinId: magasin.id
        }
      },
      update: { quantite: p.stock },
      create: {
        produitId: produit.id,
        magasinId: magasin.id,
        quantite: p.stock,
        quantiteInitiale: p.stock
      }
    })
    
    count++
  }

  console.log(`✅ ${count} produits injectés avec succès !`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
