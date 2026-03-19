import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const dateDebut = searchParams.get('dateDebut')
  const dateFin = searchParams.get('dateFin')
  const produitId = searchParams.get('produitId')
  const magasinId = searchParams.get('magasinId')
  const type = searchParams.get('type')

  const where: any = {}

  if (session.role !== 'SUPER_ADMIN' && session.entiteId) {
    where.entiteId = session.entiteId
  }

  if (dateDebut && dateFin) {
    where.date = {
      gte: new Date(dateDebut + 'T00:00:00'),
      lte: new Date(dateFin + 'T23:59:59'),
    }
  }

  if (produitId) where.produitId = parseInt(produitId)
  if (magasinId) where.magasinId = parseInt(magasinId)
  if (type && type !== 'TOUT') where.type = type

  try {
    const mouvements = await prisma.mouvement.findMany({
      where,
      include: {
        produit: { select: { designation: true, code: true, unite: true } },
        magasin: { select: { nom: true } },
        utilisateur: { select: { nom: true } },
      },
      orderBy: { date: 'desc' },
    })

    const formatted = mouvements.map(m => ({
      id: m.id,
      date: m.date,
      type: m.type,
      produit: m.produit?.designation || 'Produit inconnu',
      code: m.produit?.code || 'SANS CODE',
      unite: m.produit?.unite || 'u',
      magasin: m.magasin?.nom || 'Magasin inconnu',
      quantite: m.quantite,
      utilisateur: m.utilisateur?.nom || 'Système',
      observation: m.observation
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('GET /api/rapports/inventaire/mouvements:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
