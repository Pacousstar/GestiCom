const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx-prototype-pollution-fixed');
const path = require('path');

const prisma = new PrismaClient();
const filePath = 'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM/Quincaillerie ETB.xlsx';

async function main() {
  console.log('--- Démarrage de l\'importation Quincaillerie PRO ---');
  
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`${data.length} produits détectés dans le fichier Excel.`);

    // --- NETTOYAGE MASSIF (RAZ) ---
    console.log('--- Nettoyage de la base de données (RAZ) ---');
    await prisma.stock.deleteMany({});
    await prisma.mouvement.deleteMany({});
    await prisma.venteLigne.deleteMany({});
    await prisma.achatLigne.deleteMany({});
    await prisma.transfertLigne.deleteMany({});
    await prisma.vente.deleteMany({});
    await prisma.achat.deleteMany({});
    await prisma.transfert.deleteMany({});
    await prisma.produit.deleteMany({});
    console.log('Base de données nettoyée avec succès.');

    // 1. Récupérer ou créer un magasin par défaut
    let magasin = await prisma.magasin.findFirst();
    if (!magasin) {
      magasin = await prisma.magasin.create({
        data: { code: 'MAG-01', nom: 'Magasin Principal' }
      });
    }

    // 2. Récupérer ou créer un utilisateur (admin) pour les mouvements
    const admin = await prisma.utilisateur.findFirst({ 
      where: { 
        OR: [
          { role: 'ADMIN' },
          { role: 'SUPER_ADMIN' }
        ]
      } 
    });
    if (!admin) throw new Error('Aucun administrateur trouvé');

    let countNew = 0;
    let countUpdate = 0;

    // Map pour suivre les indices de code par catégorie (ex: TOL -> 1, TOL -> 2)
    const categoryCounters = {};

    for (const row of data) {
      const designantion = row['Désignation'] || row['Designation'] || row['Article'];
      const categorie = (row['Catégorie'] || row['Categorie'] || 'DIVERS').toUpperCase().trim();
      const prixAchat = parseFloat(row['Prix Achat'] || row['Achat'] || 0);
      const prixVente = parseFloat(row['Prix Vente'] || row['Vente'] || 0);
      const qteBase = parseFloat(row['Quantité'] || row['Qte'] || 0);

      if (!designantion) continue;

      // Génération du code intelligent
      let prefix = categorie.substring(0, 3).toUpperCase();
      if (prefix.length < 3) prefix = (prefix + 'XXX').substring(0, 3);
      
      if (!categoryCounters[prefix]) {
        // Chercher le dernier code existant avec ce préfixe en DB
        const lastProduct = await prisma.produit.findFirst({
          where: { code: { startsWith: prefix } },
          orderBy: { code: 'desc' }
        });
        
        if (lastProduct && lastProduct.code.includes('-')) {
          const num = parseInt(lastProduct.code.split('-')[1]);
          categoryCounters[prefix] = isNaN(num) ? 0 : num;
        } else {
          categoryCounters[prefix] = 0;
        }
      }

      // Chercher si le produit existe déjà par désignation
      let produit = await prisma.produit.findFirst({
        where: { designation: designantion }
      });

      if (!produit) {
        // Nouveau produit
        categoryCounters[prefix]++;
        const code = `${prefix}-${String(categoryCounters[prefix]).padStart(3, '0')}`;
        
        produit = await prisma.produit.create({
          data: {
            code: code,
            designation: designantion,
            categorie: categorie,
            prixAchat: prixAchat,
            prixVente: prixVente,
            actif: true
          }
        });
        countNew++;

        // Créer le stock initial
        await prisma.stock.create({
          data: {
            produitId: produit.id,
            magasinId: magasin.id,
            quantite: qteBase
          }
        });

        // Tracer le mouvement d'entrée initiale
        if (qteBase > 0) {
          await prisma.mouvement.create({
            data: {
              type: 'ENTREE',
              quantite: qteBase,
              produitId: produit.id,
              magasinId: magasin.id,
              entiteId: admin.entiteId,
              utilisateurId: admin.id,
              observation: 'Importation initiale Quincaillerie'
            }
          });
        }
      } else {
        // Mise à jour si nécessaire
        await prisma.produit.update({
          where: { id: produit.id },
          data: {
            prixAchat: prixAchat || produit.prixAchat,
            prixVente: prixVente || produit.prixVente,
            categorie: categorie || produit.categorie
          }
        });
        countUpdate++;
      }
    }

    console.log(`--- Import terminé ---`);
    console.log(`Nouveaux produits: ${countNew}`);
    console.log(`Produits mis à jour: ${countUpdate}`);

  } catch (error) {
    console.error('Erreur lors de l\'importation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
