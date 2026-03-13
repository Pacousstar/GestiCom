const { PrismaClient } = require('@prisma/client');

const dbPath = 'C:/gesticom/gesticom.db';
const databaseUrl = `file:${dbPath}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function main() {
  console.log('--- DIAGNOSTIC DB ---');
  try {
    const productsCount = await prisma.produit.count();
    console.log(`Produits: ${productsCount}`);

    const stocksCount = await prisma.stock.count();
    console.log(`Stocks: ${stocksCount}`);

    const entites = await prisma.entite.findMany();
    console.log(`Entités: ${entites.length}`);

    const users = await prisma.utilisateur.findMany({ select: { login: true, role: true } });
    console.log(`Utilisateurs:`, users);

    // Test d'une requête complexe
    const stockReport = await prisma.stock.findMany({
      take: 5,
      include: { produit: true, magasin: true }
    });
    console.log(`Échantillon stock:`, JSON.stringify(stockReport, null, 2));

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
