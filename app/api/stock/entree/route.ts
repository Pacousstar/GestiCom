import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logModification, getIpAddress, getUserAgent } from '@/lib/audit'
import { getEntiteId } from '@/lib/get-entite-id'
import { requirePermission } from '@/lib/require-role'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const forbidden = requirePermission(session, 'stocks:entree')
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const magasinId = Number(body?.magasinId)
    const produitId = Number(body?.produitId)
    const quantite = Math.max(1, Math.floor(Number(body?.quantite) || 0))
    const observation = body?.observation != null ? String(body.observation).trim() || null : null
    const dateStr = body?.date != null ? String(body.date).trim() : null
    const dateMouvement = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
    if (isNaN(dateMouvement.getTime())) {
      return NextResponse.json({ error: 'Date invalide.' }, { status: 400 })
    }

    if (!Number.isInteger(magasinId) || magasinId < 1 || !Number.isInteger(produitId) || produitId < 1) {
      return NextResponse.json({ error: 'Magasin et produit requis.' }, { status: 400 })
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.utilisateur.findUnique({
      where: { id: session.userId },
      select: { id: true },
    })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable.' }, { status: 401 })

    // Utiliser l'entité de la session
    const entiteId = await getEntiteId(session)

    const magasin = await prisma.magasin.findUnique({ where: { id: magasinId } })
    const produit = await prisma.produit.findUnique({ where: { id: produitId } })
    if (!magasin || !produit) {
      return NextResponse.json({ error: 'Magasin ou produit introuvable.' }, { status: 400 })
    }

    // Vérifier que le magasin appartient à l'entité sélectionnée (sauf SUPER_ADMIN)
    if (session.role !== 'SUPER_ADMIN' && magasin.entiteId !== entiteId) {
      return NextResponse.json({ error: 'Ce magasin n\'appartient pas à votre entité.' }, { status: 403 })
    }

    let st = await prisma.stock.findUnique({
      where: { produitId_magasinId: { produitId, magasinId } },
    })
    // Si le produit n'a pas encore de ligne de stock dans ce magasin, la créer (quantité 0)
    if (!st) {
      st = await prisma.stock.create({
        data: {
          produitId,
          magasinId,
          quantite: 0,
          quantiteInitiale: 0,
        },
      })
    }

    await prisma.mouvement.create({
      data: {
        date: dateMouvement,
        type: 'ENTREE',
        produitId,
        magasinId,
        entiteId: entiteId,
        utilisateurId: session.userId,
        quantite,
        observation: observation || 'Entrée stock',
      },
    })

    await prisma.stock.update({
      where: { id: st.id },
      data: { quantite: { increment: quantite } },
    })

    const updated = await prisma.stock.findUnique({
      where: { id: st.id },
      include: { produit: { select: { code: true, designation: true } }, magasin: { select: { code: true } } },
    })

    // Logger l'entrée de stock
    const ipAddress = getIpAddress(request)
    await logModification(
      session,
      'STOCK',
      st.id,
      `Entrée de stock : ${quantite} unité(s) pour ${updated?.produit.designation} dans ${updated?.magasin.code}`,
      { quantiteAvant: st.quantite },
      { quantiteApres: st.quantite + quantite, quantiteAjoutee: quantite },
      ipAddress
    )

    // Invalider le cache pour affichage immédiat
    revalidatePath('/dashboard/stock')
    revalidatePath('/api/stock')

    return NextResponse.json(updated)
  } catch (e) {
    console.error('POST /api/stock/entree:', e)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
