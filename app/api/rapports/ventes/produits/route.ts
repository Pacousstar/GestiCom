import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    try {
        const searchParams = request.nextUrl.searchParams
        const start = searchParams.get('start')
        const end = searchParams.get('end')

        const where: any = { vente: { statut: 'VALIDEE' } }
        if (start && end) {
            const endDate = new Date(end)
            endDate.setHours(23, 59, 59, 999)
            where.vente.date = { gte: new Date(start), lte: endDate }
        }

        const produitsInfo = await prisma.produit.findMany({ select: { id: true, categorie: true, prixAchat: true } })
        const produitMap = new Map(produitsInfo.map(p => [p.id, p]))

        const ventesLignes = await prisma.venteLigne.groupBy({
            by: ['produitId', 'designation'],
            where,
            _sum: { quantite: true, montant: true }
        })

        const data = ventesLignes.map(v => {
            const pInfo = v.produitId ? produitMap.get(v.produitId) : null
            const prixAchat = pInfo?.prixAchat || 0
            const cogs = prixAchat * (v._sum.quantite || 0)
            const marge = (v._sum.montant || 0) - cogs
            return {
                produit: v.designation,
                categorie: pInfo?.categorie || 'Non classé',
                quantiteVendue: v._sum.quantite || 0,
                chiffreAffaires: v._sum.montant || 0,
                marge: marge
            }
        }).sort((a, b) => b.chiffreAffaires - a.chiffreAffaires)

        return NextResponse.json(data, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        })
    } catch (error) {
        console.error('Erreur API produits:', error)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
