const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx-prototype-pollution-fixed');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// On récupère le chemin depuis l'argument ou on cherche dans le dossier parent (kit d'installation)
let filePath = process.argv[2];
if (!filePath) {
  // Fallback intelligent : si on est dans C:\GestiCom\app\scripts, on cherche la quincaillerie dans le parent du parent
  filePath = path.join(__dirname, '..', '..', 'Quincaillerie ETB.xlsx');
}

async function main() {
  console.log('--- Démarrage de l\'importation Quincaillerie PRO (FIX) ---');
  console.log('Source :', filePath);
  
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
    
    // On vide TOUT sauf Utilisateur (qu'on va mettre à jour)
    const tables = [
      'VenteLigne', 'AchatLigne', 'TransfertLigne', 'Stock', 'Mouvement',
      'Vente', 'Achat', 'Transfert', 'Depense', 'Charge', 'EcritureComptable',
      'Produit', 'Magasin', 'Entite'
    ];

    for (const table of tables) {
      const tableName = table.charAt(0).toLowerCase() + table.slice(1);
      try {
          await prisma[tableName].deleteMany({});
      } catch (e) {}
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

    // 2. Rétablissement de l'Administrateur (ID 1)
    const hash = await bcrypt.hash('Admin@123', 10);
    const admin = await prisma.utilisateur.upsert({
      where: { id: 1 },
      update: {
        entiteId: entite.id,
        motDePasse: hash,
        nom: 'Administrateur',
        login: 'admin',
        actif: true
      },
      create: {
        id: 1,
        login: 'admin',
        nom: 'Administrateur',
        motDePasse: hash,
        role: 'SUPER_ADMIN',
        entiteId: entite.id,
        actif: true
      }
    });
    console.log('✅ Administrateur opérationnel (admin / Admin@123)');
    
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
