const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx-prototype-pollution-fixed');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
// On récupère le chemin depuis l'argument ou on utilise le chemin par défaut
const filePath = process.argv[2] || 'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM/Quincaillerie ETB.xlsx';

async function main() {
  console.log('--- Démarrage de l\'importation Quincaillerie PRO (FIX) ---');
  
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Fichier introuvable : ${filePath}`);
    }

    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`${rawData.length} lignes détectées dans le fichier Excel.`);

    // --- NETTOYAGE MASSIF (RAZ) ---
    console.log('--- Nettoyage de la base de données (RAZ) ---');
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');
    
    const tables = [
      'VenteLigne', 'AchatLigne', 'TransfertLigne', 'Stock', 'Mouvement',
      'Vente', 'Achat', 'Transfert', 'Depense', 'Charge', 'EcritureComptable',
      'Produit', 'Magasin', 'Entite'
    ];

    for (const table of tables) {
      const tableName = table.charAt(0).toLowerCase() + table.slice(1);
      try {
        await prisma[tableName].deleteMany({});
        console.log(`Table ${table} vidée.`);
      } catch (e) {
        console.log(`Note: Table ${table} non vidée ou inexistante (${e.message}).`);
      }
    }
    
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
    console.log('Base de données nettoyée avec succès.');

    // 1. Création Entité & Magasin par défaut
    const entite = await prisma.entite.create({
      data: {
        code: 'MM01',
        nom: 'GSN EXPERTISES GROUP',
        type: 'MAISON_MERE',
        localisation: 'Siège',
        active: true,
      }
    });

    const magasin = await prisma.magasin.create({
      data: {
        code: 'MAG01',
        nom: 'Magasin Principal',
        localisation: 'Siège',
        entiteId: entite.id,
        actif: true,
      }
    });

    // 2. Recherche d'un admin pour l'entité si nécessaire (mais ici on fait juste l'import produits)
    
    // 3. Regroupement par désignation (Dédoublonnage)
    const uniqueMap = new Map();
    for (const row of rawData) {
      const designation = (row['Désignation'] || row['Designation'] || row['Article'] || '').trim();
      const categorie = (row['Catégorie'] || row['Categorie'] || 'DIVERS').toUpperCase().trim();
      
      if (!designation) continue;

      const qte = parseFloat(row['Quantité'] || row['Qte'] || 0);
      const ach = parseFloat(row['Prix achat'] || row['Achat'] || 0);
      const ven = parseFloat(row['Prix vente'] || row['Vente'] || 0);

      if (uniqueMap.has(designation)) {
        const existing = uniqueMap.get(designation);
        existing.quantite += qte;
      } else {
        uniqueMap.set(designation, { categorie, prixAchat: ach, prixVente: ven, quantite: qte });
      }
    }

    console.log(`${uniqueMap.size} produits uniques à injecter.`);

    // 4. Injection avec Codes Intelligents
    let count = 0;
    const categoryCounters = {};

    for (const [designation, info] of uniqueMap.entries()) {
      let prefix = info.categorie.substring(0, 3).toUpperCase();
      if (prefix.length < 3) prefix = (prefix + 'XXX').substring(0, 3);
      
      categoryCounters[prefix] = (categoryCounters[prefix] || 0) + 1;
      const code = `${prefix}-${String(categoryCounters[prefix]).padStart(3, '0')}`;

      const produit = await prisma.produit.create({
        data: {
          code: code,
          designation: designation,
          categorie: info.categorie,
          prixAchat: info.prixAchat,
          prixVente: info.prixVente,
          actif: true,
          unite: 'U'
        }
      });

      // Stock initial
      await prisma.stock.create({
        data: {
          produitId: produit.id,
          magasinId: magasin.id,
          quantite: info.quantite,
          quantiteInitiale: info.quantite
        }
      });

      count++;
    }

    console.log(`--- Import terminé avec succès : ${count} produits injectés ---`);

  } catch (error) {
    console.error('Erreur lors de l\'importation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
