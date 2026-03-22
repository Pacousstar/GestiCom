import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getEntiteId } from '@/lib/get-entite-id'
import { deleteEcrituresByReference } from '@/lib/delete-ecritures'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = Number((await params).id)
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'ID invalide.' }, { status: 400 })
  }

  const vente = await prisma.vente.findUnique({
    where: { id },
    include: {
      magasin: { select: { id: true, code: true, nom: true, localisation: true } },
      client: { select: { id: true, nom: true, telephone: true, type: true, adresse: true, ncc: true } },
      lignes: {
        include: { produit: { select: { id: true, code: true, designation: true } } },
      },
    },
  })

  if (!vente) return NextResponse.json({ error: 'Vente introuvable.' }, { status: 404 })

  if (session.role !== 'SUPER_ADMIN') {
    const entiteId = await getEntiteId(session)
    if (vente.entiteId !== entiteId) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
    }
  }

  return NextResponse.json(vente)
}

/** Suppression définitive (Super Admin uniquement). Annule les stocks et supprime les écritures comptables. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  
  // Note: Autorisation étendue aux ADMIN pour suppression "à souhait"
  if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Droits insuffisants pour supprimer une vente.' }, { status: 403 })
  }

  const id = Number((await params).id)
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'ID invalide.' }, { status: 400 })
  }

  try {
    const v = await prisma.vente.findUnique({
      where: { id },
      include: { lignes: true },
    })
    if (!v) return NextResponse.json({ error: 'Vente introuvable.' }, { status: 404 })

    await deleteEcrituresByReference('VENTE', id)

    // Nettoyage des mouvements de stocks originaux
    // L'observation lors de la création est "Vente ${v.numero}" ou "Vente Rapide ${v.numero}"
    await prisma.mouvement.deleteMany({
      where: {
        entiteId: v.entiteId,
        magasinId: v.magasinId,
        observation: { contains: v.numero }
      }
    })

    // Retour des produits au stock (incrément)
    for (const l of v.lignes) {
      await prisma.stock.updateMany({
        where: { produitId: l.produitId, magasinId: v.magasinId },
        data: { quantite: { increment: l.quantite } },
      })
    }

    await prisma.vente.delete({ where: { id } })
    
    // Invalider le cache pour affichage immédiat
    revalidatePath('/dashboard/ventes')
    revalidatePath('/api/ventes')
    
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/ventes/[id]:', e)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

/** Mise à jour du règlement (Enregistrer un paiement sur une vente à crédit) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const id = Number((await params).id)
  try {
    const body = await request.json()
    const montantReglement = Math.max(0, Number(body?.montant) || 0)
    const modePaiement = body?.modePaiement || 'ESPECES'

    if (montantReglement <= 0) {
      return NextResponse.json({ error: 'Montant invalide.' }, { status: 400 })
    }

    const vente = await prisma.vente.findUnique({
      where: { id },
      include: { magasin: true }
    })

    if (!vente) return NextResponse.json({ error: 'Vente introuvable.' }, { status: 404 })

    const nouveauMontantPaye = Math.min(vente.montantTotal, (vente.montantPaye || 0) + montantReglement)
    const nouveauStatut = nouveauMontantPaye >= vente.montantTotal ? 'PAYE' : 'PARTIEL'

    // 1. Mettre à jour la vente
    const updatedVente = await prisma.vente.update({
      where: { id },
      data: {
        montantPaye: nouveauMontantPaye,
        statutPaiement: nouveauStatut
      }
    })

    // 2. Comptabilisation
    const { comptabiliserReglementVente } = await import('@/lib/comptabilisation')
    await comptabiliserReglementVente({
      venteId: vente.id,
      numeroVente: vente.numero,
      date: new Date(),
      montant: montantReglement,
      modePaiement: modePaiement,
      utilisateurId: session.userId,
    })

    revalidatePath('/dashboard/ventes')
    revalidatePath('/api/ventes')
    
    return NextResponse.json(updatedVente)
  } catch (e) {
    console.error('PATCH /api/ventes/[id]:', e)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
