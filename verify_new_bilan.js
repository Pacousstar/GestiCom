const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateNewApi() {
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
        return { numero: compte.numero, libelle: compte.libelle, solde };
    }).filter(c => c.solde !== 0);

    const bilan = {
        actif: { immobilise: [], stocks: [], creances: [], tresorerie: [], total: 0 },
        passif: { capitaux: [], dettes: [], tresorerie: [], total: 0 }
    };

    let totalProduits = 0;
    let totalCharges = 0;

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
        else if (c.numero.startsWith('7')) totalProduits += Math.abs(c.solde);
        else if (c.numero.startsWith('6')) totalCharges += Math.abs(c.solde);
    });

    bilan.actif.total = [...bilan.actif.immobilise, ...bilan.actif.stocks, ...bilan.actif.creances, ...bilan.actif.tresorerie].reduce((s, x) => s + x.montant, 0);
    bilan.passif.total = [...bilan.passif.capitaux, ...bilan.passif.dettes, ...bilan.passif.tresorerie].reduce((s, x) => s + x.montant, 0);

    const resultatNet = totalProduits - totalCharges;
    if (resultatNet !== 0) {
        bilan.passif.capitaux.push({
            numero: '13',
            libelle: resultatNet > 0 ? 'RÉSULTAT NET : BÉNÉFICE' : 'RÉSULTAT NET : PERTE',
            montant: Math.abs(resultatNet),
            isResultat: true
        });
        bilan.passif.total += Math.abs(resultatNet);
    }

    console.log('--- SIMULATION NEW API (FIXED) ---');
    console.log('Bilan:', JSON.stringify(bilan, null, 2));
    console.log('Actif Total:', bilan.actif.total);
    console.log('Passif Total:', bilan.passif.total);
    console.log('Equilibre (doit être 0):', bilan.actif.total - bilan.passif.total);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

simulateNewApi();
