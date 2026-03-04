/**
 * Script de nettoyage de la BD GestiCom pour mise en production.
 * Supprime toutes les données de test en préservant :
 *   - Utilisateurs (SUPER_ADMIN)
 *   - Plan de comptes SYSCOHADA
 *   - Journaux comptables
 *   - Paramètres entreprise
 *   - Templates d'impression
 */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanForProduction() {
    console.log('\n🧹 Début du nettoyage de la base de données GestiCom...\n')

    // Vérifications avant suppression
    const nbUsers = await prisma.utilisateur.count()
    const nbAdmin = await prisma.utilisateur.count({ where: { role: 'SUPER_ADMIN' } })
    const nbComptes = await prisma.planCompte.count()

    console.log(`👥 Utilisateurs trouvés : ${nbUsers} (dont ${nbAdmin} SUPER_ADMIN)`)
    console.log(`📒 Plan de comptes SYSCOHADA : ${nbComptes} comptes`)

    if (nbAdmin === 0) {
        console.error('❌ ARRÊT : Aucun SUPER_ADMIN trouvé ! Annulation pour sécurité.')
        process.exit(1)
    }

    console.log('\n⚠️  Suppression des données de test en cours...\n')

    // Ordre de suppression important (respecter les foreign keys)

    // 1. Audit et préférences
    const audit = await prisma.auditLog.deleteMany()
    console.log(`  ✓ AuditLog : ${audit.count} entrées supprimées`)

    const dashPref = await prisma.dashboardPreference.deleteMany()
    console.log(`  ✓ DashboardPreference : ${dashPref.count} entrées supprimées`)

    // 2. Comptabilité (écritures uniquement)
    const ecritures = await prisma.ecritureComptable.deleteMany()
    console.log(`  ✓ Écritures comptables : ${ecritures.count} supprimées`)

    // 3. Banque (opérations + comptes)
    const opBanque = await prisma.operationBancaire.deleteMany()
    console.log(`  ✓ Opérations bancaires : ${opBanque.count} supprimées`)
    const banques = await prisma.banque.deleteMany()
    console.log(`  ✓ Comptes bancaires : ${banques.count} supprimés`)

    // 4. Ventes
    const venteL = await prisma.venteLigne.deleteMany()
    const ventes = await prisma.vente.deleteMany()
    console.log(`  ✓ Ventes : ${ventes.count} supprimées (${venteL.count} lignes)`)

    // 5. Achats
    const achatL = await prisma.achatLigne.deleteMany()
    const achats = await prisma.achat.deleteMany()
    console.log(`  ✓ Achats : ${achats.count} supprimés (${achatL.count} lignes)`)

    // 6. Transferts
    const transLines = await prisma.transfertLigne.deleteMany()
    const transf = await prisma.transfert.deleteMany()
    console.log(`  ✓ Transferts : ${transf.count} supprimés (${transLines.count} lignes)`)

    // 7. Mouvements de stock
    const mouv = await prisma.mouvement.deleteMany()
    console.log(`  ✓ Mouvements de stock : ${mouv.count} supprimés`)

    // 8. Stocks
    const stocks = await prisma.stock.deleteMany()
    console.log(`  ✓ Stock : ${stocks.count} lignes supprimées`)

    // 9. Caisse
    const caisse = await prisma.caisse.deleteMany()
    console.log(`  ✓ Caisse : ${caisse.count} opérations supprimées`)

    // 10. Charges et dépenses
    const charges = await prisma.charge.deleteMany()
    const depenses = await prisma.depense.deleteMany()
    console.log(`  ✓ Charges : ${charges.count} supprimées`)
    console.log(`  ✓ Dépenses : ${depenses.count} supprimées`)

    // 11. Clients et fournisseurs
    const clients = await prisma.client.deleteMany()
    const fournis = await prisma.fournisseur.deleteMany()
    console.log(`  ✓ Clients : ${clients.count} supprimés`)
    console.log(`  ✓ Fournisseurs : ${fournis.count} supprimés`)

    // 12. Produits
    const produits = await prisma.produit.deleteMany()
    console.log(`  ✓ Produits : ${produits.count} supprimés`)

    // 13. Magasins et entités (les utilisateurs seront délié par cascade)
    // D'abord on délie les utilisateurs en mettant un entiteId temporaire ? Non —
    // On supprime les magasins et entités, les utilisateurs seront orphelins
    // => On doit les rattacher à une nouvelle entité lors de la première config
    // MAIS : Prisma ne permettra pas de supprimer une entité si des utilisateurs y sont liés
    // Donc on doit d'abord noter les IDs des admins et les re-rattacher après

    const admins = await prisma.utilisateur.findMany({ where: { role: 'SUPER_ADMIN' } })

    const magasins = await prisma.magasin.deleteMany()
    console.log(`  ✓ Magasins : ${magasins.count} supprimés`)

    // Pour les entités — on ne peut pas supprimer si utilisateurs liés
    // On les garde et l'admin les mettra à jour avec les vraies infos
    console.log(`  ℹ️  Entités : conservées (à mettre à jour via Paramètres)`)

    console.log('\n✅ Nettoyage terminé avec succès !\n')
    console.log('═══════════════════════════════════════')

    // Rapport final
    const finalUsers = await prisma.utilisateur.count()
    const finalComptes = await prisma.planCompte.count()
    const finalJournaux = await prisma.journal.count()
    const finalProduits = await prisma.produit.count()
    const finalVentes = await prisma.vente.count()

    console.log('📊 RÉSUMÉ FINAL :')
    console.log(`  👥 Utilisateurs restants : ${finalUsers}`)
    console.log(`  📒 Plan de comptes SYSCOHADA : ${finalComptes} comptes`)
    console.log(`  📰 Journaux comptables : ${finalJournaux}`)
    console.log(`  📦 Produits : ${finalProduits} (doit être 0)`)
    console.log(`  🛒 Ventes : ${finalVentes} (doit être 0)`)
    console.log('\n🚀 GestiCom est prêt pour la mise en production !')
    console.log('   → Relancez "npm run dev" pour continuer.\n')

    await prisma.$disconnect()
}

cleanForProduction().catch((e) => {
    console.error('\n❌ Erreur lors du nettoyage :', e.message)
    prisma.$disconnect()
    process.exit(1)
})
