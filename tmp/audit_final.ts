import { prisma } from '../lib/db'

async function main() {
  const f = await prisma.fournisseur.findMany({
    where: { actif: true },
    select: {
      nom: true,
      soldeInitial: true,
      achats: {
        select: {
          montantTotal: true,
          montantPaye: true
        }
      }
    }
  })

  console.log('RESULTAT_AUDIT_START')
  console.log(JSON.stringify(f, null, 2))
  console.log('RESULTAT_AUDIT_END')
}

main().catch(console.error)
