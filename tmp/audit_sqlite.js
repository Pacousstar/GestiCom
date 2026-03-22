const Database = require('better-sqlite3');
const db = new Database('c:/Users/GSN EXPETISES  GROUP/Projets/gesticom2/prisma/gesticom.db', { readonly: true });

const query = `
SELECT f.nom, f.soldeInitial, f.actif,
       COALESCE(SUM(a.montantTotal), 0) as total_achats, 
       COALESCE(SUM(a.montantPaye), 0) as total_paye
FROM Fournisseur f
LEFT JOIN Achat a ON f.id = a.fournisseurId
GROUP BY f.id, f.nom, f.soldeInitial, f.actif
ORDER BY f.nom;
`;

const globalStats = `SELECT COUNT(*) as nbAchats, SUM(montantTotal) as total FROM Achat`;

try {
    const stats = db.prepare(globalStats).get();
    console.log(`STATS GLOBALES: ${stats.nbAchats} achats pour un total de ${stats.total} F`);
    
    const rows = db.prepare(query).all();
    console.log('RESULTAT_AUDIT_START');
    rows.forEach(f => {
        const resteAchats = f.total_achats - f.total_paye;
        const detteTotale = resteAchats - f.soldeInitial;
        
        console.log(`Fournisseur: ${f.nom} (Actif: ${f.actif === 1})`);
        console.log(`  - Dette Initiale: ${f.soldeInitial} F`);
        console.log(`  - Total Achats: ${f.total_achats} F`);
        console.log(`  - Total Payé: ${f.total_paye} F`);
        console.log(`  - Reste à payer: ${resteAchats} F`);
        console.log(`  - DETTE CALCULÉE = ${detteTotale} F`);
        console.log('---');
    });
    console.log('RESULTAT_AUDIT_END');
} catch (err) {
    console.error(err);
} finally {
    db.close();
}
