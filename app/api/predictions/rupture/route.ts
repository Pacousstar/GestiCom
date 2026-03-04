import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // 1. Obtenir les ventes des 30 derniers jours par produit
        const ventesGroups = await prisma.venteLigne.groupBy({
            by: ['produitId'],
            _sum: {
                quantite: true,
            },
            where: {
                vente: {
                    date: {
                        gte: thirtyDaysAgo,
                    },
                    statut: 'VALIDEE',
                },
            },
        })

        // 2. Récupérer les produits suivis en stock avec leur niveau actuel
        const produits = await prisma.produit.findMany({
            include: {
                stocks: true,
            },
            where: {
                actif: true
            }
        })

        const predictions = produits.map((p) => {
            const stockTotal = p.stocks.reduce((sum, s) => sum + s.quantite, 0)
            const ventesModule = ventesGroups.find((v) => v.produitId === p.id)
            const totalVenduSur30j = ventesModule?._sum.quantite || 0

            const velociteJour = totalVenduSur30j / 30 // Nombre d'articles vendus par jour en moyenne

            let joursRestants = -1
            if (velociteJour > 0) {
                joursRestants = Math.floor(stockTotal / velociteJour)
            } else if (stockTotal === 0) {
                joursRestants = 0 // Déjà en rupture
            }

            return {
                produitId: p.id,
                code: p.code,
                designation: p.designation,
                stockTotal,
                velociteJour,
                joursRestants,
            }
        }).filter(p => p.joursRestants !== -1 && p.joursRestants <= 14) // Alertes pour rupture dans <= 14 jours ou déjà en rupture
            .sort((a, b) => a.joursRestants - b.joursRestants)

        return NextResponse.json(predictions)
    } catch (error: any) {
        console.error('Erreur API predictions rupture:', error)
        return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
    }
}
