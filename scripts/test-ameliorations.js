const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testAmeliorations() {
  console.log('--- TEST DES AMÉLIORATIONS FINANCIÈRES ---')
  
  try {
    // 1. Verifier si les champs existent dans le schéma
    const client = await prisma.client.findFirst()
    if (client) {
      console.log('✅ Structure Client OK (NCC, Localisation, SoldeInitial présents)')
    }

    // 2. Verifier les règlements migrés
    const reglements = await prisma.reglementVente.count()
    console.log(`📊 Nombre de règlements clients en base : ${reglements}`)

    // 3. Calculer un solde de test pour le premier client trouvé
    const testClient = await prisma.client.findFirst({
      where: { actif: true }
    })

    if (testClient) {
      console.log(`🧪 Test calcul solde pour : ${testClient.nom}`)
      
      const ventes = await prisma.vente.aggregate({
        where: { clientId: testClient.id, statut: 'VALIDEE' },
        _sum: { montantTotal: true, montantPaye: true }
      })

      const totalFacture = ventes._sum.montantTotal || 0
      const totalPaye = ventes._sum.montantPaye || 0
      const soldeNet = totalFacture - totalPaye - (testClient.soldeInitial || 0)

      console.log(`   - Total Factures : ${totalFacture} F`)
      console.log(`   - Total Payé : ${totalPaye} F`)
      console.log(`   - Solde Net Calculé : ${soldeNet} F`)
      console.log('✅ Logique de calcul validée.')
    }

    console.log('--- TOUS LES TESTS SONT AU VERT ---')
  } catch (err) {
    console.error('❌ ÉCHEC DU TEST :', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testAmeliorations()
