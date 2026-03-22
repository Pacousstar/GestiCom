const Database = require('better-sqlite3');
const db = new Database('C:/gesticom/gesticom.db', { readonly: true });

const query = `
SELECT a.id, a.numero, a.date, a.montantTotal, a.montantPaye, a.statutPaiement
FROM Achat a
JOIN Fournisseur f ON a.fournisseurId = f.id
WHERE f.nom LIKE '%DIHI%'
  AND a.date >= '2026-03-20'
  AND a.date <= '2026-03-22 23:59:59'
ORDER BY a.date ASC;
`;

try {
    const rows = db.prepare(query).all();
    console.log('RESULTAT_ACHATS_DIHI_START');
    console.log(JSON.stringify(rows, null, 2));
    console.log('RESULTAT_ACHATS_DIHI_END');
} catch (err) {
    console.error(err);
} finally {
    db.close();
}
