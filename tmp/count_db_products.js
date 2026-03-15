const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'file:C:/gesticom/gesticom.db' } }
});

async function check() {
  const count = await prisma.produit.count();
  console.log(`Nombre total de produits en base : ${count}`);
  await prisma.$disconnect();
}
check();
