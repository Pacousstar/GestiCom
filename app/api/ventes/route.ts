import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logAction } from '@/lib/audit'
import { comptabiliserVente } from '@/lib/comptabilisation'
import { getEntiteId } from '@/lib/get-entite-id'
import { requirePermission } from '@/lib/require-role'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const forbidden = requirePermission(session, 'ventes:view')
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

  const [ventes, total, aggregates] = await Promise.all([
    prisma.vente.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        magasin: { select: { code: true, nom: true } },
        lignes: { include: { produit: { select: { code: true, designation: true } } } },
      },
    }),
    prisma.vente.count({ where }),
    prisma.vente.aggregate({
      where,
      _sum: {
        montantTotal: true,
        montantPaye: true,
      }
    })
  ])

  const res = NextResponse.json({
    data: ventes,
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
  const forbidden = requirePermission(session, 'ventes:create')
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const magasinId = Number(body?.magasinId)
    const clientId = body?.clientId != null ? Number(body.clientId) : null
    const clientLibre = body?.clientLibre != null ? String(body.clientLibre).trim() || null : null
    const modePaiement = ['ESPECES', 'MOBILE_MONEY', 'CREDIT'].includes(String(body?.modePaiement || ''))
      ? String(body.modePaiement)
      : 'ESPECES'
    const remiseGlobale = body?.remiseGlobale != null ? Math.max(0, Number(body.remiseGlobale) || 0) : 0
    const montantPayeRaw = body?.montantPaye != null ? Math.max(0, Number(body.montantPaye) || 0) : null
    const observation = body?.observation != null ? String(body.observation).trim() || null : null
    const dateStr = body?.date != null ? String(body.date).trim() : null
    const dateVente = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
    if (isNaN(dateVente.getTime())) {
      return NextResponse.json({ error: 'Date invalide.' }, { status: 400 })
    }
    const lignes = Array.isArray(body?.lignes) ? body.lignes : []

    if (!Number.isInteger(magasinId) || magasinId < 1) {
      return NextResponse.json({ error: 'Magasin requis.' }, { status: 400 })
    }
    if (!lignes.length) {
      return NextResponse.json({ error: 'Au moins une ligne de vente requise.' }, { status: 400 })
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
      const montant = Math.round((montantHT * (1 + tva / 100)) - remise)
      montantTotal += montant
      lignesValides.push({ produitId, designation, quantite, prixUnitaire, tva, remise, montant })
    }

    if (!lignesValides.length) {
      return NextResponse.json({ error: 'Lignes de vente invalides.' }, { status: 400 })
    }

    montantTotal = Math.max(0, Math.round(montantTotal - remiseGlobale))

    const montantPaye = montantPayeRaw != null
      ? Math.min(montantTotal, Math.max(0, montantPayeRaw))
      : (modePaiement === 'CREDIT' ? 0 : montantTotal)
    const statutPaiement = montantPaye >= montantTotal ? 'PAYE' : montantPaye > 0 ? 'PARTIEL' : 'CREDIT'

    if (modePaiement === 'CREDIT' || statutPaiement === 'CREDIT') {
      if (clientId == null) {
        return NextResponse.json(
          { error: 'Vente à crédit : un client doit être sélectionné.' },
          { status: 400 }
        )
      }
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { type: true, plafondCredit: true },
      })
      if (!client) {
        return NextResponse.json({ error: 'Client introuvable.' }, { status: 400 })
      }
      if (client.type !== 'CREDIT') {
        return NextResponse.json(
          { error: 'Vente à crédit : le client doit être de type CREDIT.' },
          { status: 400 }
        )
      }
      if (client.plafondCredit == null) {
        return NextResponse.json(
          { error: 'Vente à crédit : le client doit avoir un plafond de crédit défini.' },
          { status: 400 }
        )
      }
      const ventesClient = await prisma.vente.findMany({
        where: { clientId, statut: 'VALIDEE' },
        select: { montantTotal: true, montantPaye: true },
      })
      const dette = ventesClient.reduce((s, v) => s + (v.montantTotal - (v.montantPaye ?? 0)), 0)
      const resteCetteVente = montantTotal - montantPaye
      if (dette + resteCetteVente > client.plafondCredit) {
        return NextResponse.json(
          {
            error: `Plafond crédit dépassé (dette: ${Math.round(dette).toLocaleString('fr-FR')} F, plafond: ${Math.round(client.plafondCredit).toLocaleString('fr-FR')} F, reste à payer cette vente: ${Math.round(resteCetteVente).toLocaleString('fr-FR')} F).`,
          },
          { status: 400 }
        )
      }
    }

    // Vérifier stock et décrémenter
    for (const l of lignesValides) {
      const st = await prisma.stock.findUnique({
        where: { produitId_magasinId: { produitId: l.produitId, magasinId } },
      })
      const qte = st?.quantite ?? 0
      if (qte < l.quantite) {
        const p = await prisma.produit.findUnique({ where: { id: l.produitId } })
        return NextResponse.json(
          { error: `Stock insuffisant pour ${p?.designation || l.produitId} (dispo: ${qte}).` },
          { status: 400 }
        )
      }
    }

    const num = `V${Date.now()}` // Créer la vente
    const vente = await prisma.vente.create({
      data: {
        numero: num,
        date: dateVente,
        magasinId,
        entiteId,
        utilisateurId: session.userId,
        clientId,
        clientLibre,
        montantTotal, // montantTotal already includes global discount
        remiseGlobale,
        montantPaye,
        statutPaiement,
        modePaiement,
        observation,
        statut: 'VALIDEE',
        lignes: {
          create: lignesValides.map((l) => ({
            produitId: l.produitId,
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            tva: l.tva,
            remise: l.remise,
            montant: Math.round(l.montant), // montant already includes line discount and TVA
          })),
        },
      },
      include: { lignes: true, magasin: { select: { code: true, nom: true } } },
    })

    for (const l of lignesValides) {
      await prisma.stock.updateMany({
        where: { produitId: l.produitId, magasinId },
        data: { quantite: { decrement: l.quantite } },
      })
      await prisma.mouvement.create({
        data: {
          type: 'SORTIE',
          produitId: l.produitId,
          magasinId,
          entiteId: entiteId,
          utilisateurId: session.userId,
          quantite: l.quantite,
          observation: `Vente ${num}`,
        },
      })
    }

    // Comptabilisation automatique
    try {
      await comptabiliserVente({
        venteId: vente.id,
        numeroVente: num,
        date: dateVente,
        montantTotal,
        modePaiement,
        clientId,
        utilisateurId: session.userId,
      })
    } catch (comptaError) {
      console.error('Erreur comptabilisation vente:', comptaError)
      // On continue même si la comptabilisation échoue pour ne pas bloquer la vente
    }

    // Invalider le cache pour affichage immédiat sur tous les postes
    revalidatePath('/dashboard/ventes')
    revalidatePath('/api/ventes')

    return NextResponse.json(vente)
  } catch (e) {
    console.error('POST /api/ventes:', e)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
