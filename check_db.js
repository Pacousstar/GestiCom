const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const counts = {
      ventes: await prisma.vente.count(),
      achats: await prisma.achat.count(),
      ecritures: await prisma.ecritureComptable.count(),
      comptes: await prisma.planCompte.count(),
      journaux: await prisma.journal.count(),
    };
    console.log('Counts:', JSON.stringify(counts, null, 2));
    
    if (counts.ecritures > 0) {
      const sampleEcritures = await prisma.ecritureComptable.findMany({
        take: 5,
        include: { compte: true }
      });
      console.log('Sample Ecritures:', JSON.stringify(sampleEcritures, null, 2));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
