const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  console.log('--- START DIAGNOSTIC ---');
  try {
    const entites = await p.entite.findMany();
    console.log('Entities in DB:', JSON.stringify(entites, null, 2));

    const e13 = await p.mouvement.count({ where: { entiteId: 13 } });
    const v13 = await p.vente.count({ where: { entiteId: 13 } });
    const u13 = await p.utilisateur.count({ where: { entiteId: 13 } });
    console.log('Counts with entiteId=13:', { mouvement: e13, vente: v13, utilisateur: u13 });

    const totalMouv = await p.mouvement.count();
    console.log('Total Mouvements:', totalMouv);
    
    if (totalMouv > 0) {
      const sample = await p.mouvement.findFirst({ orderBy: { id: 'desc' } });
      console.log('Last Mouvement:', JSON.stringify(sample, null, 2));
    }

  } catch (e) {
    console.error('Diagnostic error:', e);
  } finally {
    await p.$disconnect();
    console.log('--- END DIAGNOSTIC ---');
  }
}

check();
