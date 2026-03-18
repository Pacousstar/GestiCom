import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const dateFin = searchParams.get('dateFin') || new Date().toISOString().split('T')[0]
  const magasinId = searchParams.get('magasinId')

  try {
    const entiteId = session.entiteId

    // 1. Récupérer les produits
    const produits = await prisma.produit.findMany({
      where: { actif: true },
      select: {
        id: true,
        designation: true,
        code: true,
        categorie: true,
        unite: true,
        pamp: true,
        prixAchat: true,
      }
    })

    // 2. Récupérer les stocks actuels
    const stocks = await prisma.stock.findMany({
      where: magasinId && magasinId !== 'TOUT' ? { magasinId: parseInt(magasinId) } : {
        magasin: { entiteId }
      },
      select: {
        produitId: true,
        quantite: true,
      }
    })

    // 3. Récupérer les mouvements POSTÉRIEURS à dateFin pour recalculer le stock à cette date
    // Stock à dateFin = StockActuel - Mouvements(Entrée, après dateFin) + Mouvements(Sortie, après dateFin)
    
    const mouvementsPost = await prisma.mouvement.findMany({
      where: {
        entiteId,
        date: { gt: new Date(dateFin + 'T23:59:59') },
        ...(magasinId && magasinId !== 'TOUT' ? { magasinId: parseInt(magasinId) } : {})
      },
      select: {
        produitId: true,
        type: true,
        quantite: true,
      }
    })

    const stockMap: Record<number, number> = {}
    stocks.forEach(s => {
      stockMap[s.produitId] = (stockMap[s.produitId] || 0) + s.quantite
    })

    // Ajustement inverse pour remonter dans le temps
    mouvementsPost.forEach(m => {
      if (m.type === 'ENTREE' || m.type === 'TRANSFERT_IN' || (m.type === 'AJUSTEMENT' && m.quantite > 0)) {
        stockMap[m.produitId] = (stockMap[m.produitId] || 0) - m.quantite
      } else if (m.type === 'SORTIE' || m.type === 'TRANSFERT_OUT' || (m.type === 'AJUSTEMENT' && m.quantite < 0)) {
        stockMap[m.produitId] = (stockMap[m.produitId] || 0) + Math.abs(m.quantite)
      }
    })

    const data = produits.map(p => {
      const qte = stockMap[p.id] || 0
      const prixValo = p.pamp || p.prixAchat || 0
      return {
        id: p.id,
        code: p.code,
        designation: p.designation,
        categorie: p.categorie,
        unite: p.unite,
        quantite: qte,
        pamp: prixValo,
        valeurTotal: qte * prixValo
      }
    }).filter(d => d.quantite !== 0)

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/rapports/inventaire/valeur:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
