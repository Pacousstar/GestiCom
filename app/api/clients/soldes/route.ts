import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getEntiteId } from '@/lib/get-entite-id'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const entiteId = await getEntiteId(session)
  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q')?.toLowerCase()

  try {
    // 1. Récupérer les clients de l'entité
    const clients = await prisma.client.findMany({
      where: { actif: true },
      select: {
        id: true,
        code: true,
        nom: true,
        telephone: true,
        ncc: true,
        localisation: true, // Champ ajouté
        soldeInitial: true,
      },
      orderBy: { nom: 'asc' },
    })

    // 2. Récupérer le cumul des factures (ventes validées)
    const ventes = await prisma.vente.groupBy({
      by: ['clientId'],
      where: {
        entiteId,
        statut: 'VALIDEE',
        clientId: { not: null },
      },
      _sum: {
        montantTotal: true,
      },
    })

    // 3. Récupérer le cumul des règlements (somme des montants payés sur les factures)
    const reglements = await prisma.vente.groupBy({
      by: ['clientId'],
      where: {
        entiteId,
        statut: 'VALIDEE',
        clientId: { not: null },
      },
      _sum: {
        montantPaye: true,
      },
    })

    // 4. Fusionner les données
    const venteMap = Object.fromEntries(ventes.map((v) => [v.clientId, v._sum.montantTotal || 0]))
    const reglementMap = Object.fromEntries(reglements.map((r) => [r.clientId, r._sum.montantPaye || 0]))

    let data = clients.map((c) => {
      const factures = venteMap[c.id] || 0
      const paiements = reglementMap[c.id] || 0
      const soldeInitial = c.soldeInitial || 0
      // Solde Client = Factures (ce qu'on lui a vendu) - Paiements (ce qu'il a déjà réglé) - Solde Déposé (son crédit d'entrée)
      // Si positif : il doit. Si négatif : on lui doit.
      const soldeClient = factures - paiements - soldeInitial

      return {
        ...c,
        factures,
        paiements,
        soldeClient,
      }
    })

    // Filtrage simple si recherche
    if (q) {
      data = data.filter(
        (c) =>
          c.nom.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q) ||
          c.localisation?.toLowerCase().includes(q)
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/clients/soldes:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
