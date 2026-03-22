import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return new NextResponse('Non autorisé', { status: 401 })

  try {
    const archives = await prisma.archiveSoldeClient.findMany({
      where: { entiteId: session.entiteId },
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

    // Blindage numérique
    const rawClientId = clientId ? Number(clientId) : null
    const rawMontant = Number(montant)

    if (isNaN(rawMontant)) {
       return new NextResponse('Montant invalide', { status: 400 })
    }

    if (!rawMontant || (!rawClientId && !clientLibre)) {
      return new NextResponse('Données manquantes', { status: 400 })
    }

    const archive = await prisma.archiveSoldeClient.create({
      data: {
        entiteId: session.entiteId,
        utilisateurId: session.userId,
        clientId: (rawClientId && !isNaN(rawClientId)) ? rawClientId : null,
        clientLibre,
        montant: rawMontant,
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
