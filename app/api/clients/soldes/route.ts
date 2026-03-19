import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getEntiteId } from '@/lib/get-entite-id'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const entiteId = await getEntiteId(session)
  const searchParams = request.nextUrl.searchParams
  const dateDebut = searchParams.get('dateDebut')
  const dateFin = searchParams.get('dateFin')

  try {
    const clients = await prisma.client.findMany({
      where: { actif: true },
      select: {
        id: true,
        code: true,
        nom: true,
        telephone: true,
        ncc: true,
        localisation: true,
        soldeInitial: true,
      },
      orderBy: { nom: 'asc' },
    })

    const whereVente: any = {
      entiteId,
      statut: 'VALIDEE',
      clientId: { not: null },
    }
    
    // Pour les règlements, la relation Vente donne l'entité
    const whereReglement: any = {
      vente: { entiteId },
    }

    if (dateDebut && dateFin) {
      const gte = new Date(dateDebut + 'T00:00:00')
      const lte = new Date(dateFin + 'T23:59:59')
      whereVente.date = { gte, lte }
      whereReglement.date = { gte, lte }
    }

    const ventes = await prisma.vente.groupBy({
      by: ['clientId'],
      where: whereVente,
      _sum: { montantTotal: true },
    })

    const reglements = await prisma.reglementVente.groupBy({
      by: ['clientId'],
      where: whereReglement,
      _sum: { montant: true },
    })

    // Requêtes globales pour le solde final absolu
    const ventesGlobales = await prisma.vente.groupBy({
      by: ['clientId'],
      where: { entiteId, statut: 'VALIDEE', clientId: { not: null } },
      _sum: { montantTotal: true },
    })

    const reglementsGlobaux = await prisma.reglementVente.groupBy({
      by: ['clientId'],
      where: { vente: { entiteId } },
      _sum: { montant: true },
    })

    const venteMap = Object.fromEntries(ventes.map((v) => [v.clientId, v._sum.montantTotal || 0]))
    const reglementMap = Object.fromEntries(reglements.map((r) => [r.clientId, r._sum.montant || 0]))
    const venteGlobaleMap = Object.fromEntries(ventesGlobales.map((v) => [v.clientId, v._sum.montantTotal || 0]))
    const reglementGlobaleMap = Object.fromEntries(reglementsGlobaux.map((r) => [r.clientId, r._sum.montant || 0]))

    let data = clients.map((c) => {
      const factures = venteMap[c.id] || 0
      const paiements = reglementMap[c.id] || 0
      
      const facturesGlobal = venteGlobaleMap[c.id] || 0
      const paiementsGlobal = reglementGlobaleMap[c.id] || 0
      // soldeInitial = dette initiale existante avant usage de GestiCom (doit être AJOUTÉE)
      const soldeInitial = c.soldeInitial || 0
      
      const variationPeriode = factures - paiements
      // ✅ FORMULE CORRIGÉE : SoldeGlobal = Dettes(factures-paiements) + DetteDépart
      const soldeClient = facturesGlobal - paiementsGlobal + soldeInitial

      const statut = soldeClient > 0.01 ? 'DOIT' : soldeClient < -0.01 ? 'CREDIT' : 'SOLDE'

      return {
        ...c,
        factures,
        paiements,
        variationPeriode,
        soldeClient,
        statut,
      }
    })

    const q = searchParams.get('q')?.toLowerCase()
    if (q) {
      data = data.filter(
        (c) =>
          c.nom.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q) ||
          c.localisation?.toLowerCase().includes(q)
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET /api/clients/soldes:', error)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
