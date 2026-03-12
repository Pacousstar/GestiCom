import { prisma } from '../lib/db'
import { getHardwareId, generateLicenseKey, verifyLicenseKey } from '../lib/security'
import crypto from 'crypto'

async function runTests() {
    console.log('🚀 Démarrage de l\'auto-test GestiCom...\n')

    try {
        // --- 1. TEST SÉCURITÉ (HWID & LICENCE) ---
        console.log('--- [1/4] Test Sécurité Hardware ID ---')
        const hwid = await getHardwareId()
        console.log(`[OK] HWID généré : ${hwid}`)
        
        const key = generateLicenseKey(hwid)
        console.log(`[OK] Clé générée : ${key}`)
        
        const isValid = verifyLicenseKey(hwid, key)
        if (!isValid) throw new Error('Échec de la validation de la clé de licence !')
        console.log('[SUCCÈS] Validation HWID/Licence réussie.\n')

        // --- 2. TEST PERSISTANCE & ENREGISTREMENTS ---
        console.log('--- [2/4] Test Enregistrements & Persistance ---')
        
        // Nettoyage partiel pour le test (uniquement données de test anonymes)
        const testSuffix = '-TEST-' + crypto.randomBytes(4).toString('hex')
        
        // Création d'une entité et d'un magasin de test
        const entite = await prisma.entite.create({
            data: {
                code: 'ENT' + testSuffix,
                nom: 'Entité Test',
                type: 'MAISON_MERE',
                localisation: 'Test City'
            }
        })

        const magasin = await prisma.magasin.create({
            data: {
                code: 'MAG' + testSuffix,
                nom: 'Magasin Test',
                localisation: 'Test Zone',
                entiteId: entite.id
            }
        })

        const fournisseur = await prisma.fournisseur.create({
            data: {
                nom: 'Fournisseur' + testSuffix,
                telephone: '12345678',
                actif: true
            }
        })

        const produit = await prisma.produit.create({
            data: {
                code: 'PROD' + testSuffix,
                designation: 'Produit Test',
                categorie: 'GENERAL',
                unite: 'unite',
                prixAchat: 1000,
                prixVente: 1500,
                actif: true
            }
        })

        console.log(`[OK] Données de base créées (Entité, Magasin, Fournisseur, Produit)`)

        // Enregistrement d'un achat
        const achat = await prisma.achat.create({
            data: {
                numero: 'ACH' + testSuffix,
                date: new Date(),
                magasinId: magasin.id,
                entiteId: entite.id,
                utilisateurId: 1, // Supposé exister (admin)
                fournisseurId: fournisseur.id,
                montantTotal: 10000,
                montantPaye: 4000,
                statutPaiement: 'PARTIEL',
                modePaiement: 'ESPECES',
                lignes: {
                    create: {
                        produitId: produit.id,
                        designation: 'Produit Test',
                        quantite: 10,
                        prixUnitaire: 1000,
                        montant: 10000
                    }
                }
            }
        })
        console.log(`[OK] Achat enregistré (Montant: 10000, Payé: 4000)`)

        // Enregistrement d'une vente (Inventaire Z simulation)
        const vente = await prisma.vente.create({
            data: {
                numero: 'VEN' + testSuffix,
                date: new Date(),
                magasinId: magasin.id,
                entiteId: entite.id,
                utilisateurId: 1,
                montantTotal: 3000,
                montantPaye: 3000,
                statutPaiement: 'PAYE',
                modePaiement: 'MOBILE_MONEY',
                lignes: {
                    create: {
                        produitId: produit.id,
                        designation: 'Produit Test',
                        quantite: 2,
                        prixUnitaire: 1500,
                        montant: 3000
                    }
                }
            }
        })
        console.log(`[OK] Vente enregistrée (Montant: 3000, Mode: MOBILE_MONEY)\n`)

        // --- 3. TEST RAPPORTS ---
        console.log('--- [3/4] Test Calcul des Rapports ---')
        
        // Rapport Fournisseurs (Simulé)
        const checkFournisseur = await prisma.achat.groupBy({
            by: ['fournisseurId'],
            where: { fournisseurId: fournisseur.id },
            _sum: { montantTotal: true, montantPaye: true }
        })
        
        const total = checkFournisseur[0]?._sum.montantTotal || 0
        const paye = checkFournisseur[0]?._sum.montantPaye || 0
        const reste = total - paye
        
        if (reste !== 6000) throw new Error(`Erreur rapport fournisseur: Reste attendu 6000, obtenu ${reste}`)
        console.log(`[SUCCÈS] Rapport Fournisseur correct (Reste: ${reste} FCFA)`)

        // Rapport Inventaire Z (Simulé)
        const checkVenteMode = await prisma.vente.groupBy({
            by: ['modePaiement'],
            where: { numero: vente.numero },
            _sum: { montantTotal: true }
        })
        
        if (checkVenteMode[0]?.modePaiement !== 'MOBILE_MONEY' || checkVenteMode[0]?._sum.montantTotal !== 3000) {
            throw new Error('Erreur rapport Inventaire Z: Vente non trouvée ou montant incorrect')
        }
        console.log(`[SUCCÈS] Rapport Inventaire Z correct (Vente MOBILE_MONEY: 3000 FCFA)\n`)

        // --- 4. TEST PERSISTANCE POST-DÉCONNEXION (Simulation) ---
        console.log('--- [4/4] Test Persistance post-redémarrage ---')
        // Ici on ferme Prisma et on réouvre (simule la fin du processus)
        await prisma.$disconnect()
        
        // On réimporte ou réutilise pour simuler un "nouveau lancement"
        const { prisma: prisma2 } = await import('../lib/db')
        const verifiedPurchase = await prisma2.achat.findUnique({ where: { numero: achat.numero } })
        
        if (!verifiedPurchase) throw new Error('DONNÉES PERDUES après déconnexion !')
        console.log(`[SUCCÈS] Données vérifiées en BD après déconnexion Prisma.`)
        console.log(`[INFO] Fichier de base utilisé : ${process.env.DATABASE_URL}\n`)

        console.log('✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !')

    } catch (error) {
        console.error('\n❌ ÉCHEC DU TEST :', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

runTests()
