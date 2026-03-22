import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const userHeader = req.headers.get('x-user')
    if (!userHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const currentUser = JSON.parse(userHeader)

    const soldes = await prisma.archiveSoldeClient.findMany({
      where: { entiteId: currentUser.entiteId },
      include: {
        client: { select: { nom: true } },
        utilisateur: { select: { nom: true } }
      },
      orderBy: { dateArchive: 'desc' }
    })
    return NextResponse.json(soldes)
  } catch (error) {
    console.error('Erreur GET /api/archives/clients:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userHeader = req.headers.get('x-user')
    if (!userHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const currentUser = JSON.parse(userHeader)

    const body = await req.json()
    const { clientId, clientLibre, montant, dateArchive, observation } = body

    if (!montant || (!clientId && !clientLibre)) {
      return NextResponse.json({ error: 'Montant et identifiant du client requis' }, { status: 400 })
    }

    const solde = await prisma.archiveSoldeClient.create({
      data: {
        entiteId: currentUser.entiteId,
        utilisateurId: currentUser.id,
        clientId: clientId ? Number(clientId) : null,
        clientLibre: clientLibre || null,
        montant: Number(montant),
        dateArchive: dateArchive ? new Date(dateArchive) : new Date(),
        observation
      }
    })
    return NextResponse.json(solde, { status: 201 })
  } catch (error) {
    console.error('Erreur POST /api/archives/clients:', error)
    return NextResponse.json({ error: 'Erreur internet création archive solde' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const userHeader = req.headers.get('x-user')
    if (!userHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const currentUser = JSON.parse(userHeader)

    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
       return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    await prisma.archiveSoldeClient.delete({
      where: { id: Number(id) }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/archives/clients:', error)
    return NextResponse.json({ error: 'Erreur suppression archive' }, { status: 500 })
  }
}
