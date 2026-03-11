const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSave() {
    console.log("Test de sauvegarde en cours...");
    try {
        const product = await prisma.produit.create({
            data: {
                code: "TEST-" + Date.now(),
                designation: "Produit Test Sécurisation",
                categorie: "TEST",
                unite: "unite",
                prixAchat: 100,
                prixVente: 200,
                actif: true
            }
        });
        console.log("SUCCÈS : Produit créé avec l'ID", product.id);
        
        // Supprimer le test
        await prisma.produit.delete({ where: { id: product.id } });
        console.log("SUCCÈS : Nettoyage effectué.");
    } catch (error) {
        console.error("ÉCHEC DE LA SAUVEGARDE :", error);
    } finally {
        await prisma.$disconnect();
    }
}

testSave();
