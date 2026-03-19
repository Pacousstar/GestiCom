const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Configuration pour cibler la base ETB
const DATABASE_PATH = 'C:/GestiCom/app/data/etb.db';
process.env.DATABASE_URL = `file:${DATABASE_PATH}`;

const prisma = new PrismaClient();

async function razEtb() {
    console.log('--- GestiCom : NETTOYAGE BASE ETB (RAZ) ---');
    console.log(`Cible : ${DATABASE_PATH}`);

    // Sauvegarde de sécurité
    const backupPath = `${DATABASE_PATH}.backup_${Date.now()}`;
    try {
        if (fs.existsSync(DATABASE_PATH)) {
            fs.copyFileSync(DATABASE_PATH, backupPath);
            console.log(`📦 Sauvegarde de sécurité créée : ${backupPath}`);
        }
    } catch (e) {
        console.error('❌ Impossible de créer la sauvegarde :', e.message);
        return;
    }

    try {
        // 1. Désactiver les contraintes de clés étrangères
        await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF;');

        const tablesToClear = [
            'AuditLog',
            'EcritureComptable',
            'OperationBancaire',
            'Banque',
            'Caisse',
            'Mouvement',
            'VenteLigne',
            'Vente',
            'AchatLigne',
            'Achat',
            'TransfertLigne',
            'Transfert',
            'Stock',
            'QuantiteMagasin',
            'Charge',
            'Depense',
            'Produit'
        ];

        for (const table of tablesToClear) {
            try {
                const tableName = table.charAt(0).toLowerCase() + table.slice(1);
                if (prisma[tableName]) {
                    const count = await prisma[tableName].deleteMany({});
                    console.log(`✅ Table ${table} vidée (${count.count} lignes).`);
                }
            } catch (e) {
                console.warn(`⚠️ Table ${table} non trouvée ou erreur :`, e.message);
            }
        }

        // 2. Réactiver les contraintes
        await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
        
        console.log('\n--- RÉINITIALISATION ETB TERMINÉE ---');
        console.log('La base est maintenant prête pour une nouvelle importation de produits.');

    } catch (error) {
        console.error('❌ ERREUR LORS DU NETTOYAGE :', error);
    } finally {
        await prisma.$disconnect();
    }
}

razEtb();
