import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const userHeader = req.headers.get('x-user')
    if (!userHeader) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const currentUser = JSON.parse(userHeader)

    const data = await req.json()
    const {
      magasinId,
      clientId,
      modePaiement,
      numeroFactureOrigine,
      dateFacture,
      lignes
    } = data

    if (!magasinId || !numeroFactureOrigine || !lignes || lignes.length === 0) {
      return NextResponse.json({ error: 'Données incomplètes (magasin, N°, lignes manquants)' }, { status: 400 })
    }

    // Calcul du total
    const montantTotal = lignes.reduce((acc: number, l: any) => acc + (l.quantite * l.prixUnitaire), 0)

    const nouvelleArchive = await prisma.archiveVente.create({
      data: {
        numeroFactureOrigine: String(numeroFactureOrigine),
        date: dateFacture ? new Date(dateFacture) : new Date(),
        magasinId: Number(magasinId),
        entiteId: currentUser.entiteId,
        utilisateurId: currentUser.id,
        clientId: clientId ? Number(clientId) : null,
        clientLibre: !clientId ? 'Client de passage' : null,
        montantTotal,
        lignes: {
          create: lignes.map((l: any) => ({
            designation: "Produit ID: " + l.produitId, // ou un nom complet si c'était envoyé
            quantite: Number(l.quantite),
            prixUnitaire: Number(l.prixUnitaire),
            montant: Number(l.quantite) * Number(l.prixUnitaire)
          }))
        }
      }
    })

    return NextResponse.json(nouvelleArchive, { status: 201 })
  } catch (error: any) {
    console.error('Erreur API Archives Ventes:', error)
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
  }
}
