const Database = require('better-sqlite3');
const db = new Database('c:/Users/GSN EXPETISES  GROUP/Projets/gesticom2/prisma/gesticom.db', { readonly: true });

try {
    const list = db.prepare(`SELECT id, date, montantTotal, fournisseurId, fournisseurLibre FROM Achat`).all();
    console.log(JSON.stringify(list, null, 2));
} catch (err) {
    console.error(err);
} finally {
    db.close();
}
