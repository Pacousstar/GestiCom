import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q')?.toLowerCase()

  try {
    const paiements = await prisma.reglementVente.findMany({
      include: {
        client: { select: { code: true, nom: true } },
        vente: { select: { numero: true } },
      },
      orderBy: { date: 'desc' },
    })

    let filtered = paiements.map(p => ({
      id: p.id,
      date: p.date,
      clientCode: p.client?.code,
      clientNom: p.client?.nom,
      modePaiement: p.modePaiement,
      venteNumero: p.vente?.numero || 'Règlement Compte',
      montant: p.montant,
      observation: p.observation
    }))

    if (q) {
      filtered = filtered.filter(p => 
        p.clientNom?.toLowerCase().includes(q) || 
        p.venteNumero.toLowerCase().includes(q) ||
        p.clientCode?.toLowerCase().includes(q)
      )
    }

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('GET /api/clients/paiements:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
