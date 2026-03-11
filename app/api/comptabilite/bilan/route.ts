import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const annee = parseInt(searchParams.get('annee') || '', 10) || new Date().getFullYear()

        const debutAnnee = new Date(annee, 0, 1)
        const finAnnee = new Date(annee, 11, 31, 23, 59, 59)

        // 1. Récupérer tous les comptes actifs (1-7 pour inclure Charges et Produits dans le résultat)
        const comptes = await prisma.planCompte.findMany({
            where: { actif: true },
            include: {
                ecritures: {
                    where: {
                        date: { lte: finAnnee }
                    }
                }
            }
        })

        // 2. Calculer les soldes
        const accountsWithBalances = comptes.map(compte => {
            const totalDebit = compte.ecritures.reduce((sum, e) => sum + e.debit, 0)
            const totalCredit = compte.ecritures.reduce((sum, e) => sum + e.credit, 0)
            const solde = totalDebit - totalCredit
            return {
                numero: compte.numero,
                libelle: compte.libelle,
                totalDebit,
                totalCredit,
                solde
            }
        }).filter(c => c.solde !== 0)

        // 3. Structurer le Bilan (SYSCOHADA Simplifié)
        const bilan = {
            actif: {
                immobilise: [] as any[],
                stocks: [] as any[],
                creances: [] as any[],
                tresorerie: [] as any[],
                total: 0
            },
            passif: {
                capitaux: [] as any[],
                dettes: [] as any[],
                tresorerie: [] as any[],
                total: 0
            }
        }

        // Variables pour le calcul du résultat (Produits - Charges)
        let totalProduits = 0
        let totalCharges = 0

        accountsWithBalances.forEach(c => {
            const p = { numero: c.numero, libelle: c.libelle, montant: Math.abs(c.solde) }

            // CLASSIFICATION BILAN
            if (c.numero.startsWith('2')) {
                bilan.actif.immobilise.push(p)
            } else if (c.numero.startsWith('3')) {
                bilan.actif.stocks.push(p)
            } else if (c.numero.startsWith('4')) {
                if (c.solde > 0) bilan.actif.creances.push(p)
                else bilan.passif.dettes.push(p)
            } else if (c.numero.startsWith('5')) {
                if (c.solde > 0) bilan.actif.tresorerie.push(p)
                else bilan.passif.tresorerie.push(p)
            } else if (c.numero.startsWith('1')) {
                bilan.passif.capitaux.push(p)
            } 
            // CLASSIFICATION RÉSULTAT
            else if (c.numero.startsWith('7')) {
                totalProduits += Math.abs(c.solde)
            } else if (c.numero.startsWith('6')) {
                totalCharges += Math.abs(c.solde)
            }
        })

        // Calcul des totaux de base (avant résultat)
        bilan.actif.total = [...bilan.actif.immobilise, ...bilan.actif.stocks, ...bilan.actif.creances, ...bilan.actif.tresorerie].reduce((s, x) => s + x.montant, 0)
        bilan.passif.total = [...bilan.passif.capitaux, ...bilan.passif.dettes, ...bilan.passif.tresorerie].reduce((s, x) => s + x.montant, 0)

        // Calcul du Résultat (Produits - Charges)
        const resultatNet = totalProduits - totalCharges
        
        if (resultatNet !== 0) {
            bilan.passif.capitaux.push({
                numero: '13',
                libelle: resultatNet > 0 ? 'RÉSULTAT NET : BÉNÉFICE' : 'RÉSULTAT NET : PERTE',
                montant: Math.abs(resultatNet),
                isResultat: true
            })
            bilan.passif.total += Math.abs(resultatNet)
        }

        // 4. Récupérer les infos de l'entreprise et de l'entité
        const [params, entite] = await Promise.all([
            prisma.parametre.findFirst(),
            prisma.entite.findUnique({ where: { id: session.entiteId || 1 } })
        ])

        return NextResponse.json({
            annee,
            bilan,
            entreprise: {
                nom: params?.nomEntreprise || entite?.nom || 'GestiCom',
                slogan: params?.slogan,
                contact: params?.contact,
                localisation: params?.localisation || entite?.localisation,
                piedDePage: params?.piedDePage,
                codeEntite: entite?.code,
                numNCC: params?.numNCC,
                logo: params?.logo
            }
        })
    } catch (e) {
        console.error('Bilan API Error:', e)
        return NextResponse.json({ error: 'Erreur lors du calcul du bilan' }, { status: 500 })
    }
}
