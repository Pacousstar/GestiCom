const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx-prototype-pollution-fixed');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// On cible la base de production
const dbDir = 'C:/gesticom';
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const dbPath = path.join(dbDir, 'gesticom.db');
const databaseUrl = `file:${dbPath}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

const FILENAME = 'Quincaillerie ETB.xlsx';
// On récupère le chemin depuis les arguments ou on cherche dans le dossier parent (racine de l'app ou clé USB)
let XLS_PATH = process.argv[2] || path.join(__dirname, '..', FILENAME);

// Vérification de secours si le chemin relatif échoue (cas installation Standalone)
if (!fs.existsSync(XLS_PATH)) {
  const standalonePath = path.join(process.cwd(), FILENAME);
  if (fs.existsSync(standalonePath)) {
    XLS_PATH = standalonePath;
  }
}

async function main() {
  console.log('🚀 Démarrage de l\'injection PROPRE Gesticom (v2)...');
  console.log(`📂 Source XLS : ${XLS_PATH}`);
  console.log(`🗄️ Cible DB : ${dbPath}`);

  if (!fs.existsSync(XLS_PATH)) {
    console.error('❌ Erreur : Fichier XLS introuvable.');
    process.exit(1);
  }

  // 1. Lire le XLS
  const workbook = XLSX.readFile(XLS_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

  // Filtrer les lignes vides (où la désignation est absente)
  const data = rawData.filter(row => {
    const designation = (row[' Désignation  '] || row['Désignation'] || '').trim();
    return designation !== '';
  });

  console.log(`📊 ${data.length} produits valides trouvés dans le XLS.`);

  // 2. Nettoyage TOTAL de la base
  console.log('🧹 Nettoyage de la base de données...');
  
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');
  
  try { await prisma.venteLigne.deleteMany({}); } catch (e) {}
  try { await prisma.vente.deleteMany({}); } catch (e) {}
  try { await prisma.achatLigne.deleteMany({}); } catch (e) {}
  try { await prisma.achat.deleteMany({}); } catch (e) {}
  try { await prisma.stock.deleteMany({}); } catch (e) {}
  try { await prisma.mouvement.deleteMany({}); } catch (e) {}
  try { await prisma.produit.deleteMany({}); } catch (e) {}
  try { await prisma.depense.deleteMany({}); } catch (e) {}
  try { await prisma.charge.deleteMany({}); } catch (e) {}
  try { await prisma.ecritureComptable.deleteMany({}); } catch (e) {}
  try { await prisma.magasin.deleteMany({}); } catch (e) {}
  try { await prisma.entite.deleteMany({}); } catch (e) {}
  try { await prisma.licence.deleteMany({}); } catch (e) {}

  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');

  // 3. Création Entité & Magasin
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
      nom: 'MAG01 Maison Mère',
      localisation: 'Siège',
      entiteId: entite.id,
      actif: true,
    }
  });

  // 4. Utilisateur Admin Correct (MDP: Admin@123)
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.utilisateur.upsert({
    where: { login: 'admin' },
    update: { 
      motDePasse: adminPassword, 
      entiteId: entite.id,
      actif: true,
      role: 'SUPER_ADMIN'
    },
    create: {
      login: 'admin',
      nom: 'Administrateur',
      email: 'admin@gesticom.local',
      motDePasse: adminPassword,
      role: 'SUPER_ADMIN',
      entiteId: entite.id,
      actif: true,
    }
  });

  // 5. Injection Produits avec DÉDOUBLONNAGE et DÉSIGNATION
  console.log('📥 Injection des produits (dédoublonnage + arrondis)...');
  const uniqueProduits = new Map();

  for (const row of data) {
    const designation = (row[' Désignation  '] || row['Désignation'] || '').trim();
    if (!designation) continue;

    const stockStr = String(row[' Stock final '] || row['Stock final'] || '0').replace(/[^0-9.-]/g, '');
    const stock = Math.round(parseFloat(stockStr)) || 0;

    const achStr = String(row[' Prix d\'achat (FCFA)  '] || row['Prix d\'achat (FCFA)'] || '0').replace(/[^0-9.-]/g, '');
    const ach = parseFloat(achStr) || 0;

    const venStr = String(row[' Prix Vente HT '] || row['Prix Vente HT'] || '0').replace(/[^0-9.-]/g, '');
    const ven = parseFloat(venStr) || 0;

    if (uniqueProduits.has(designation)) {
      // Si doublon, on cumule le stock
      const prod = uniqueProduits.get(designation);
      prod.stock += stock;
      console.log(`💡 Doublon détecté et fusionné : ${designation}`);
    } else {
      uniqueProduits.set(designation, { stock, ach, ven });
    }
  }

  let count = 0;
  for (const [designation, info] of uniqueProduits.entries()) {
    const code = `PROD-${String(count + 1).padStart(4, '0')}`;
    
    const produit = await prisma.produit.create({
      data: {
        code: code,
        designation: designation,
        categorie: 'DIVERS',
        prixAchat: info.ach,
        prixVente: info.ven,
        unite: 'U',
        actif: true
      }
    });

    await prisma.stock.create({
      data: {
        produitId: produit.id,
        magasinId: magasin.id,
        quantite: info.stock,
        quantiteInitiale: info.stock
      }
    });

    count++;
  }

  // 6. Paramètres par défaut
  await prisma.parametre.deleteMany({});
  await prisma.parametre.create({
    data: {
      nomEntreprise: 'GSN EXPERTISES GROUP',
      devise: 'FCFA',
      tvaParDefaut: 18,
      localisation: 'Siège',
      contact: 'Admin Gesticom'
    }
  });

  console.log(`✅ Injection terminée ! ${count} produits injectés.`);
}

main()
  .catch(e => {
    console.error('❌ Erreur fatale injection :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
