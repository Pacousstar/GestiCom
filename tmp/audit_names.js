const Database = require('better-sqlite3');

function audit(path) {
    console.log(`--- BASE: ${path} ---`);
    const db = new Database(path, { readonly: true });
    try {
        const fournisseurs = db.prepare(`SELECT nom FROM Fournisseur`).all();
        console.log('NOMS FOURNISSEURS:');
        fournisseurs.forEach(f => console.log(` - ${f.nom}`));

        const achatsLibres = db.prepare(`SELECT fournisseurLibre, date, montantTotal FROM Achat WHERE fournisseurLibre IS NOT NULL`).all();
        console.log('ACHATS LIBRES:');
        achatsLibres.forEach(a => console.log(` - ${a.fournisseurLibre} (${a.date}): ${a.montantTotal} F`));
        
        const matches = db.prepare(`SELECT a.date, a.montantTotal, f.nom FROM Achat a JOIN Fournisseur f ON a.fournisseurId = f.id WHERE f.nom LIKE '%D%' OR a.fournisseurLibre LIKE '%D%'`).all();
         console.log('MATCHES PROXIMITE (contient D):');
         matches.forEach(m => console.log(` - ${m.nom || m.fournisseurLibre} (${m.date}): ${m.montantTotal} F`));

    } catch (e) { console.error(e.message); }
    finally { db.close(); }
}

audit('C:/gesticom/gesticom.db');
audit('c:/Users/GSN EXPETISES  GROUP/Projets/gesticom2/prisma/gesticom.db');
