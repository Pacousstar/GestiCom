import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/lib/require-role'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const forbidden = requirePermission(session, 'achats:create')
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const achatId = Number(body.achatId)
    const montant = Math.max(0, Number(body.montant))
    const modePaiement = body.modePaiement || 'ESPECES'
    const observation = body.observation || `Règlement fournisseur`

    if (!achatId || !montant) {
      return NextResponse.json({ error: 'Achat et montant requis.' }, { status: 400 })
    }

    const achat = await prisma.achat.findUnique({
      where: { id: achatId }
    })

    if (!achat) return NextResponse.json({ error: 'Achat introuvable.' }, { status: 404 })
    
    const resteAPayer = achat.montantTotal - (achat.montantPaye || 0)
    if (montant > resteAPayer + 0.01) {
      return NextResponse.json({ error: `Le montant dépasse le reste à payer (${resteAPayer}).` }, { status: 400 })
    }

    const res = await prisma.$transaction(async (tx) => {
      const reglement = await tx.reglementAchat.create({
        data: {
          achatId,
          fournisseurId: achat.fournisseurId!,
          montant,
          modePaiement,
          utilisateurId: session.userId,
          observation,
          date: new Date()
        }
      })

      const nouveauMontantPaye = (achat.montantPaye || 0) + montant
      const nouveauStatutPaiement = nouveauMontantPaye >= achat.montantTotal - 0.01 ? 'PAYE' : 'PARTIEL'

      await tx.achat.update({
        where: { id: achatId },
        data: {
          montantPaye: nouveauMontantPaye,
          statutPaiement: nouveauStatutPaiement
        }
      })

      return reglement
    })

    revalidatePath('/dashboard/achats')
    revalidatePath('/dashboard/fournisseurs')
    
    return NextResponse.json(res)
  } catch (error) {
    console.error('Erreur Règlement Achat:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
