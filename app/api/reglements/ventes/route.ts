import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/require-role'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const forbidden = requirePermission(session, 'ventes:create')
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const venteId = Number(body.venteId)
    const montant = Math.max(0, Number(body.montant))
    const modePaiement = body.modePaiement || 'ESPECES'
    const observation = body.observation || `Règlement partiel`

    if (!venteId || !montant) {
      return NextResponse.json({ error: 'Vente et montant requis.' }, { status: 400 })
    }

    const vente = await prisma.vente.findUnique({
      where: { id: venteId },
      include: { client: true }
    })

    if (!vente) return NextResponse.json({ error: 'Vente introuvable.' }, { status: 404 })
    
    const resteAPayer = vente.montantTotal - (vente.montantPaye || 0)
    if (montant > resteAPayer + 0.01) {
      return NextResponse.json({ error: `Le montant dépasse le reste à payer (${resteAPayer}).` }, { status: 400 })
    }

    // Transaction Prisma : Créer règlement + Mettre à jour vente
    const res = await prisma.$transaction(async (tx) => {
      const reglement = await tx.reglementVente.create({
        data: {
          venteId,
          clientId: vente.clientId!,
          montant,
          modePaiement,
          utilisateurId: session.userId,
          observation,
          date: new Date()
        }
      })

      const nouveauMontantPaye = (vente.montantPaye || 0) + montant
      const nouveauStatutPaiement = nouveauMontantPaye >= vente.montantTotal - 0.01 ? 'PAYE' : 'PARTIEL'

      await tx.vente.update({
        where: { id: venteId },
        data: {
          montantPaye: nouveauMontantPaye,
          statutPaiement: nouveauStatutPaiement
        }
      })

      // Points de fidélité si applicable
      if (vente.clientId) {
        await tx.client.update({
          where: { id: vente.clientId },
          data: { pointsFidelite: { increment: Math.floor(montant) } }
        })
      }

      return reglement
    })

    revalidatePath('/dashboard/ventes')
    revalidatePath('/dashboard/clients')
    
    return NextResponse.json(res)
  } catch (error) {
    console.error('Erreur Règlement Vente:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
