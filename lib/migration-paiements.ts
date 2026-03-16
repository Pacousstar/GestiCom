import { prisma } from './db'

/**
 * Migration ponctuelle pour peupler ReglementVente à partir des montantPaye existants
 */
export async function migrerPaiementsExistants() {
  console.log('Début de la migration des paiements...')
  
  const ventesAvecPaiement = await prisma.vente.findMany({
    where: {
      montantPaye: { gt: 0 },
      reglementsVente: { none: {} } // Uniquement si aucun règlement n'existe déjà
    },
    select: {
      id: true,
      montantPaye: true,
      date: true,
      modePaiement: true,
      clientId: true,
      numero: true,
      utilisateurId: true
    }
  })

  let count = 0
  for (const v of ventesAvecPaiement) {
    if (v.clientId) {
      await prisma.reglementVente.create({
        data: {
          date: v.date,
          montant: v.montantPaye,
          modePaiement: v.modePaiement || 'ESPECES',
          venteId: v.id,
          clientId: v.clientId,
          utilisateurId: v.utilisateurId,
          observation: `Migration: Règlement facture ${v.numero}`
        }
      })
      count++
    }
  }

  // Idem pour les achats si nécessaire
  const achatsAvecPaiement = await prisma.achat.findMany({
    where: {
      montantPaye: { gt: 0 },
      reglementsAchat: { none: {} }
    },
    select: {
      id: true,
      montantPaye: true,
      date: true,
      modePaiement: true,
      fournisseurId: true,
      numero: true,
      utilisateurId: true
    }
  })

  let countAchat = 0
  for (const a of achatsAvecPaiement) {
    if (a.fournisseurId) {
      await prisma.reglementAchat.create({
        data: {
          date: a.date,
          montant: a.montantPaye,
          modePaiement: a.modePaiement || 'ESPECES',
          achatId: a.id,
          fournisseurId: a.fournisseurId,
          utilisateurId: a.utilisateurId,
          observation: `Migration: Règlement achat ${a.numero}`
        }
      })
      countAchat++
    }
  }

  console.log(`Migration terminée : ${count} ventes et ${countAchat} achats migrés.`)
  return { ventes: count, achats: countAchat }
}
