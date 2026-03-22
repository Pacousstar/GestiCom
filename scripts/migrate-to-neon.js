const { PrismaClient } = require('@prisma/client');
const Database = require('better-sqlite3');

const prisma = new PrismaClient();
const db = new Database('C:/gesticom/gesticom.db');

async function migrate() {
  console.log('🚀 Démarrage de la migration SQLite -> Neon...');

  try {
    // 1. Entités
    console.log('📦 Migration Entite...');
    const entites = db.prepare('SELECT * FROM Entite').all();
    for (const row of entites) {
      await prisma.entite.upsert({
        where: { id: row.id },
        update: { ...row, active: !!row.active, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) },
        create: { ...row, active: !!row.active, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }
      });
    }

    // 2. Utilisateurs
    console.log('📦 Migration Utilisateur...');
    const users = db.prepare('SELECT * FROM Utilisateur').all();
    for (const row of users) {
      await prisma.utilisateur.upsert({
        where: { id: row.id },
        update: { ...row, actif: !!row.actif, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) },
        create: { ...row, actif: !!row.actif, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }
      });
    }

    // 3. Magasins
    console.log('📦 Migration Magasin...');
    const magasins = db.prepare('SELECT * FROM Magasin').all();
    for (const row of magasins) {
      await prisma.magasin.upsert({
        where: { id: row.id },
        update: { ...row, actif: !!row.actif, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) },
        create: { ...row, actif: !!row.actif, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }
      });
    }

    // 4. Produits
    console.log('📦 Migration Produit...');
    const produits = db.prepare('SELECT * FROM Produit').all();
    for (const row of produits) {
      await prisma.produit.upsert({
        where: { id: row.id },
        update: { ...row, actif: !!row.actif, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) },
        create: { ...row, actif: !!row.actif, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }
      });
    }

    // 5. Stocks
    console.log('📦 Migration Stock...');
    const stocks = db.prepare('SELECT * FROM Stock').all();
    for (const row of stocks) {
      await prisma.stock.upsert({
        where: { id: row.id },
        update: { ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) },
        create: { ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }
      });
    }

    // 6. Clients
    console.log('📦 Migration Client...');
    const clients = db.prepare('SELECT * FROM Client').all();
    for (const row of clients) {
      await prisma.client.upsert({
        where: { id: row.id },
        update: { ...row, actif: !!row.actif, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) },
        create: { ...row, actif: !!row.actif, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }
      });
    }

    // 7. Fournisseurs
    console.log('📦 Migration Fournisseur...');
    const fournisseurs = db.prepare('SELECT * FROM Fournisseur').all();
    for (const row of fournisseurs) {
      await prisma.fournisseur.upsert({
        where: { id: row.id },
        update: { ...row, actif: !!row.actif, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) },
        create: { ...row, actif: !!row.actif, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) }
      });
    }

    // 8. Ventes
    console.log('📦 Migration Vente...');
    const ventes = db.prepare('SELECT * FROM Vente').all();
    for (const row of ventes) {
      await prisma.vente.upsert({
        where: { id: row.id },
        update: { 
          ...row, 
          date: new Date(row.date), 
          createdAt: new Date(row.createdAt),
          estHistorique: !!row.estHistorique 
        },
        create: { 
          ...row, 
          date: new Date(row.date), 
          createdAt: new Date(row.createdAt),
          estHistorique: !!row.estHistorique
        }
      });
    }

    // 9. VenteLignes
    console.log('📦 Migration VenteLigne...');
    await prisma.venteLigne.deleteMany(); 
    const venteLignes = db.prepare('SELECT * FROM VenteLigne').all();
    // Batch de 50 pour éviter les limites de taille de requête
    for (let i = 0; i < venteLignes.length; i += 50) {
      const batch = venteLignes.slice(i, i + 50);
      await prisma.venteLigne.createMany({ data: batch });
    }

    // 10. Achats
    console.log('📦 Migration Achat...');
    const achats = db.prepare('SELECT * FROM Achat').all();
    for (const row of achats) {
      await prisma.achat.upsert({
        where: { id: row.id },
        update: { ...row, date: new Date(row.date), createdAt: new Date(row.createdAt) },
        create: { ...row, date: new Date(row.date), createdAt: new Date(row.createdAt) }
      });
    }

    // 11. AchatLignes
    console.log('📦 Migration AchatLigne...');
    await prisma.achatLigne.deleteMany();
    const achatLignes = db.prepare('SELECT * FROM AchatLigne').all();
    for (let i = 0; i < achatLignes.length; i += 50) {
      const batch = achatLignes.slice(i, i + 50);
      await prisma.achatLigne.createMany({ data: batch });
    }

    // 12. ReglementsVente
    console.log('📦 Migration ReglementVente...');
    const regVentes = db.prepare('SELECT * FROM ReglementVente').all();
    for (const row of regVentes) {
      await prisma.reglementVente.upsert({
        where: { id: row.id },
        update: { ...row, date: new Date(row.date), createdAt: new Date(row.createdAt) },
        create: { ...row, date: new Date(row.date), createdAt: new Date(row.createdAt) }
      });
    }

    // 13. ReglementsAchat
    console.log('📦 Migration ReglementAchat...');
    const regAchats = db.prepare('SELECT * FROM ReglementAchat').all();
    for (const row of regAchats) {
      await prisma.reglementAchat.upsert({
        where: { id: row.id },
        update: { ...row, date: new Date(row.date), createdAt: new Date(row.createdAt) },
        create: { ...row, date: new Date(row.date), createdAt: new Date(row.createdAt) }
      });
    }

    // 14. Mouvements
    console.log('📦 Migration Mouvement...');
    const mouvements = db.prepare('SELECT * FROM Mouvement').all();
    for (const row of mouvements) {
      await prisma.mouvement.upsert({
        where: { id: row.id },
        update: { ...row, date: new Date(row.date), createdAt: new Date(row.createdAt) },
        create: { ...row, date: new Date(row.date), createdAt: new Date(row.createdAt) }
      });
    }

    // 15. Dépenses
    console.log('📦 Migration Depense...');
    const depenses = db.prepare('SELECT * FROM Depense').all();
    for (const row of depenses) {
      await prisma.depense.upsert({
        where: { id: row.id },
        update: { ...row, date: new Date(row.date), createdAt: new Date(row.createdAt) },
        create: { ...row, date: new Date(row.date), createdAt: new Date(row.createdAt) }
      });
    }

    // 16. Paramètres
    console.log('📦 Migration Parametre...');
    const params = db.prepare('SELECT * FROM Parametre').all();
    for (const row of params) {
      await prisma.parametre.upsert({
        where: { id: row.id },
        update: { 
          ...row, 
          updatedAt: new Date(row.updatedAt),
          backupAuto: !!row.backupAuto,
          fideliteActive: !!row.fideliteActive
        },
        create: { 
          ...row, 
          updatedAt: new Date(row.updatedAt),
          backupAuto: !!row.backupAuto,
          fideliteActive: !!row.fideliteActive
        }
      });
    }

    console.log('✅ Migration terminée avec succès !');
  } catch (error) {
    console.error('❌ Erreur pendant la migration :', error);
  } finally {
    db.close();
    await prisma.$disconnect();
  }
}

migrate();
