import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return new NextResponse('Non autorisé', { status: 401 })

  try {
    const archives = await db.archiveSoldeClient.findMany({
      where: { entiteId: session.user.entiteId },
      include: {
        client: { select: { nom: true } },
        utilisateur: { select: { nom: true } }
      },
      orderBy: { dateArchive: 'desc' }
    })
    return NextResponse.json(archives)
  } catch (error) {
    console.error('Erreur GET Archives Soldes:', error)
    return new NextResponse('Erreur serveur', { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return new NextResponse('Non autorisé', { status: 401 })

  try {
    const body = await req.json()
    const { clientId, clientLibre, montant, dateArchive, observation } = body

    if (!montant || (!clientId && !clientLibre)) {
      return new NextResponse('Données manquantes', { status: 400 })
    }

    const archive = await db.archiveSoldeClient.create({
      data: {
        entiteId: session.user.entiteId,
        utilisateurId: session.user.id,
        clientId: clientId ? Number(clientId) : null,
        clientLibre,
        montant: Number(montant),
        dateArchive: dateArchive ? new Date(dateArchive) : new Date(),
        observation
      }
    })

    return NextResponse.json(archive)
  } catch (error) {
    console.error('Erreur POST Archive Solde:', error)
    return new NextResponse('Erreur serveur', { status: 500 })
  }
}
