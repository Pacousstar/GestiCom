import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const entiteId = session.entiteId
  const dateDebut = request.nextUrl.searchParams.get('dateDebut')
  const dateFin = request.nextUrl.searchParams.get('dateFin')
  const typeRecherche = request.nextUrl.searchParams.get('type') // "CLIENT" | "FOURNISSEUR"

  if (!dateDebut || !dateFin) {
    return NextResponse.json({ error: 'Période requise' }, { status: 400 })
  }

  const deb = new Date(dateDebut + 'T00:00:00')
  const fin = new Date(dateFin + 'T23:59:59')

  try {
    if (typeRecherche === 'CLIENT') {
      const paimentsVentes = await prisma.vente.groupBy({
        by: ['modePaiement'],
        where: {
          date: { gte: deb, lte: fin },
          statut: 'VALIDEE',
          ...(entiteId && session.role !== 'SUPER_ADMIN' ? { entiteId } : {}),
        },
        _sum: { montantPaye: true },
        _count: { id: true }
      })

      // Détails des transactions
      const transactions = await prisma.vente.findMany({
        where: {
          date: { gte: deb, lte: fin },
          statut: 'VALIDEE',
          ...(entiteId && session.role !== 'SUPER_ADMIN' ? { entiteId } : {}),
        },
        include: { client: { select: { nom: true } } },
        orderBy: { date: 'desc' }
      })

      return NextResponse.json({ summary: paimentsVentes, transactions })
    } else {
      const paiementsAchats = await prisma.achat.groupBy({
        by: ['modePaiement'],
        where: {
          date: { gte: deb, lte: fin },
          ...(entiteId && session.role !== 'SUPER_ADMIN' ? { entiteId } : {}),
        },
        _sum: { montantPaye: true },
        _count: { id: true }
      })

      const transactions = await prisma.achat.findMany({
        where: {
          date: { gte: deb, lte: fin },
          ...(entiteId && session.role !== 'SUPER_ADMIN' ? { entiteId } : {}),
        },
        include: { fournisseur: { select: { nom: true } } },
        orderBy: { date: 'desc' }
      })

      return NextResponse.json({ summary: paiementsAchats, transactions })
    }
  } catch (error) {
    console.error('Erreur Rapport Paiements:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des paiements' }, { status: 500 })
  }
}
