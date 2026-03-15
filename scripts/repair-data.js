const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repair() {
  console.log('--- REPARATION DES DONNEES GESTICOM ---');

  // 1. Réparer l'utilisateur orphelin
  const MM = await prisma.entite.findFirst({ where: { code: 'MM01' } });
  if (MM) {
    console.log(`Entité Maison Mère trouvée (ID=${MM.id}).`);
    const updateResult = await prisma.utilisateur.updateMany({
      where: { login: 'admin' },
      data: { entiteId: MM.id }
    });
    console.log(`${updateResult.count} utilisateur(s) admin rattaché(s) à MM01.`);
  } else {
    // Créer si absente (cas improbable après import)
    const newMM = await prisma.entite.create({
      data: { code: 'MM01', nom: 'MAISON MERE', type: 'MAISON_MERE', localisation: 'Siège' }
    });
    await prisma.utilisateur.updateMany({
      where: { login: 'admin' },
      data: { entiteId: newMM.id }
    });
    console.log(`Nouvelle Entité créée et admin rattaché.`);
  }

  // 2. Générer les mouvements de stock manquants (Initial Stock)
  console.log('Vérification des mouvements de stock...');
  const existingMouvs = await prisma.mouvement.count();
  if (existingMouvs === 0) {
    const stocks = await prisma.stock.findMany({
      where: { quantite: { gt: 0 } },
      include: { magasin: true }
    });
    
    console.log(`Génération de ${stocks.length} mouvements d'entrée initiale...`);
    const admin = await prisma.utilisateur.findFirst({ where: { login: 'admin' } });
    
    for (const s of stocks) {
      await prisma.mouvement.create({
        data: {
          type: 'ENTREE',
          quantite: s.quantite,
          produitId: s.produitId,
          magasinId: s.magasinId,
          entiteId: admin.entiteId,
          utilisateurId: admin.id,
          observation: 'Importation initiale automatique'
        }
      });
    }
    console.log('Mouvements générés avec succès.');
  } else {
    console.log('Des mouvements existent déjà, saut de la génération automatique.');
  }

  // 3. (Optionnel) Mise à jour des codes tiers existants pour le nouveau format ?
  // On le fera via l'API ou un script dédié si demandé.

  console.log('--- REPARATION TERMINEE ---');
}

repair()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
