const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function razPro() {
    console.log('--- GestiCom : NETTOYAGE PROFESSIONNEL (RAZ) ---');
    console.log('Objectif : Préparer la base pour un nouveau client.');

    try {
        // 1. Désactiver les contraintes de clés étrangères pour un nettoyage propre (SQLite spécifique)
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
            'Charge',
            'Depense',
            'Produit',
            'Client',
            'Fournisseur',
            'DashboardPreference'
        ];

        for (const table of tablesToClear) {
            try {
                const count = await prisma[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany({});
                console.log(`✅ Table ${table} vuidée (${count.count} lignes).`);
            } catch (e) {
                console.warn(`⚠️ Table ${table} non trouvée ou erreur :`, e.message);
            }
        }

        // 2. Réinitialisation des Paramètres (sauf logo optionnel)
        await prisma.parametre.updateMany({
            data: {
                nomEntreprise: "NOUVELLE ENTREPRISE",
                slogan: "",
                contact: "",
                localisation: "",
                numNCC: "",
                typeCommerce: "GENERAL"
            }
        });
        console.log('✅ Paramètres entreprise réinitialisés.');

        // 3. Réinitialisation des noms des Entités et Magasins par défaut (sans supprimer les IDs)
        await prisma.entite.updateMany({
            data: { nom: "SIÈGE SOCIAL", localisation: "Ville" }
        });
        await prisma.magasin.updateMany({
            data: { nom: "MAGASIN PRINCIPAL", localisation: "Siège" }
        });
        console.log('✅ Structure Entité/Magasin prête (noms génériques).');

        // 4. Réactiver les contraintes
        await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
        
        console.log('\n--- RÉINITIALISATION TERMINÉE AVEC SUCCÈS ---');
        console.log('Note : Les comptes utilisateurs et la licence ont été conservés.');

    } catch (error) {
        console.error('❌ ERREUR LORS DU NETTOYAGE :', error);
    } finally {
        await prisma.$disconnect();
    }
}

razPro();
