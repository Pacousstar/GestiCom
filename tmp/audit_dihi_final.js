const Database = require('better-sqlite3');
const db = new Database('C:/gesticom/gesticom.db', { readonly: true });

try {
    const dihi = db.prepare(`SELECT id, soldeInitial FROM Fournisseur WHERE nom LIKE '%DIHI%'`).get();
    console.log(`FOURNISSEUR DIHI ID: ${dihi.id}, SOLDE INITIAL: ${dihi.soldeInitial} F`);

    const achats = db.prepare(`
        SELECT numero, date, montantTotal, montantPaye, (montantTotal - montantPaye) as reste
        FROM Achat 
        WHERE fournisseurId = ?
        ORDER BY date ASC
    `).all(dihi.id);

    console.log('ACHATS DIHI EN DETAILS:');
    let totalReste = 0;
    achats.forEach(a => {
        const d = new Date(a.date).toLocaleDateString();
        console.log(` - ${a.numero} (${d}): Total ${a.montantTotal} F | Payé ${a.montantPaye} F | Reste ${a.reste} F`);
        totalReste += a.reste;
    });

    console.log(`SOMME DES RESTES SUR ACHATS: ${totalReste} F`);
    console.log(`FORMULE: (${totalReste} - ${dihi.soldeInitial}) = ${totalReste - dihi.soldeInitial} F`);

} catch (err) {
    console.error(err);
} finally {
    db.close();
}
