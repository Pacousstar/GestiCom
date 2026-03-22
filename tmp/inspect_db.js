const Database = require('better-sqlite3');
const db = new Database('c:/Users/GSN EXPETISES  GROUP/Projets/gesticom2/prisma/gesticom.db', { readonly: true });

try {
    const info = db.prepare('PRAGMA table_info(Fournisseur)').all();
    console.log(JSON.stringify(info, null, 2));
} catch (err) {
    console.error(err);
} finally {
    db.close();
}
