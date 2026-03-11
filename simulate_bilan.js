const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateApi() {
  try {
    const annee = 2026;
    const finAnnee = new Date(annee, 11, 31, 23, 59, 59);

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

    const accountsWithBalances = comptes.map(compte => {
        const totalDebit = compte.ecritures.reduce((sum, e) => sum + e.debit, 0);
        const totalCredit = compte.ecritures.reduce((sum, e) => sum + e.credit, 0);
        const solde = totalDebit - totalCredit;
        return {
            numero: compte.numero,
            libelle: compte.libelle,
            solde
        };
    }).filter(c => c.solde !== 0);

    const bilan = {
        actif: { immobilise: [], stocks: [], creances: [], tresorerie: [], total: 0 },
        passif: { capitaux: [], dettes: [], tresorerie: [], total: 0 }
    };

    accountsWithBalances.forEach(c => {
        const p = { numero: c.numero, libelle: c.libelle, montant: Math.abs(c.solde) };
        if (c.numero.startsWith('2')) bilan.actif.immobilise.push(p);
        else if (c.numero.startsWith('3')) bilan.actif.stocks.push(p);
        else if (c.numero.startsWith('4')) {
            if (c.solde > 0) bilan.actif.creances.push(p);
            else bilan.passif.dettes.push(p);
        } else if (c.numero.startsWith('5')) {
            if (c.solde > 0) bilan.actif.tresorerie.push(p);
            else bilan.passif.tresorerie.push(p);
        } else if (c.numero.startsWith('1')) bilan.passif.capitaux.push(p);
    });

    bilan.actif.total = [...bilan.actif.immobilise, ...bilan.actif.stocks, ...bilan.actif.creances, ...bilan.actif.tresorerie].reduce((s, x) => s + x.montant, 0);
    bilan.passif.total = [...bilan.passif.capitaux, ...bilan.passif.dettes, ...bilan.passif.tresorerie].reduce((s, x) => s + x.montant, 0);

    const resultat = bilan.actif.total - bilan.passif.total;
    console.log('Final Bilan Object:', JSON.stringify(bilan, null, 2));
    console.log('Resultat calculated:', resultat);
    console.log('Accounts contributing:', accountsWithBalances);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

simulateApi();
