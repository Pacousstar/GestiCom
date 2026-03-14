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
    return NextResponse.json({ error: 'Id invalide.' }, { status: 400 })
  }

  const achat = await prisma.achat.findUnique({
    where: { id },
    include: {
      magasin: { select: { code: true, nom: true } },
      fournisseur: { select: { nom: true } },
      lignes: true,
    },
  })

  if (!achat) {
    return NextResponse.json({ error: 'Achat introuvable.' }, { status: 404 })
  }

  if (session.role !== 'SUPER_ADMIN') {
    const entiteId = await getEntiteId(session)
    if (achat.entiteId !== entiteId) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
    }
  }

  return NextResponse.json(achat)
}

/** Suppression définitive (Super Admin uniquement). Annule les stocks et supprime les écritures comptables. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Seul le Super Administrateur peut supprimer définitivement un achat.' }, { status: 403 })
  }

  const id = Number((await params).id)
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Id invalide.' }, { status: 400 })
  }

  try {
    const a = await prisma.achat.findUnique({
      where: { id },
      include: { lignes: true },
    })
    if (!a) return NextResponse.json({ error: 'Achat introuvable.' }, { status: 404 })

    await deleteEcrituresByReference('ACHAT', id)

    for (const l of a.lignes) {
      const st = await prisma.stock.findUnique({
        where: { produitId_magasinId: { produitId: l.produitId, magasinId: a.magasinId } },
      })
      if (st) {
        const newQty = Math.max(0, st.quantite - l.quantite)
        await prisma.stock.update({
          where: { id: st.id },
          data: { quantite: newQty },
        })
        await prisma.mouvement.create({
          data: {
            type: 'SORTIE',
            produitId: l.produitId,
            magasinId: a.magasinId,
            entiteId: a.entiteId,
            utilisateurId: session.userId,
            quantite: l.quantite,
            observation: `Suppression achat ${a.numero}`,
          },
        })
      }
    }

    await prisma.achat.delete({ where: { id } })
    
    // Invalider le cache pour affichage immédiat
    revalidatePath('/dashboard/achats')
    revalidatePath('/dashboard/stock')
    revalidatePath('/api/achats')
    
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/achats/[id]:', e)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

/** Mise à jour du règlement (Enregistrer un paiement sur un achat à crédit) */
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

    const achat = await prisma.achat.findUnique({
      where: { id },
      include: { magasin: true }
    })

    if (!achat) return NextResponse.json({ error: 'Achat introuvable.' }, { status: 404 })

    const nouveauMontantPaye = Math.min(achat.montantTotal, (achat.montantPaye || 0) + montantReglement)
    const nouveauStatut = nouveauMontantPaye >= achat.montantTotal ? 'PAYE' : 'PARTIEL'

    // 1. Mettre à jour l'achat
    const updatedAchat = await prisma.achat.update({
      where: { id },
      data: {
        montantPaye: nouveauMontantPaye,
        statutPaiement: nouveauStatut
      }
    })

    // 2. Enregistrer le mouvement de caisse/banque si ce n'est pas déjà fait via un autre mécanisme
    // On crée une entrée en "Caisse" pour la traçabilité immédiate
    await prisma.caisse.create({
      data: {
        date: new Date(),
        magasinId: achat.magasinId,
        type: 'SORTIE',
        motif: `Règlement Achat ${achat.numero}`,
        montant: montantReglement,
        utilisateurId: session.userId,
      }
    })

    // 3. Comptabilisation
    const { comptabiliserReglementAchat } = await import('@/lib/comptabilisation')
    await comptabiliserReglementAchat({
      achatId: achat.id,
      numeroAchat: achat.numero,
      date: new Date(),
      montant: montantReglement,
      modePaiement: modePaiement,
      utilisateurId: session.userId,
    })

    revalidatePath('/dashboard/achats')
    revalidatePath('/api/achats')
    
    return NextResponse.json(updatedAchat)
  } catch (e) {
    console.error('PATCH /api/achats/[id]:', e)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
