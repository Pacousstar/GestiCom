const Database = require('better-sqlite3');
const db = new Database('c:/Users/GSN EXPETISES  GROUP/Projets/gesticom2/prisma/gesticom.db', { readonly: true });

const query = `
SELECT a.id, a.date, a.montantTotal, a.montantPaye, a.statutPaiement, f.nom
FROM Achat a
JOIN Fournisseur f ON a.fournisseurId = f.id
WHERE f.nom LIKE '%DIHI%'
ORDER BY a.date ASC;
`;

try {
    const list = db.prepare(query).all();
    console.log(JSON.stringify(list, null, 2));
} catch (err) {
    console.error(err);
} finally {
    db.close();
}
