const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx-prototype-pollution-fixed');
const { PrismaClient } = require('@prisma/client');

// Configuration pour cibler la base ETB
const DATABASE_PATH = 'C:/GestiCom/app/data/etb.db';
process.env.DATABASE_URL = `file:${DATABASE_PATH}`;
const prisma = new PrismaClient();

// Chemin du fichier Excel (passé en argument ou par défaut)
const EXCEL_PATH = process.argv[2] || path.join('C:', 'Users', 'GSN EXPETISES  GROUP', 'Projets', 'Client_ETB', 'data', 'Quincaillerie ETB.xlsx');

async function main() {
  console.log('🚀 Démarrage de l\'importation v2 pour ETB...');
  console.log(`Cible DB : ${DATABASE_PATH}`);
  console.log(`Fichier Excel : ${EXCEL_PATH}`);

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('❌ Erreur : Le fichier Excel est introuvable à ce chemin.');
    process.exit(1);
  }

  // 1. Charger l'Excel
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  console.log(`📦 ${data.length} lignes détectées dans le fichier Excel.`);

  // 2. Récupérer l'entité et le magasin par défaut (ou créer)
  let entite = await prisma.entite.findFirst();
  if (!entite) {
    entite = await prisma.entite.create({
      data: { code: 'MM01', nom: 'Siège ETB', type: 'MAISON_MERE', localisation: 'Site ETB' }
    });
  }

  let magasin = await prisma.magasin.findFirst();
  if (!magasin) {
    magasin = await prisma.magasin.create({
      data: { code: 'MAG01', nom: 'Magasin ETB', localisation: entite.localisation, entiteId: entite.id }
    });
  }

  // 3. Boucle d'importation
  let count = 0;
  for (const item of data) {
    // Mapping strict pour "Valeur de stock par produit2.xls"
    const designation = item['Libellé'] || item['Libelle'];
    const categorieNom = item['Famille'] || 'DIVERS';
    const quantite = parseInt(item['Quantité'] || item['Quantite'] || 0);
    const prixAchat = parseFloat(item['Prix Achat HT'] || 0);
    const prixVente = parseFloat(item['Prix Vente HT'] || 0);
    const seuilMin = 5;

    if (!designation) continue;

    // Génération automatique du code (séquentiel ETB-XXXXX)
    const codeProduit = `ETB-${String(count + 1).padStart(5, '0')}`;

    try {
      // Création/Maj du produit
      const produit = await prisma.produit.upsert({
        where: { code: codeProduit },
        update: {
          designation: designation.trim(),
          categorie: categorieNom.trim(),
          prixAchat: prixAchat,
          prixVente: prixVente,
          seuilMin: seuilMin,
          unite: 'unite',
          actif: true,
        },
        create: {
          code: codeProduit,
          designation: designation.trim(),
          categorie: categorieNom.trim(),
          prixAchat: prixAchat,
          prixVente: prixVente,
          seuilMin: seuilMin,
          unite: 'unite',
          actif: true,
        }
      });

      // Initialisation du stock
      await prisma.stock.upsert({
        where: { produitId_magasinId: { produitId: produit.id, magasinId: magasin.id } },
        update: { quantite: quantite, quantiteInitiale: quantite },
        create: { produitId: produit.id, magasinId: magasin.id, quantite: quantite, quantiteInitiale: quantite }
      });

      count++;
      if (count % 50 === 0) console.log(`✅ Progress: ${count}/${data.length}...`);
    } catch (error) {
      console.error(`❌ Erreur sur le produit ${designation}:`, error.message);
    }
  }

  console.log(`\n✨ IMPORTATION ETB TERMINÉE !`);
  console.log(`Bilan : ${count} produits injectés sur ${data.length} lignes.`);
}

main()
  .catch(e => console.error('💥 ERREUR FATALE:', e))
  .finally(() => prisma.$disconnect());
