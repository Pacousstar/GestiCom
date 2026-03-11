const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const comptes = await prisma.planCompte.findMany({
      include: {
        ecritures: true
      }
    });
    
    const results = comptes.map(c => {
      const debit = c.ecritures.reduce((s, e) => s + e.debit, 0);
      const credit = c.ecritures.reduce((s, e) => s + e.credit, 0);
      return {
        numero: c.numero,
        libelle: c.libelle,
        debit,
        credit,
        solde: debit - credit
      };
    }).filter(r => r.debit !== 0 || r.credit !== 0);
    
    console.log('Account Balances:', JSON.stringify(results, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
