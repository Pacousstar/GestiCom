import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/require-role'
import { comptabiliserReglementVente } from '@/lib/comptabilisation'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const forbidden = requirePermission(session, 'ventes:create')
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const venteId = body.venteId ? Number(body.venteId) : null
    const clientId = body.clientId ? Number(body.clientId) : (body.venteId ? null : null)
    const montant = Math.max(0, Number(body.montant))
    const modePaiement = body.modePaiement || 'ESPECES'
    const observation = body.observation || (venteId ? `Règlement vente` : `Acompte client`)

    if (!montant || (!venteId && !clientId)) {
      return NextResponse.json({ error: 'Montant et (Vente ou Client) requis.' }, { status: 400 })
    }

    // Transaction Prisma
    const res = await prisma.$transaction(async (tx) => {
      const targetClientId = venteId ? (await tx.vente.findUnique({ where: { id: venteId } }))?.clientId : clientId
      if (!targetClientId) throw new Error('Client introuvable')

      const reglement = await tx.reglementVente.create({
        data: {
          venteId,
          clientId: targetClientId,
          montant,
          modePaiement,
          utilisateurId: session.userId,
          observation,
          date: new Date()
        }
      })

      if (venteId) {
        const vente = await tx.vente.findUnique({ where: { id: venteId } })
        if (vente) {
          const nouveauMontantPaye = (vente.montantPaye || 0) + montant
          const nouveauStatutPaiement = nouveauMontantPaye >= vente.montantTotal - 0.01 ? 'PAYE' : 'PARTIEL'
          await tx.vente.update({
            where: { id: venteId },
            data: { montantPaye: nouveauMontantPaye, statutPaiement: nouveauStatutPaiement }
          })
        }
      }

      // Points de fidélité
      await tx.client.update({
        where: { id: targetClientId },
        data: { pointsFidelite: { increment: Math.floor(montant) } }
      })

      return reglement
    })

    // Comptabilisation automatique
    try {
      const v = await prisma.vente.findUnique({ where: { id: venteId! }, select: { numero: true } })
      await comptabiliserReglementVente({
        venteId: venteId!,
        numeroVente: v?.numero || String(venteId),
        date: new Date(),
        montant,
        modePaiement,
        utilisateurId: session.userId,
      })
    } catch (e) { console.error('Erreur compta règlement:', e) }

    revalidatePath('/dashboard/ventes')
    revalidatePath('/dashboard/clients')
    
    return NextResponse.json(res)
  } catch (error) {
    console.error('Erreur Règlement Vente:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
