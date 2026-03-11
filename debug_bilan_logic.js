const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugBilan() {
  try {
    const annee = 2026;
    const finAnnee = new Date(annee, 11, 31, 23, 59, 59);

    console.log('--- DEBUG BILAN 2026 ---');
    console.log('Date limite:', finAnnee.toISOString());

    const ecritures = await prisma.ecritureComptable.findMany({
      where: {
        date: { lte: finAnnee }
      },
      include: {
        compte: true
      }
    });

    console.log('Nombre d\'écritures trouvées pour <= 2026:', ecritures.length);
    
    if (ecritures.length > 0) {
        const sample = ecritures[0];
        console.log('Exemple écriture:', {
            date: sample.date.toISOString(),
            compte: sample.compte.numero,
            debit: sample.debit,
            credit: sample.credit
        });
    }

    const comptes = await prisma.planCompte.findMany({
        where: { actif: true },
        include: {
            ecritures: {
                where: {
                    date: { lte: finAnnee }
                }
            }
        }
    });

    const balances = comptes.map(c => {
        const d = c.ecritures.reduce((s, e) => s + e.debit, 0);
        const cr = c.ecritures.reduce((s, e) => s + e.credit, 0);
        return { n: c.numero, solde: d - cr, nb: c.ecritures.length };
    }).filter(b => b.nb > 0);

    console.log('Balances calculées:', balances);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

debugBilan();
