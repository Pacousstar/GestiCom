const Database = require('better-sqlite3');
const db = new Database('C:/gesticom/gesticom.db', { readonly: true });

try {
    const list = db.prepare(`SELECT a.id, a.date, a.montantTotal, f.nom FROM Achat a JOIN Fournisseur f ON a.fournisseurId = f.id`).all();
    console.log(JSON.stringify(list, null, 2));
} catch (err) {
    console.error(err);
} finally {
    db.close();
}
