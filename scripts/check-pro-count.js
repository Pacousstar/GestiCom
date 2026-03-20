const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = "file:C:/gesticom/gesticom.db";
const prisma = new PrismaClient();

async function check() {
    const count = await prisma.produit.count();
    const stock = await prisma.stock.count();
    const sumQty = await prisma.stock.aggregate({ _sum: { quantite: true } });
    console.log(`--- VÉRIFICATION PRO ---`);
    console.log(`Produits : ${count}`);
    console.log(`Lignes de stock : ${stock}`);
    console.log(`Quantité totale cumulée : ${sumQty._sum.quantite}`);
    await prisma.$disconnect();
}
check();
