import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getEntiteId } from '@/lib/get-entite-id'

/**
 * API pour les statistiques graphiques
 * Retourne des données pour les graphiques (CA par période, évolution stock, top produits)
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const periode = request.nextUrl.searchParams.get('periode') || '30' // 7, 30, 90, ou 'mois'
  const entiteId = await getEntiteId(session)

  try {
    const now = new Date()
    let dateDebut: Date
    let dateFin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    if (periode === 'mois') {
      // Derniers 12 mois
      dateDebut = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0)
    } else {
      const jours = Number(periode) || 30
      dateDebut = new Date(now.getFullYear(), now.getMonth(), now.getDate() - jours, 0, 0, 0)
    }

    // Filtre par entité
    const whereVentes: { date: { gte: Date; lte: Date }; statut: string; entiteId?: number } = {
      date: { gte: dateDebut, lte: dateFin },
      statut: 'VALIDEE',
    }
    const whereAchats: { date: { gte: Date; lte: Date }; entiteId?: number } = {
      date: { gte: dateDebut, lte: dateFin },
    }
    const whereMouvements: { date: { gte: Date; lte: Date }; entiteId?: number } = {
      date: { gte: dateDebut, lte: dateFin },
    }

    if (entiteId) {
      whereVentes.entiteId = entiteId
      whereAchats.entiteId = entiteId
      whereMouvements.entiteId = entiteId
    }

    // CA par période (groupé par jour ou mois). Limite pour éviter lenteur (base volumineuse).
    const maxRows = 5000
    const ventes = await prisma.vente.findMany({
      where: whereVentes,
      select: {
        date: true,
        montantTotal: true,
      },
      orderBy: { date: 'asc' },
      take: maxRows,
    })

    // Achats par période
    const achats = await prisma.achat.findMany({
      where: whereAchats,
      select: {
        date: true,
        montantTotal: true,
      },
      orderBy: { date: 'asc' },
      take: maxRows,
    })

    // Top produits (par quantité vendue)
    const topProduits = await prisma.venteLigne.groupBy({
      by: ['produitId'],
      where: {
        vente: {
          date: { gte: dateDebut, lte: dateFin },
          statut: 'VALIDEE',
          ...(entiteId ? { entiteId } : {}),
        },
      },
      _sum: {
        quantite: true,
        montant: true,
      },
      orderBy: {
        _sum: {
          quantite: 'desc',
        },
      },
      take: 10,
    })

    // Récupérer les détails des produits
    const produitIds = topProduits.map((p) => p.produitId)
    const produitsDetails = await prisma.produit.findMany({
      where: { id: { in: produitIds } },
      select: { id: true, code: true, designation: true },
    })

    const topProduitsAvecDetails = topProduits.map((p) => {
      const produit = produitsDetails.find((pr) => pr.id === p.produitId)
      return {
        produitId: p.produitId,
        code: produit?.code || '—',
        designation: produit?.designation || '—',
        quantite: p._sum.quantite || 0,
        montant: p._sum.montant || 0,
      }
    })

    // Évolution stock (mouvements par jour)
    const mouvements = await prisma.mouvement.findMany({
      where: whereMouvements,
      select: {
        date: true,
        type: true,
        quantite: true,
      },
      orderBy: { date: 'asc' },
      take: maxRows,
    })

    // Grouper les données par jour ou mois
    const groupBy = periode === 'mois' ? 'mois' : 'jour'
    
    const caParPeriode: Array<{ date: string; ca: number; achats: number }> = []
    const evolutionStock: Array<{ date: string; entrees: number; sorties: number }> = []

    if (groupBy === 'mois') {
      // Grouper par mois
      const caMap = new Map<string, { ca: number; achats: number }>()
      const stockMap = new Map<string, { entrees: number; sorties: number }>()

      ventes.forEach((v) => {
        const key = `${v.date.getFullYear()}-${String(v.date.getMonth() + 1).padStart(2, '0')}`
        const existing = caMap.get(key) || { ca: 0, achats: 0, count: 0 }
        existing.ca += Number(v.montantTotal)
        existing.count += 1
        caMap.set(key, existing)
      })

      achats.forEach((a) => {
        const key = `${a.date.getFullYear()}-${String(a.date.getMonth() + 1).padStart(2, '0')}`
        const existing = caMap.get(key) || { ca: 0, achats: 0, count: 0 }
        existing.achats += Number(a.montantTotal)
        caMap.set(key, existing)
      })

      mouvements.forEach((m) => {
        const key = `${m.date.getFullYear()}-${String(m.date.getMonth() + 1).padStart(2, '0')}`
        const existing = stockMap.get(key) || { entrees: 0, sorties: 0 }
        if (m.type === 'ENTREE') {
          existing.entrees += m.quantite
        } else {
          existing.sorties += m.quantite
        }
        stockMap.set(key, existing)
      })

      // Convertir en array trié
      Array.from(caMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([key, value]) => {
          caParPeriode.push({
            date: key,
            ca: value.ca,
            achats: value.achats,
            count: value.count || 0,
          })
        })

      Array.from(stockMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([key, value]) => {
          evolutionStock.push({
            date: key,
            entrees: value.entrees,
            sorties: value.sorties,
          })
        })
    } else {
      // Grouper par jour
      const caMap = new Map<string, { ca: number; achats: number; count: number }>()
      const stockMap = new Map<string, { entrees: number; sorties: number }>()

      ventes.forEach((v) => {
        const key = v.date.toISOString().split('T')[0]
        const existing = caMap.get(key) || { ca: 0, achats: 0, count: 0 }
        existing.ca += Number(v.montantTotal)
        existing.count += 1
        caMap.set(key, existing)
      })

      achats.forEach((a) => {
        const key = a.date.toISOString().split('T')[0]
        const existing = caMap.get(key) || { ca: 0, achats: 0, count: 0 }
        existing.achats += Number(a.montantTotal)
        caMap.set(key, existing)
      })

      mouvements.forEach((m) => {
        const key = m.date.toISOString().split('T')[0]
        const existing = stockMap.get(key) || { entrees: 0, sorties: 0 }
        if (m.type === 'ENTREE') {
          existing.entrees += m.quantite
        } else {
          existing.sorties += m.quantite
        }
        stockMap.set(key, existing)
      })

      // Convertir en array trié
      Array.from(caMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([key, value]) => {
          caParPeriode.push({
            date: key,
            ca: value.ca,
            achats: value.achats,
            count: value.count || 0,
          })
        })

      Array.from(stockMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([key, value]) => {
          evolutionStock.push({
            date: key,
            entrees: value.entrees,
            sorties: value.sorties,
          })
        })
    }

    return NextResponse.json({
      caParPeriode,
      evolutionStock,
      topProduits: topProduitsAvecDetails,
      periode,
    })
  } catch (e) {
    console.error('Stats API error:', e)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des statistiques.',
        caParPeriode: [],
        evolutionStock: [],
        topProduits: [],
      },
      { status: 500 }
    )
  }
}
