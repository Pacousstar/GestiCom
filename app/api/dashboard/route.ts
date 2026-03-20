import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

const DASHBOARD_TIMEOUT_MS = 8000

function timeoutPromise<T>(ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
}

function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const startTime = Date.now();
    console.log('[API] GET /api/dashboard - Début');

    const now = new Date()
    const debAuj = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const finAuj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const debHier = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const finHier = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59)

    const catchZero = (label: string) => (err: unknown) => {
      console.error('[dashboard]', label, err instanceof Error ? err.message : err)
      return 0
    }
    const catchEmpty = (label: string) => (err: unknown) => {
      console.error('[dashboard]', label, err instanceof Error ? err.message : err)
      return [] as never[]
    }

    const queries = Promise.all([
      // 0 - Transactions du jour
      prisma.vente.count({ where: { date: { gte: debAuj, lte: finAuj }, statut: 'VALIDEE' } }).catch(catchZero('vente.count')),
      // 1 - Mouvements du jour
      prisma.mouvement.count({ where: { date: { gte: debAuj, lte: finAuj } } }).catch(catchZero('mouvement.count')),
      // 2 - Clients actifs
      prisma.$queryRaw<[{ n: number }]>`SELECT COUNT(*) as n FROM Client WHERE actif = 1`.then((r) => Number(r[0]?.n ?? 0)).catch(catchZero('Client')),
      // 3 - Produits en stock
      prisma.stock.count({ where: { quantite: { gt: 0 } } }).catch(catchZero('stock.count')),
      // 4 - Total produits catalogue
      prisma.produit.count({ where: { actif: true } }).catch(catchZero('produit.count')),
      // 5 - Stocks faibles
      prisma.$queryRaw<Array<{
        id: number
        quantite: number
        produit_designation: string
        produit_seuilMin: number
        produit_categorie: string
        magasin_code: string
      }>>`
        SELECT 
          s.id,
          s.quantite,
          p.designation as produit_designation,
          p."seuilMin" as produit_seuilMin,
          p.categorie as produit_categorie,
          m.code as magasin_code
        FROM "Stock" s
        INNER JOIN "Produit" p ON s."produitId" = p.id
        INNER JOIN "Magasin" m ON s."magasinId" = m.id
        WHERE p.actif = 1 AND s.quantite < p."seuilMin"
        ORDER BY s.quantite ASC
        LIMIT 5
      `.then((rows) => rows.map((r) => ({
        id: r.id,
        quantite: r.quantite,
        produit: {
          designation: r.produit_designation,
          seuilMin: r.produit_seuilMin,
          categorie: r.produit_categorie,
        },
        magasin: {
          code: r.magasin_code,
        },
      }))).catch(catchEmpty('stock.findMany')),
      // 6 - Ventes récentes avec montants
      prisma.vente.findMany({
        take: 5,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          numero: true,
          date: true,
          montantTotal: true,
          clientLibre: true,
          client: { select: { nom: true } },
        },
      }).catch(catchEmpty('vente.findMany')),
      // 7 - Répartition par catégorie
      prisma.produit.groupBy({
        by: ['categorie'],
        where: { actif: true },
        _count: { id: true },
      }).catch(catchEmpty('produit.groupBy')),
      // 8 - CA total (toutes périodes pour le calcul du panier moyen globale ou filtré)
      prisma.vente.aggregate({
        where: { statut: 'VALIDEE' },
        _sum: { montantTotal: true },
        _count: { id: true }
      }).catch(() => ({ _sum: { montantTotal: 0 }, _count: { id: 0 } })),
      // 9 - Top 5 Produits les plus vendus (CA)
      prisma.venteLigne.groupBy({
        by: ['produitId', 'designation'],
        _sum: { montant: true, quantite: true },
        orderBy: { _sum: { montant: 'desc' } },
        take: 5
      }).catch(catchEmpty('venteLigne.groupBy')),
      // 10 - Valeur totale du stock au prix de vente
      prisma.stock.findMany({
        where: { quantite: { gt: 0 } },
        select: {
          quantite: true,
          produit: { select: { prixVente: true } }
        }
      }).catch(catchEmpty('stock.findMany.valeur')),
      // 11 - Statut Rupture (Nombre de produits à 0 stock)
      prisma.produit.count({
        where: {
          actif: true,
          stocks: { some: { quantite: { lte: 0 } } }
        }
      }).catch(catchZero('produit.count.rupture')),
      // 12 - CA du jour (pour KPI direct)
      prisma.vente.aggregate({
        where: { date: { gte: debAuj, lte: finAuj }, statut: 'VALIDEE' },
        _sum: { montantTotal: true }
      }).then(r => toNum(r._sum.montantTotal)).catch(catchZero('vente.ca.auj')),
      // 13 - Transactions hier (pour comparaison)
      prisma.vente.count({ where: { date: { gte: debHier, lte: finHier }, statut: 'VALIDEE' } }).catch(catchZero('vente.count.hier')),
    ])

    const timeoutFallback: any[] = [
      0, 0, 0, 0, 0,
      [] as any[], // lowStock
      [] as any[], // recentSales
      [] as any[], // categories
      { _sum: { montantTotal: 0 }, _count: { id: 0 } }, // caTotalAgg
      [] as any[], // topProduitsRaw
      [] as any[], // stocksValeurRaw
      0, // nbRuptures
      0, // caJour
      0, // transactionsHier
    ]

    const result = await Promise.race([
      queries,
      timeoutPromise(DASHBOARD_TIMEOUT_MS, timeoutFallback),
    ]) as any[]

    const [
      transactionsJour,
      mouvementsJour,
      clientsActifs,
      stocksAvecQte,
      totalProduitsCatalogue,
      lowStock,
      recentSales,
      categories,
      caTotalAgg,
      topProduitsRaw,
      stocksValeurRaw,
      nbRuptures,
      caJour,
      transactionsHier,
    ] = result

    const timedOut = result === timeoutFallback
    if (timedOut) {
      console.warn('[dashboard] Timeout après', DASHBOARD_TIMEOUT_MS, 'ms. Base verrouillée ou trop lente. Fermez le portable (Lancer.bat) si ouvert.')
    }

    const totalRef = categories.reduce((s: number, c: any) => s + (c._count?.id ?? 0), 0)
    const repartition = totalRef > 0
      ? categories.map((c: any) => ({ name: c.categorie || 'DIVERS', percent: Math.round(((c._count?.id ?? 0) / totalRef) * 100) })).sort((a: any, b: any) => b.percent - a.percent)
      : []

    // Calculs ERP supplémentaires
    const caTotalGlobal = toNum(caTotalAgg._sum?.montantTotal)
    const nbVentesGlobal = toNum(caTotalAgg._count?.id)
    const panierMoyen = nbVentesGlobal > 0 ? Math.round(caTotalGlobal / nbVentesGlobal) : 0

    const valeurStockTotal = stocksValeurRaw.reduce((sum: number, s: any) => sum + (s.quantite * (s.produit?.prixVente ?? 0)), 0)

    const topProduits = topProduitsRaw.map((t: any) => ({
      name: t.designation || 'Inconnu',
      ca: toNum(t._sum?.montant),
      qte: toNum(t._sum?.quantite)
    }))

    const tauxRupture = totalProduitsCatalogue > 0 ? Math.round((nbRuptures / totalProduitsCatalogue) * 100) : 0

    return NextResponse.json({
      transactionsJour,
      transactionsHier,
      produitsEnStock: stocksAvecQte,
      totalProduitsCatalogue,
      mouvementsJour,
      clientsActifs,
      caJour,
      panierMoyen,
      valeurStockTotal,
      tauxRupture,
      topProduits,
      lowStock: Array.isArray(lowStock) ? lowStock.map((s: any) => ({
        name: s.produit?.designation || '',
        stock: s.quantite || 0,
        min: s.produit?.seuilMin || 0,
        category: s.produit?.categorie || '',
      })) : [],
      recentSales: Array.isArray(recentSales) ? recentSales.map((v: any) => ({
        id: v.numero,
        client: v.client?.nom || v.clientLibre || '—',
        montant: toNum(v.montantTotal),
        time: v.date,
      })) : [],
      repartition,
      _timeout: timedOut,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (e: any) {
    console.error('Dashboard API error:', e)
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({
      transactionsJour: 0,
      transactionsHier: 0,
      produitsEnStock: 0,
      totalProduitsCatalogue: 0,
      mouvementsJour: 0,
      clientsActifs: 0,
      caJour: 0,
      caHier: 0,
      soldeCaisse: 0,
      soldeBanque: 0,
      achatsJour: 0,
      lowStock: [],
      recentSales: [],
      repartition: [],
      _error: msg,
      _timeout: false,
    })
  } finally {
    // @ts-ignore
    if (typeof startTime !== 'undefined') {
      console.log(`[API] GET /api/dashboard - Fin (${Date.now() - startTime}ms)`);
    }
  }
}
