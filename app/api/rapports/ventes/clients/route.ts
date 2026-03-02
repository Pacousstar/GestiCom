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

        const where: any = { statut: 'VALIDEE' }
        if (start && end) {
            const endDate = new Date(end)
            endDate.setHours(23, 59, 59, 999)
            where.date = { gte: new Date(start), lte: endDate }
        }

        const clients = await prisma.client.findMany({ select: { id: true, nom: true, telephone: true } })
        const clientMap = new Map(clients.map(c => [c.id, c]))

        const ventesClientInfo = await prisma.vente.groupBy({
            by: ['clientId', 'clientLibre'],
            where,
            _sum: { montantTotal: true },
            _count: { id: true }
        })

        const data = ventesClientInfo.map(v => {
            let nom = v.clientLibre || 'Client Comptoir'
            if (v.clientId && clientMap.has(v.clientId)) {
                nom = clientMap.get(v.clientId)!.nom
            }
            return {
                client: nom,
                chiffreAffaires: v._sum.montantTotal || 0,
                frequenceAchat: v._count.id,
            }
        })

        const aggregated = Array.from(data.reduce((acc, curr) => {
            const existing = acc.get(curr.client)
            if (existing) {
                existing.chiffreAffaires += curr.chiffreAffaires
                existing.frequenceAchat += curr.frequenceAchat
            } else {
                acc.set(curr.client, { ...curr })
            }
            return acc
        }, new Map<string, typeof data[0]>()).values())

        aggregated.sort((a, b) => b.chiffreAffaires - a.chiffreAffaires)

        return NextResponse.json(aggregated)
    } catch (error) {
        console.error('Erreur API clients:', error)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
