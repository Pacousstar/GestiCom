const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- TEST D\'ENREGISTREMENT COMPLET ---');

    try {
        // 1. Préparation (Magasin et Utilisateur)
        let magasin = await prisma.magasin.findFirst();
        if (!magasin) {
            // Obtenir une entité pour le magasin
            const entite = await prisma.entite.findFirst() || await prisma.entite.create({ data: { nom: 'ENTITE_TEST', contact: '00', localisation: 'TEST' } });
            magasin = await prisma.magasin.create({
                data: {
                    code: 'MAG_T',
                    nom: 'MAGASIN TEST',
                    localisation: 'TEST',
                    entiteId: entite.id
                }
            });
        }

        const user = await prisma.utilisateur.findFirst();
        if (!user) {
            console.log('⚠️ Aucun utilisateur trouvé, arrêt du test.');
            return;
        }

        console.log('📍 Utilisation Magasin:', magasin.nom);

        // 2. Test Client
        const newClient = await prisma.client.create({
            data: { nom: 'TEST_CLIENT_REAC', type: 'CASH', actif: true }
        });
        console.log('✅ Client créé ID:', newClient.id);

        // 3. Test Produit
        const newProduit = await prisma.produit.create({
            data: {
                code: 'TEST_PROD_' + Date.now(),
                designation: 'PRODUIT TEST REACTIVITE',
                categorie: 'TEST',
                prixVente: 1000,
                actif: true
            }
        });
        console.log('✅ Produit créé ID:', newProduit.id);

        // 4. Test Stock
        const newStock = await prisma.stock.create({
            data: {
                produitId: newProduit.id,
                magasinId: magasin.id,
                quantite: 50,
                quantiteInitiale: 50
            }
        });
        console.log('✅ Stock créé ID:', newStock.id);

        // 5. Nettoyage
        await prisma.stock.delete({ where: { id: newStock.id } });
        await prisma.produit.delete({ where: { id: newProduit.id } });
        await prisma.client.delete({ where: { id: newClient.id } });
        console.log('✨ Test réussi et Nettoyage terminé.');

    } catch (e) {
        console.error('❌ Erreur:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
