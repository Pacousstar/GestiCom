const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  console.log('--- DIAGNOSTIC DES DONNEES GESTICOM ---');

  // 1. Vérifier les utilisateurs et leurs entités
  const users = await prisma.utilisateur.findMany();
  console.log(`Nombre d'utilisateurs: ${users.length}`);
  
  for (const u of users) {
    const entite = await prisma.entite.findUnique({ where: { id: u.entiteId } });
    if (!entite) {
      console.warn(`⚠️ UTILISATEUR SANS ENTITE VALIDE: ID=${u.id}, Login=${u.login}, entiteId=${u.entiteId}`);
    } else {
      console.log(`Utilisateur OK: ID=${u.id}, Login=${u.login}, Entite=${entite.nom}`);
    }
  }

  // 2. Vérifier les mouvements de stock
  const mouvCount = await prisma.mouvement.count();
  console.log(`Nombre total de mouvements: ${mouvCount}`);
  
  const mouvTypes = await prisma.mouvement.groupBy({
    by: ['type'],
    _sum: { quantite: true },
    _count: true
  });
  console.log('Répartition des mouvements:', JSON.stringify(mouvTypes, null, 2));

  // 3. Vérifier les stocks
  const stocks = await prisma.stock.findMany({ include: { produit: true } });
  const totalStock = stocks.reduce((acc, s) => acc + s.quantite, 0);
  console.log(`Quantité totale en stock (tous produits): ${totalStock}`);

  // 4. Vérifier les clients/fournisseurs sans code
  const clientsSansCode = await prisma.client.count({ where: { code: null } });
  const fournisseursSansCode = await prisma.fournisseur.count({ where: { code: null } });
  console.log(`Clients sans code: ${clientsSansCode}`);
  console.log(`Fournisseurs sans code: ${fournisseursSansCode}`);

}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
