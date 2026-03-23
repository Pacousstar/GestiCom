import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/require-role'
import { comptabiliserReglementAchat } from '@/lib/comptabilisation'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const forbidden = requirePermission(session, 'achats:create')
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const achatId = body.achatId ? Number(body.achatId) : null
    const fournisseurId = body.fournisseurId ? Number(body.fournisseurId) : null
    const montant = Math.max(0, Number(body.montant))
    const modePaiement = body.modePaiement || 'ESPECES'
    const observation = body.observation || (achatId ? `Règlement achat` : `Acompte fournisseur`)

    if (!montant || (!achatId && !fournisseurId)) {
      return NextResponse.json({ error: 'Montant et (Achat ou Fournisseur) requis.' }, { status: 400 })
    }

    const res = await prisma.$transaction(async (tx) => {
      const targetFournisseurId = achatId ? (await tx.achat.findUnique({ where: { id: achatId } }))?.fournisseurId : fournisseurId
      if (!targetFournisseurId) throw new Error('Fournisseur introuvable')

      const reglement = await tx.reglementAchat.create({
        data: {
          achatId,
          fournisseurId: targetFournisseurId,
          montant,
          modePaiement,
          utilisateurId: session.userId,
          observation,
          date: new Date()
        }
      })

      if (achatId) {
        const achat = await tx.achat.findUnique({ where: { id: achatId } })
        if (achat) {
          const nouveauMontantPaye = (achat.montantPaye || 0) + montant
          const nouveauStatutPaiement = nouveauMontantPaye >= achat.montantTotal - 0.01 ? 'PAYE' : 'PARTIEL'
          await tx.achat.update({
            where: { id: achatId },
            data: { montantPaye: nouveauMontantPaye, statutPaiement: nouveauStatutPaiement }
          })
        }
      }

      return reglement
    })

    // Comptabilisation automatique
    try {
      const a = await prisma.achat.findUnique({ where: { id: achatId! }, select: { numero: true } })
      await comptabiliserReglementAchat({
        achatId: achatId!,
        numeroAchat: a?.numero || String(achatId),
        date: new Date(),
        montant,
        modePaiement,
        utilisateurId: session.userId,
      })
    } catch (e) { console.error('Erreur compta règlement achat:', e) }

    revalidatePath('/dashboard/achats')
    revalidatePath('/dashboard/fournisseurs')
    
    return NextResponse.json(res)
  } catch (error) {
    console.error('Erreur Règlement Achat:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
