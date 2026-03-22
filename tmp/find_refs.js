const Database = require('better-sqlite3');
const db = new Database('c:/Users/GSN EXPETISES  GROUP/Projets/gesticom2/prisma/gesticom.db', { readonly: true });

const refs = ['A1774163725053', 'A1774163806946', 'A1774169616808', 'A1774085515407', 'A1774022286082'];

try {
    const list = db.prepare(`SELECT numero, date, montantTotal, fournisseurId, fournisseurLibre FROM Achat WHERE numero IN (${refs.map(r => `'${r}'`).join(',')})`).all();
    console.log(JSON.stringify(list, null, 2));
} catch (err) {
    console.error(err);
} finally {
    db.close();
}
