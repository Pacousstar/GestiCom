const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repairOrphans() {
  console.log('🔧 Réparation des données orphelines (Entité 13)...');

  const firstEntite = await prisma.entite.findFirst({ select: { id: true } });
  if (!firstEntite) {
    console.error('❌ Aucune entité valide trouvée en base pour la réparation.');
    return;
  }

  const validId = firstEntite.id;
  console.log(`✅ ID d'entité valide trouvé : ${validId}`);

  const tables = ['mouvement', 'vente', 'achat', 'client', 'fournisseur', 'depense', 'utilisateur', 'produit', 'magasin'];

  for (const table of tables) {
    try {
      const count = await prisma[table].count({ where: { entiteId: 13 } });
      if (count > 0) {
        console.log(`   - Table ${table} : ${count} enregistrements à réparer.`);
        await prisma[table].updateMany({
          where: { entiteId: 13 },
          data: { entiteId: validId }
        });
        console.log(`   - Table ${table} : Réparation terminée.`);
      }
    } catch (err) {
      // Certaines tables pourraient ne pas avoir de entiteId ou avoir un nom différent
      console.log(`   - Table ${table} : Ignorée (pas de entiteId ou erreur)`);
    }
  }

  console.log('✅ Base de données réparée !');
}

repairOrphans()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
