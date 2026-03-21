import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { comptabiliserAchat } from '@/lib/comptabilisation'
import { getEntiteId } from '@/lib/get-entite-id'
import { requirePermission } from '@/lib/require-role'
import { ensureActivated } from '@/lib/security'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const forbidden = requirePermission(session, 'achats:view')
  if (forbidden) return forbidden

  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 20))
  const skip = (page - 1) * limit

  const dateDebut = request.nextUrl.searchParams.get('dateDebut')?.trim()
  const dateFin = request.nextUrl.searchParams.get('dateFin')?.trim()
  const where: { date?: { gte: Date; lte: Date }; entiteId?: number } = {}
  if (dateDebut && dateFin) {
    where.date = {
      gte: new Date(dateDebut + 'T00:00:00'),
      lte: new Date(dateFin + 'T23:59:59'),
    }
  }
  // Filtrer par entité de la session (sauf SUPER_ADMIN qui voit tout)
  if (session.role !== 'SUPER_ADMIN' && session.entiteId) {
    where.entiteId = session.entiteId
  }

  const [achats, total, aggregates] = await Promise.all([
    prisma.achat.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        magasin: { select: { code: true, nom: true } },
        fournisseur: { select: { id: true, code: true, nom: true } },
        lignes: { include: { produit: { select: { code: true, designation: true } } } },
      },
    }),
    prisma.achat.count({ where }),
    prisma.achat.aggregate({
      where,
      _sum: {
        montantTotal: true,
        montantPaye: true,
      }
    })
  ])

  const res = NextResponse.json({
    data: achats,
    totals: {
      montantTotal: aggregates._sum.montantTotal || 0,
      montantPaye: aggregates._sum.montantPaye || 0,
      resteAPayer: (aggregates._sum.montantTotal || 0) - (aggregates._sum.montantPaye || 0),
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  return res
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const forbidden = requirePermission(session, 'achats:create')
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const magasinId = Number(body?.magasinId)
    const fournisseurId = body?.fournisseurId != null ? Number(body.fournisseurId) : null
    const fournisseurLibre = body?.fournisseurLibre != null ? String(body.fournisseurLibre).trim() || null : null
    const modePaiement = ['ESPECES', 'MOBILE_MONEY', 'CHEQUE', 'CREDIT', 'VIREMENT'].includes(String(body?.modePaiement || ''))
      ? String(body.modePaiement)
      : 'ESPECES'
    const montantPayeRaw = body?.montantPaye != null ? Math.max(0, Number(body.montantPaye) || 0) : null
    const observation = body?.observation != null ? String(body.observation).trim() || null : null
    const dateStr = body?.date != null ? String(body.date).trim() : null
    const dateAchat = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
    if (isNaN(dateAchat.getTime())) {
      return NextResponse.json({ error: 'Date invalide.' }, { status: 400 })
    }
    const lignes = Array.isArray(body?.lignes) ? body.lignes : []

    if (!Number.isInteger(magasinId) || magasinId < 1) {
      return NextResponse.json({ error: 'Magasin requis.' }, { status: 400 })
    }
    if (!lignes.length) {
      return NextResponse.json({ error: 'Au moins une ligne requise.' }, { status: 400 })
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.utilisateur.findUnique({
      where: { id: session.userId },
      select: { id: true },
    })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 401 })

    // Utiliser l'entité de la session (qui peut être changée pour SUPER_ADMIN)
    const entiteId = await getEntiteId(session)

    const magasin = await prisma.magasin.findUnique({ where: { id: magasinId } })
    if (!magasin) return NextResponse.json({ error: 'Magasin introuvable.' }, { status: 400 })

    // Vérifier que le magasin appartient à l'entité sélectionnée (sauf SUPER_ADMIN)
    if (session.role !== 'SUPER_ADMIN' && magasin.entiteId !== entiteId) {
      return NextResponse.json({ error: 'Ce magasin n\'appartient pas à votre entité.' }, { status: 403 })
    }

    let montantTotal = 0
    const lignesValides: Array<{ produitId: number; designation: string; quantite: number; prixUnitaire: number; tva: number; remise: number; montant: number }> = []

    for (const l of lignes) {
      const produitId = Number(l?.produitId)
      const quantite = Math.max(1, Math.floor(Number(l?.quantite) || 0))
      const prixUnitaire = Math.max(0, Number(l?.prixUnitaire) || 0)
      const tva = Math.max(0, Number(l?.tva) || 0)
      const remise = Math.max(0, Number(l?.remise) || 0)
      if (!produitId || !quantite) continue

      const produit = await prisma.produit.findUnique({ where: { id: produitId } })
      if (!produit) continue

      const designation = produit.designation
      const montantHT = quantite * prixUnitaire
      const montantLigne = Math.round((montantHT - remise) * (1 + tva / 100))
      
      montantTotal += montantLigne
      lignesValides.push({ produitId, designation, quantite, prixUnitaire, tva, remise, montant: montantLigne })
    }

    if (!lignesValides.length) {
      return NextResponse.json({ error: 'Lignes invalides.' }, { status: 400 })
    }

    const montantPaye = montantPayeRaw != null
      ? Math.min(montantTotal, Math.max(0, montantPayeRaw))
      : (modePaiement === 'CREDIT' ? 0 : montantTotal)
    const statutPaiement = montantPaye >= montantTotal ? 'PAYE' : montantPaye > 0 ? 'PARTIEL' : 'CREDIT'

    const num = `A${Date.now()}`
    const achat = await prisma.achat.create({
      data: {
        numero: num,
        date: dateAchat,
        magasinId,
        entiteId: entiteId,
        utilisateurId: session.userId,
        fournisseurId,
        fournisseurLibre,
        montantTotal,
        montantPaye,
        statutPaiement,
        modePaiement,
        observation,
        lignes: {
          create: lignesValides.map((l) => ({
            produitId: l.produitId,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            tva: l.tva,
            remise: l.remise,
            montant: l.montant,
          })),
        },
      },
      include: {
        lignes: true,
        magasin: { select: { code: true, nom: true } },
        fournisseur: { select: { nom: true } },
      },
    })

    // Mise à jour des stocks et du PAMP
    for (const l of lignesValides) {
      // 1. Récupérer le produit et son stock global pour le calcul du PAMP
      const targetProduit = await prisma.produit.findUnique({
        where: { id: l.produitId },
        include: { stocks: true }
      })

      if (targetProduit) {
        const stockGlobalActuel = targetProduit.stocks.reduce((acc, s) => acc + s.quantite, 0)
        const pampActuel = targetProduit.pamp || targetProduit.prixAchat || 0
        
        // Formule PAMP : ((Stock_Actuel * PAMP_Actuel) + (Qte_Achetee * Prix_Achat_Nouveau)) / (Stock_Actuel + Qte_Achetee)
        const nouveauStockGlobal = stockGlobalActuel + l.quantite
        const nouveauPamp = ((stockGlobalActuel * pampActuel) + (l.quantite * l.prixUnitaire)) / nouveauStockGlobal
        
        await prisma.produit.update({
          where: { id: l.produitId },
          data: { pamp: nouveauPamp }
        })
      }

      // 2. Gérer le stock par magasin
      let st = await prisma.stock.findUnique({
        where: { produitId_magasinId: { produitId: l.produitId, magasinId } },
      })

      if (!st) {
        st = await prisma.stock.create({
          data: { produitId: l.produitId, magasinId, quantite: 0, quantiteInitiale: 0 },
        })
      }

      await prisma.mouvement.create({
        data: {
          type: 'ENTREE',
          produitId: l.produitId,
          magasinId,
          entiteId: entiteId,
          utilisateurId: session.userId,
          quantite: l.quantite,
          observation: `Achat ${num}`,
        },
      })

      await prisma.stock.update({
        where: { id: st.id },
        data: { quantite: { increment: l.quantite } },
      })
    }

    // Comptabilisation automatique
    try {
      await comptabiliserAchat({
        achatId: achat.id,
        numeroAchat: num,
        date: dateAchat,
        montantTotal,
        modePaiement,
        fournisseurId,
        utilisateurId: session.userId,
      })
    } catch (comptaError) {
      console.error('Erreur comptabilisation achat:', comptaError)
      // On continue même si la comptabilisation échoue
    }

    // Invalider le cache pour affichage immédiat
    revalidatePath('/dashboard/achats')
    revalidatePath('/dashboard/stock')
    revalidatePath('/api/achats')

    return NextResponse.json(achat)
  } catch (e) {
    console.error('POST /api/achats:', e)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
