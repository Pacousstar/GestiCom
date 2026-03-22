const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const fournisseurs = await prisma.fournisseur.findMany({
    where: { actif: true },
    select: {
      id: true,
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

  fournisseurs.forEach(f => {
    const totalAchats = f.achats.reduce((acc, a) => acc + a.montantTotal, 0)
    const totalPaye = f.achats.reduce((acc, a) => acc + a.montantPaye, 0)
    const resteAchats = totalAchats - totalPaye
    const detteTotale = resteAchats - f.soldeInitial
    
    console.log(`Fournisseur: ${f.nom}`)
    console.log(`  - Solde Initial (Avoir/Crédit): ${f.soldeInitial} F`)
    console.log(`  - Somme des Achats: ${totalAchats} F`)
    console.log(`  - Somme des Payé: ${totalPaye} F`)
    console.log(`  - Reste à payer sur achats: ${resteAchats} F`)
    console.log(`  - Dette Totale Finale = (${resteAchats} - ${f.soldeInitial}) = ${detteTotale} F`)
    console.log('---')
  })
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
