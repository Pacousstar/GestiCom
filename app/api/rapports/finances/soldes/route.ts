import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const entiteId = session.entiteId
  const typeRecherche = request.nextUrl.searchParams.get('type') // "CLIENT" | "FOURNISSEUR"

  try {
    if (typeRecherche === 'CLIENT') {
      const clients = await prisma.client.findMany({
        where: { actif: true },
        select: {
          id: true,
          code: true,
          nom: true,
          type: true,
          ventes: {
            where: {
              statut: 'VALIDEE',
              ...(entiteId && session.role !== 'SUPER_ADMIN' ? { entiteId } : {}),
            },
            select: { montantTotal: true, montantPaye: true }
          }
        }
      })

      const report = clients.map(c => {
        const totalDu = c.ventes.reduce((acc, v) => acc + v.montantTotal, 0)
        const totalPaye = c.ventes.reduce((acc, v) => acc + v.montantPaye, 0)
        // Le soldeInitial est soustrait car il est considéré comme un "dépôt/acompte" par défaut (Avoir)
        const solde = (totalDu - totalPaye) - (c.soldeInitial || 0)
        return {
          id: c.id,
          code: c.code,
          nom: c.nom,
          type: c.type,
          totalDu,
          totalPaye,
          solde
        }
      }).filter(c => Math.abs(c.solde) > 0.01)

      return NextResponse.json(report)
    } else {
      const fournisseurs = await prisma.fournisseur.findMany({
        where: { actif: true },
        select: {
          id: true,
          code: true,
          nom: true,
          achats: {
            where: {
              ...(entiteId && session.role !== 'SUPER_ADMIN' ? { entiteId } : {}),
            },
            select: { montantTotal: true, montantPaye: true }
          }
        }
      })

      const report = fournisseurs.map(f => {
        const totalDu = f.achats.reduce((acc, a) => acc + a.montantTotal, 0)
        const totalPaye = f.achats.reduce((acc, a) => acc + a.montantPaye, 0)
        // Solde initial fournisseur (souvent un acompte versé = Crédit pour nous, donc à soustraire de ce qu'on doit)
        const solde = (totalDu - totalPaye) - (f.soldeInitial || 0)
        return {
          id: f.id,
          code: f.code,
          nom: f.nom,
          totalDu,
          totalPaye,
          solde
        }
      }).filter(f => Math.abs(f.solde) > 0.01)

      return NextResponse.json(report)
    }
  } catch (error) {
    console.error('Erreur Rapport Soldes:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des soldes' }, { status: 500 })
  }
}
