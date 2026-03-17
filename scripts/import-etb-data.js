/**
 * Script d'importation spécifique pour Quincaillerie ETB
 * Lit le fichier ProduitsETB.xlsx et injecte les données dans C:/gesticom/gesticom.db
 */

const path = require('path');
const xlsx = require('xlsx-prototype-pollution-fixed');
const { PrismaClient } = require('@prisma/client');

// Configuration de la base de données de PRODUCTION
process.env.DATABASE_URL = "file:C:/gesticom/gesticom.db";
const prisma = new PrismaClient();

const EXCEL_PATH = path.join('C:', 'Users', 'GSN EXPETISES  GROUP', 'Projets', 'INSTALLATION_GESTICOM_client_ETB', 'ProduitsETB.xlsx');

async function main() {
  console.log('🚀 Démarrage de l\'importation ETB...');
  
  // 1. Charger l'Excel
  const workbook = xlsx.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  console.log(`📦 ${data.length} lignes détectées dans le fichier Excel.`);

  // 2. Récupérer l'entité et le magasin par défaut
  let entite = await prisma.entite.findFirst();
  if (!entite) {
    entite = await prisma.entite.create({
      data: {
        code: 'MM01',
        nom: 'Maison Mère',
        type: 'MAISON_MERE',
        localisation: 'Siège',
      }
    });
  }

  let magasin = await prisma.magasin.findFirst({ where: { code: 'MAG01' } });
  if (!magasin) {
    magasin = await prisma.magasin.create({
      data: {
        code: 'MAG01',
        nom: 'Magasin 01',
        localisation: entite.localisation,
        entiteId: entite.id,
      }
    });
  }

  // 3. Boucler sur les données
  let count = 0;
  for (const item of data) {
    const designation = item['Désignation'] || item['Designation'];
    const categorieNom = item['Catégorie'] || item['Categorie'] || 'DIVERS';
    const quantite = parseInt(item['Quantité'] || item['Quantite'] || 0);
    const prixAchat = parseFloat(item['Prix Achat'] || item['PrixAchat'] || 0);
    const prixVente = parseFloat(item['Prix Vente'] || item['PrixVente'] || 0);

    if (!designation) continue;

    const codeProduit = `ETB-${String(count + 1).padStart(4, '0')}`;

    try {
      // Création/Maj du produit
      const produit = await prisma.produit.upsert({
        where: { code: codeProduit },
        update: {
          designation: designation,
          categorie: categorieNom,
          prixAchat: prixAchat,
          prixVente: prixVente,
        },
        create: {
          code: codeProduit,
          designation: designation,
          categorie: categorieNom,
          prixAchat: prixAchat,
          prixVente: prixVente,
          unite: 'unite',
          actif: true,
        }
      });

      // Initialisation du stock
      await prisma.stock.upsert({
        where: {
          produitId_magasinId: {
            produitId: produit.id,
            magasinId: magasin.id
          }
        },
        update: {
          quantite: quantite,
          quantiteInitiale: quantite
        },
        create: {
          produitId: produit.id,
          magasinId: magasin.id,
          quantite: quantite,
          quantiteInitiale: quantite
        }
      });

      count++;
      if (count % 50 === 0) console.log(`✅ Importé ${count}/${data.length}...`);
    } catch (error) {
      console.error(`❌ Erreur sur le produit ${designation}:`, error.message);
    }
  }

  console.log(`\n✨ IMPORTATION TERMINÉE !`);
  console.log(`Total : ${count} produits injectés avec succès.`);
}

main()
  .catch(e => console.error('💥 ERREUR FATALE:', e))
  .finally(() => prisma.$disconnect());
