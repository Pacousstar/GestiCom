import { prisma } from './db'

/**
 * Service de comptabilisation automatique SYSCOHADA
 * Génère automatiquement les écritures comptables à partir des opérations métier
 */

// Comptes SYSCOHADA par défaut
export const COMPTES_DEFAUT = {
  // CLASSE 3 - STOCKS
  STOCK_MARCHANDISES: '31', // Stock de marchandises
  
  // CLASSE 4 - TIERS
  FOURNISSEURS: '401', // Fournisseurs
  CLIENTS: '411', // Clients
  
  // CLASSE 5 - TRÉSORERIE
  CAISSE: '531', // Caisse
  BANQUE: '512', // Banque
  
  // CLASSE 6 - CHARGES
  ACHATS_MARCHANDISES: '601', // Achats de marchandises
  ACHATS_MATIERES: '602', // Achats de matières premières
  SERVICES_EXTERIEURS: '606', // Services extérieurs
  IMPOTS_TAXES: '631', // Impôts, taxes et versements assimilés
  CHARGES_PERSONNEL: '641', // Charges de personnel
  AUTRES_CHARGES: '658', // Autres charges
  
  // CLASSE 7 - PRODUITS
  VENTES_MARCHANDISES: '701', // Ventes de marchandises
  PRODUITS_DIVERS: '758', // Produits divers
}

// Alias pour compatibilité
const VENTES_MARCHANDISES = COMPTES_DEFAUT.VENTES_MARCHANDISES

/**
 * Récupère ou crée un compte par son numéro
 */
async function getOrCreateCompte(numero: string, libelle: string, classe: string, type: string) {
  let compte = await prisma.planCompte.findUnique({ where: { numero } })
  
  if (!compte) {
    compte = await prisma.planCompte.create({
      data: { numero, libelle, classe, type, actif: true },
    })
  }
  
  return compte
}

/**
 * Récupère ou crée un journal par son code
 */
async function getOrCreateJournal(code: string, libelle: string, type: string) {
  let journal = await prisma.journal.findUnique({ where: { code } })
  
  if (!journal) {
    journal = await prisma.journal.create({
      data: { code, libelle, type, actif: true },
    })
  }
  
  return journal
}

/**
 * Crée une écriture comptable
 */
async function createEcriture(data: {
  date: Date
  journalId: number
  piece: string | null
  libelle: string
  compteId: number
  debit: number
  credit: number
  reference: string | null
  referenceType: string | null
  referenceId: number | null
  utilisateurId: number
}) {
  const numero = `ECR-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
  
  return await prisma.ecritureComptable.create({
    data: {
      numero,
      ...data,
    },
  })
}

/**
 * Comptabilise une vente
 */
export async function comptabiliserVente(data: {
  venteId: number
  numeroVente: string
  date: Date
  montantTotal: number
  modePaiement: string
  clientId?: number | null
  utilisateurId: number
}) {
  const journal = await getOrCreateJournal('VE', 'Journal des Ventes', 'VENTES')
  const compteVentes = await getOrCreateCompte(
    '701',
    'Ventes de marchandises',
    '7',
    'PRODUITS'
  )
  
  // Déterminer le compte de règlement
  let compteReglement: { id: number }
  if (data.modePaiement === 'CREDIT' && data.clientId) {
    // Vente à crédit → compte Clients
    compteReglement = await getOrCreateCompte(
      COMPTES_DEFAUT.CLIENTS,
      'Clients',
      '4',
      'ACTIF'
    )
  } else {
    // Paiement immédiat → compte Caisse
    compteReglement = await getOrCreateCompte(
      COMPTES_DEFAUT.CAISSE,
      'Caisse',
      '5',
      'ACTIF'
    )
  }
  
  // Écriture 1 : Débit Clients/Caisse, Crédit Ventes
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: data.numeroVente,
    libelle: `Vente ${data.numeroVente}`,
    compteId: compteReglement.id,
    debit: data.montantTotal,
    credit: 0,
    reference: data.numeroVente,
    referenceType: 'VENTE',
    referenceId: data.venteId,
    utilisateurId: data.utilisateurId,
  })
  
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: data.numeroVente,
    libelle: `Vente ${data.numeroVente}`,
    compteId: compteVentes.id,
    debit: 0,
    credit: data.montantTotal,
    reference: data.numeroVente,
    referenceType: 'VENTE',
    referenceId: data.venteId,
    utilisateurId: data.utilisateurId,
  })

  // === AJOUT : Enregistrement automatique en Caisse/Banque si paiement immédiat ===
  if (data.modePaiement !== 'CREDIT') {
    const motif = `Encaissement Vente ${data.numeroVente}`
    const date = data.date || new Date()
    const utilisateurId = data.utilisateurId
    
    // Récupérer le magasinId de la vente
    const vente = await prisma.vente.findUnique({ where: { id: data.venteId }, select: { magasinId: true } })
    const magasinId = vente?.magasinId

    if (data.modePaiement === 'ESPECES' && magasinId) {
      await prisma.caisse.create({
        data: { date, magasinId, type: 'ENTREE', motif, montant: data.montantTotal, utilisateurId }
      })
    } else if (['CHEQUE', 'VIREMENT', 'MOBILE_MONEY'].includes(data.modePaiement)) {
      const banque = await prisma.banque.findFirst({ where: { actif: true } })
      if (banque) {
        await prisma.banque.update({
          where: { id: banque.id },
          data: { soldeActuel: { increment: data.montantTotal } }
        })
      }
    }
  }
}

/**
 * Comptabilise un règlement sur une vente (Crédit vers Règlement)
 */
export async function comptabiliserReglementVente(data: {
  venteId: number
  numeroVente: string
  date: Date
  montant: number
  modePaiement: string
  utilisateurId: number
}) {
  const journal = await getOrCreateJournal('CA', 'Journal de Caisse', 'CAISSE')
  const compteClient = await getOrCreateCompte(
    COMPTES_DEFAUT.CLIENTS,
    'Clients',
    '4',
    'ACTIF'
  )
  
  // Déterminer le compte de trésorerie
  let compteTresorerie: { id: number }
  if (data.modePaiement === 'VIREMENT') {
    compteTresorerie = await getOrCreateCompte(COMPTES_DEFAUT.BANQUE, 'Banque', '5', 'ACTIF')
  } else {
    compteTresorerie = await getOrCreateCompte(COMPTES_DEFAUT.CAISSE, 'Caisse', '5', 'ACTIF')
  }
  
  // Écriture : Débit Caisse/Banque (entrée d'argent), Crédit Clients (réduit la créance)
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: data.numeroVente,
    libelle: `Règlement Vente ${data.numeroVente}`,
    compteId: compteTresorerie.id,
    debit: data.montant,
    credit: 0,
    reference: `REG-VEN-${data.venteId}`,
    referenceType: 'VENTE_REGLEMENT',
    referenceId: data.venteId,
    utilisateurId: data.utilisateurId,
  })
  
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: data.numeroVente,
    libelle: `Règlement Vente ${data.numeroVente}`,
    compteId: compteClient.id,
    debit: 0,
    credit: data.montant,
    reference: `REG-VEN-${data.venteId}`,
    referenceType: 'VENTE_REGLEMENT',
    referenceId: data.venteId,
    utilisateurId: data.utilisateurId,
  })

  // === AJOUT : Enregistrement automatique en Caisse/Banque ===
  // Récupérer le magasinId de la vente
  const v = await prisma.vente.findUnique({ where: { id: data.venteId }, select: { magasinId: true } })
  const magasinId = v?.magasinId

  if (data.modePaiement === 'ESPECES' && magasinId) {
    await prisma.caisse.create({
      data: { date: data.date, magasinId, type: 'ENTREE', motif: `Règlement Vente ${data.numeroVente}`, montant: data.montant, utilisateurId: data.utilisateurId }
    })
  } else if (['CHEQUE', 'VIREMENT', 'MOBILE_MONEY'].includes(data.modePaiement)) {
    const banque = await prisma.banque.findFirst({ where: { actif: true } })
    if (banque) {
      await prisma.banque.update({
        where: { id: banque.id },
        data: { soldeActuel: { increment: data.montant } }
      })
    }
  }
}

/**
 * Comptabilise un achat
 */
export async function comptabiliserAchat(data: {
  achatId: number
  numeroAchat: string
  date: Date
  montantTotal: number
  modePaiement: string
  fournisseurId?: number | null
  utilisateurId: number
  magasinId?: number | null
}) {
  const journal = await getOrCreateJournal('AC', 'Journal des Achats', 'ACHATS')
  const compteAchats = await getOrCreateCompte(
    COMPTES_DEFAUT.ACHATS_MARCHANDISES,
    'Achats de marchandises',
    '6',
    'CHARGES'
  )
  
  // Déterminer le compte de règlement
  let compteReglement: { id: number }
  if (data.modePaiement === 'CREDIT' && data.fournisseurId) {
    // Achat à crédit → compte Fournisseurs
    compteReglement = await getOrCreateCompte(
      COMPTES_DEFAUT.FOURNISSEURS,
      'Fournisseurs',
      '4',
      'PASSIF'
    )
  } else {
    // Paiement immédiat → compte Caisse
    compteReglement = await getOrCreateCompte(
      COMPTES_DEFAUT.CAISSE,
      'Caisse',
      '5',
      'ACTIF'
    )
  }
  
  // Écriture 1 : Débit Achats, Crédit Fournisseurs/Caisse
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: data.numeroAchat,
    libelle: `Achat ${data.numeroAchat}`,
    compteId: compteAchats.id,
    debit: data.montantTotal,
    credit: 0,
    reference: data.numeroAchat,
    referenceType: 'ACHAT',
    referenceId: data.achatId,
    utilisateurId: data.utilisateurId,
  })
  
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: data.numeroAchat,
    libelle: `Achat ${data.numeroAchat}`,
    compteId: compteReglement.id,
    debit: 0,
    credit: data.montantTotal,
    reference: data.numeroAchat,
    referenceType: 'ACHAT',
    referenceId: data.achatId,
    utilisateurId: data.utilisateurId,
  })

  // === AJOUT : Enregistrement automatique en Caisse/Banque si paiement immédiat ===
  if (data.modePaiement !== 'CREDIT') {
    const motif = `Paiement Achat ${data.numeroAchat}`
    const date = data.date || new Date()
    const utilisateurId = data.utilisateurId
    const magasinId = data.magasinId // Assumer que magasinId est dans data ou le fetcher

    if (data.modePaiement === 'ESPECES' && magasinId) {
      await prisma.caisse.create({
        data: { date, magasinId: Number(magasinId), type: 'SORTIE', motif, montant: data.montantTotal, utilisateurId }
      })
    } else if (['CHEQUE', 'VIREMENT', 'MOBILE_MONEY'].includes(data.modePaiement)) {
      const banque = await prisma.banque.findFirst({ where: { actif: true } })
      if (banque) {
        await prisma.banque.update({
          where: { id: banque.id },
          data: { soldeActuel: { decrement: data.montantTotal } }
        })
      }
    }
  }
}

/**
 * Comptabilise un règlement sur un achat (Crédit vers Règlement)
 */
export async function comptabiliserReglementAchat(data: {
  achatId: number
  numeroAchat: string
  date: Date
  montant: number
  modePaiement: string
  utilisateurId: number
  magasinId?: number | null
}) {
  const journal = await getOrCreateJournal('CA', 'Journal de Caisse', 'CAISSE')
  const compteFournisseur = await getOrCreateCompte(
    COMPTES_DEFAUT.FOURNISSEURS,
    'Fournisseurs',
    '4',
    'PASSIF'
  )
  
  // Déterminer le compte de trésorerie
  let compteTresorerie: { id: number }
  if (data.modePaiement === 'VIREMENT') {
    compteTresorerie = await getOrCreateCompte(COMPTES_DEFAUT.BANQUE, 'Banque', '5', 'ACTIF')
  } else {
    compteTresorerie = await getOrCreateCompte(COMPTES_DEFAUT.CAISSE, 'Caisse', '5', 'ACTIF')
  }
  
  // Écriture : Débit Fournisseurs (réduit la dette), Crédit Caisse/Banque (sortie d'argent)
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: data.numeroAchat,
    libelle: `Règlement Achat ${data.numeroAchat}`,
    compteId: compteFournisseur.id,
    debit: data.montant,
    credit: 0,
    reference: `REG-ACH-${data.achatId}`,
    referenceType: 'ACHAT_REGLEMENT',
    referenceId: data.achatId,
    utilisateurId: data.utilisateurId,
  })
  
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: data.numeroAchat,
    libelle: `Règlement Achat ${data.numeroAchat}`,
    compteId: compteTresorerie.id,
    debit: 0,
    credit: data.montant,
    reference: `REG-ACH-${data.achatId}`,
    referenceType: 'ACHAT_REGLEMENT',
    referenceId: data.achatId,
    utilisateurId: data.utilisateurId,
  })


  // === AJOUT : Enregistrement automatique en Caisse/Banque ===
  const a = await prisma.achat.findUnique({ where: { id: data.achatId }, select: { magasinId: true } })
  const magasinId = a?.magasinId

  if (data.modePaiement === 'ESPECES' && magasinId) {
    await prisma.caisse.create({
      data: { date: data.date, magasinId, type: 'SORTIE', motif: `Règlement Achat ${data.numeroAchat}`, montant: data.montant, utilisateurId: data.utilisateurId }
    })
  } else if (['CHEQUE', 'VIREMENT', 'MOBILE_MONEY'].includes(data.modePaiement)) {
    const banque = await prisma.banque.findFirst({ where: { actif: true } })
    if (banque) {
      await prisma.banque.update({
        where: { id: banque.id },
        data: { soldeActuel: { decrement: data.montant } }
      })
    }
  }
}

/**
 * Comptabilise une dépense
 */
export async function comptabiliserDepense(data: {
  depenseId: number
  date: Date
  montant: number
  categorie: string
  libelle: string
  modePaiement: string
  utilisateurId: number
  magasinId?: number | null
}) {
  const journal = await getOrCreateJournal('OD', 'Journal des Opérations Diverses', 'OD')
  
  // Déterminer le compte de charge selon la catégorie
  let compteCharge: { id: number }
  const categorieUpper = data.categorie.toUpperCase()
  
  if (categorieUpper.includes('LOYER')) {
    compteCharge = await getOrCreateCompte('613', 'Loyers', '6', 'CHARGES')
  } else if (categorieUpper.includes('SALAIRE')) {
    compteCharge = await getOrCreateCompte(
      COMPTES_DEFAUT.CHARGES_PERSONNEL,
      'Charges de personnel',
      '6',
      'CHARGES'
    )
  } else if (categorieUpper.includes('TRANSPORT')) {
    compteCharge = await getOrCreateCompte('624', 'Transports', '6', 'CHARGES')
  } else if (categorieUpper.includes('COMMUNICATION')) {
    compteCharge = await getOrCreateCompte('626', 'Services bancaires et assimilés', '6', 'CHARGES')
  } else if (categorieUpper.includes('MAINTENANCE')) {
    compteCharge = await getOrCreateCompte('615', 'Entretien et réparations', '6', 'CHARGES')
  } else if (categorieUpper.includes('PUBLICITE')) {
    compteCharge = await getOrCreateCompte('612', 'Publicité, publications, relations publiques', '6', 'CHARGES')
  } else if (categorieUpper.includes('ASSURANCE')) {
    compteCharge = await getOrCreateCompte('616', 'Primes d\'assurances', '6', 'CHARGES')
  } else if (categorieUpper.includes('IMPOT')) {
    compteCharge = await getOrCreateCompte(
      COMPTES_DEFAUT.IMPOTS_TAXES,
      'Impôts, taxes et versements assimilés',
      '6',
      'CHARGES'
    )
  } else {
    compteCharge = await getOrCreateCompte(
      COMPTES_DEFAUT.AUTRES_CHARGES,
      'Autres charges',
      '6',
      'CHARGES'
    )
  }
  
  // Déterminer le compte de règlement
  const compteReglement = await getOrCreateCompte(
    COMPTES_DEFAUT.CAISSE,
    'Caisse',
    '5',
    'ACTIF'
  )
  
  // Écriture 1 : Débit Charge, Crédit Caisse
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: null,
    libelle: data.libelle,
    compteId: compteCharge.id,
    debit: data.montant,
    credit: 0,
    reference: `DEP-${data.depenseId}`,
    referenceType: 'DEPENSE',
    referenceId: data.depenseId,
    utilisateurId: data.utilisateurId,
  })
  
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: null,
    libelle: data.libelle,
    compteId: compteReglement.id,
    debit: 0,
    credit: data.montant,
    reference: `DEP-${data.depenseId}`,
    referenceType: 'DEPENSE',
    referenceId: data.depenseId,
    utilisateurId: data.utilisateurId,
  })

  // === AJOUT : Enregistrement automatique en Caisse/Banque ===
  const motif = `Dépense: ${data.libelle}`
  const date = data.date || new Date()
  
  if (data.modePaiement === 'ESPECES') {
    // Utiliser le magasinId fourni
    const effectiveMagasinId = data.magasinId || null
    if (effectiveMagasinId) {
      await prisma.caisse.create({
        data: { date, magasinId: effectiveMagasinId, type: 'SORTIE', motif, montant: data.montant, utilisateurId: data.utilisateurId }
      })
    }
  } else if (['CHEQUE', 'VIREMENT', 'MOBILE_MONEY'].includes(data.modePaiement)) {
    const banque = await prisma.banque.findFirst({ where: { actif: true } })
    if (banque) {
      await prisma.banque.update({
        where: { id: banque.id },
        data: { soldeActuel: { decrement: data.montant } }
      })
    }
  }
}

/**
 * Comptabilise une charge
 */
export async function comptabiliserCharge(data: {
  chargeId: number
  date: Date
  montant: number
  rubrique: string
  libelle?: string | null
  utilisateurId: number
  magasinId?: number | null
}) {
  const journal = await getOrCreateJournal('OD', 'Journal des Opérations Diverses', 'OD')
  
  // Déterminer le compte de charge selon la rubrique
  let compteCharge: { id: number }
  const rubriqueUpper = data.rubrique.toUpperCase()
  
  if (rubriqueUpper.includes('LOYER')) {
    compteCharge = await getOrCreateCompte('613', 'Loyers', '6', 'CHARGES')
  } else if (rubriqueUpper.includes('SALAIRE')) {
    compteCharge = await getOrCreateCompte(
      COMPTES_DEFAUT.CHARGES_PERSONNEL,
      'Charges de personnel',
      '6',
      'CHARGES'
    )
  } else if (rubriqueUpper.includes('ELECTRICITE') || rubriqueUpper.includes('EAU')) {
    compteCharge = await getOrCreateCompte('614', 'Charges locatives et de copropriété', '6', 'CHARGES')
  } else if (rubriqueUpper.includes('TRANSPORT')) {
    compteCharge = await getOrCreateCompte('624', 'Transports', '6', 'CHARGES')
  } else if (rubriqueUpper.includes('COMMUNICATION')) {
    compteCharge = await getOrCreateCompte('626', 'Services bancaires et assimilés', '6', 'CHARGES')
  } else if (rubriqueUpper.includes('MAINTENANCE')) {
    compteCharge = await getOrCreateCompte('615', 'Entretien et réparations', '6', 'CHARGES')
  } else if (rubriqueUpper.includes('PUBLICITE')) {
    compteCharge = await getOrCreateCompte('612', 'Publicité, publications, relations publiques', '6', 'CHARGES')
  } else if (rubriqueUpper.includes('ASSURANCE')) {
    compteCharge = await getOrCreateCompte('616', 'Primes d\'assurances', '6', 'CHARGES')
  } else if (rubriqueUpper.includes('IMPOT')) {
    compteCharge = await getOrCreateCompte(
      COMPTES_DEFAUT.IMPOTS_TAXES,
      'Impôts, taxes et versements assimilés',
      '6',
      'CHARGES'
    )
  } else {
    compteCharge = await getOrCreateCompte(
      COMPTES_DEFAUT.AUTRES_CHARGES,
      'Autres charges',
      '6',
      'CHARGES'
    )
  }
  
  // Déterminer le compte de règlement (Caisse par défaut)
  const compteReglement = await getOrCreateCompte(
    COMPTES_DEFAUT.CAISSE,
    'Caisse',
    '5',
    'ACTIF'
  )
  
  const libelle = data.libelle || `Charge: ${data.rubrique}`
  
  // Écriture 1 : Débit Charge, Crédit Caisse
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: null,
    libelle,
    compteId: compteCharge.id,
    debit: data.montant,
    credit: 0,
    reference: `CHG-${data.chargeId}`,
    referenceType: 'CHARGE',
    referenceId: data.chargeId,
    utilisateurId: data.utilisateurId,
  })
  
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: null,
    libelle,
    compteId: compteReglement.id,
    debit: 0,
    credit: data.montant,
    reference: `CHG-${data.chargeId}`,
    referenceType: 'CHARGE',
    referenceId: data.chargeId,
    utilisateurId: data.utilisateurId,
  })

  // === AJOUT : Enregistrement automatique en Caisse/Banque ===
  const motifCharge = `Charge: ${data.rubrique}`
  const dateCharge = data.date || new Date()
  
  // Par défaut en ESPECES/Caisse
  const effectiveMagasinId = data.magasinId
  if (effectiveMagasinId) {
    await prisma.caisse.create({
      data: { date: dateCharge, magasinId: effectiveMagasinId, type: 'SORTIE', motif: motifCharge, montant: data.montant, utilisateurId: data.utilisateurId }
    })
  }
}

/**
 * Comptabilise un mouvement de caisse
 */
export async function comptabiliserCaisse(data: {
  caisseId: number
  date: Date
  type: 'ENTREE' | 'SORTIE'
  montant: number
  motif: string
  utilisateurId: number
}) {
  const journal = await getOrCreateJournal('CA', 'Journal de Caisse', 'CAISSE')
  const compteCaisse = await getOrCreateCompte(
    COMPTES_DEFAUT.CAISSE,
    'Caisse',
    '5',
    'ACTIF'
  )
  
  if (data.type === 'ENTREE') {
    // Entrée de caisse : Débit Caisse, Crédit Produits divers
    const compteProduits = await getOrCreateCompte(
      COMPTES_DEFAUT.PRODUITS_DIVERS,
      'Produits divers',
      '7',
      'PRODUITS'
    )
    
    await createEcriture({
      date: data.date,
      journalId: journal.id,
      piece: null,
      libelle: `Entrée caisse: ${data.motif}`,
      compteId: compteCaisse.id,
      debit: data.montant,
      credit: 0,
      reference: `CAISSE-${data.caisseId}`,
      referenceType: 'CAISSE',
      referenceId: data.caisseId,
      utilisateurId: data.utilisateurId,
    })
    
    await createEcriture({
      date: data.date,
      journalId: journal.id,
      piece: null,
      libelle: `Entrée caisse: ${data.motif}`,
      compteId: compteProduits.id,
      debit: 0,
      credit: data.montant,
      reference: `CAISSE-${data.caisseId}`,
      referenceType: 'CAISSE',
      referenceId: data.caisseId,
      utilisateurId: data.utilisateurId,
    })
  } else {
    // Sortie de caisse : Débit Charges diverses, Crédit Caisse
    const compteCharges = await getOrCreateCompte(
      COMPTES_DEFAUT.AUTRES_CHARGES,
      'Autres charges',
      '6',
      'CHARGES'
    )
    
    await createEcriture({
      date: data.date,
      journalId: journal.id,
      piece: null,
      libelle: `Sortie caisse: ${data.motif}`,
      compteId: compteCharges.id,
      debit: data.montant,
      credit: 0,
      reference: `CAISSE-${data.caisseId}`,
      referenceType: 'CAISSE',
      referenceId: data.caisseId,
      utilisateurId: data.utilisateurId,
    })
    
    await createEcriture({
      date: data.date,
      journalId: journal.id,
      piece: null,
      libelle: `Sortie caisse: ${data.motif}`,
      compteId: compteCaisse.id,
      debit: 0,
      credit: data.montant,
      reference: `CAISSE-${data.caisseId}`,
      referenceType: 'CAISSE',
      referenceId: data.caisseId,
      utilisateurId: data.utilisateurId,
    })
  }
}

/**
 * Comptabilise une opération bancaire
 */
export async function comptabiliserOperationBancaire(data: {
  operationId: number
  banqueId: number
  date: Date
  type: string
  montant: number
  libelle: string
  compteId: number | null
  utilisateurId: number
}) {
  // Journal Banque
  const journal = await getOrCreateJournal('BA', 'Journal de Banque', 'BANQUE')
  
  // Compte bancaire (utiliser le compte lié ou le compte par défaut)
  let compteBanque
  if (data.compteId) {
    compteBanque = await prisma.planCompte.findUnique({ where: { id: data.compteId } })
  }
  if (!compteBanque) {
    compteBanque = await getOrCreateCompte(
      COMPTES_DEFAUT.BANQUE,
      'Banque',
      '5',
      'ACTIF'
    )
  }
  
  const isEntree = data.type === 'DEPOT' || data.type === 'VIREMENT_ENTRANT' || data.type === 'INTERETS'
  
  if (isEntree) {
    // Entrée bancaire : Débit Banque, Crédit selon le type
    let compteCredit
    if (data.type === 'DEPOT') {
      // Dépôt : généralement depuis Caisse ou Produits divers
      compteCredit = await getOrCreateCompte(
        COMPTES_DEFAUT.PRODUITS_DIVERS,
        'Produits divers',
        '7',
        'PRODUITS'
      )
    } else if (data.type === 'VIREMENT_ENTRANT') {
      // Virement entrant : depuis un autre compte bancaire ou tiers
      compteCredit = await getOrCreateCompte(
        '411', // Clients ou autre compte selon le contexte
        'Clients',
        '4',
        'PASSIF'
      )
    } else if (data.type === 'INTERETS') {
      // Intérêts : Produits financiers
      compteCredit = await getOrCreateCompte(
        '758',
        'Produits divers',
        '7',
        'PRODUITS'
      )
    } else {
      compteCredit = await getOrCreateCompte(
        COMPTES_DEFAUT.PRODUITS_DIVERS,
        'Produits divers',
        '7',
        'PRODUITS'
      )
    }
    
    await createEcriture({
      date: data.date,
      journalId: journal.id,
      piece: null,
      libelle: data.libelle,
      compteId: compteBanque.id,
      debit: data.montant,
      credit: 0,
      reference: `BANQUE-${data.operationId}`,
      referenceType: 'BANQUE',
      referenceId: data.operationId,
      utilisateurId: data.utilisateurId,
    })
    
    await createEcriture({
      date: data.date,
      journalId: journal.id,
      piece: null,
      libelle: data.libelle,
      compteId: compteCredit.id,
      debit: 0,
      credit: data.montant,
      reference: `BANQUE-${data.operationId}`,
      referenceType: 'BANQUE',
      referenceId: data.operationId,
      utilisateurId: data.utilisateurId,
    })
  } else {
    // Sortie bancaire : Débit selon le type, Crédit Banque
    let compteDebit
    if (data.type === 'RETRAIT') {
      // Retrait : généralement vers Caisse
      compteDebit = await getOrCreateCompte(
        COMPTES_DEFAUT.CAISSE,
        'Caisse',
        '5',
        'ACTIF'
      )
    } else if (data.type === 'VIREMENT_SORTANT') {
      // Virement sortant : vers un autre compte bancaire ou tiers
      compteDebit = await getOrCreateCompte(
        '401', // Fournisseurs ou autre compte selon le contexte
        'Fournisseurs',
        '4',
        'PASSIF'
      )
    } else if (data.type === 'FRAIS') {
      // Frais bancaires : Charges financières
      compteDebit = await getOrCreateCompte(
        '658',
        'Autres charges',
        '6',
        'CHARGES'
      )
    } else {
      compteDebit = await getOrCreateCompte(
        COMPTES_DEFAUT.AUTRES_CHARGES,
        'Autres charges',
        '6',
        'CHARGES'
      )
    }
    
    await createEcriture({
      date: data.date,
      journalId: journal.id,
      piece: null,
      libelle: data.libelle,
      compteId: compteDebit.id,
      debit: data.montant,
      credit: 0,
      reference: `BANQUE-${data.operationId}`,
      referenceType: 'BANQUE',
      referenceId: data.operationId,
      utilisateurId: data.utilisateurId,
    })
    
    await createEcriture({
      date: data.date,
      journalId: journal.id,
      piece: null,
      libelle: data.libelle,
      compteId: compteBanque.id,
      debit: 0,
      credit: data.montant,
      reference: `BANQUE-${data.operationId}`,
      referenceType: 'BANQUE',
      referenceId: data.operationId,
      utilisateurId: data.utilisateurId,
    })
  }
}

/**
 * Comptabilise un transfert entre magasins (OD : Stock 31 Débit/Crédit)
 */
export async function comptabiliserTransfert(data: {
  transfertId: number
  numero: string
  date: Date
  magasinOrigineNom: string
  magasinDestNom: string
  montantTotal: number
  utilisateurId: number
}) {
  if (data.montantTotal <= 0) return
  const journal = await getOrCreateJournal('OD', 'Journal des Opérations Diverses', 'OD')
  const compteStock = await getOrCreateCompte(
    COMPTES_DEFAUT.STOCK_MARCHANDISES,
    'Stock de marchandises',
    '3',
    'ACTIF'
  )
  const libelle = `Transfert ${data.numero} ${data.magasinOrigineNom} → ${data.magasinDestNom}`
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: data.numero,
    libelle,
    compteId: compteStock.id,
    debit: data.montantTotal,
    credit: 0,
    reference: data.numero,
    referenceType: 'TRANSFERT',
    referenceId: data.transfertId,
    utilisateurId: data.utilisateurId,
  })
  await createEcriture({
    date: data.date,
    journalId: journal.id,
    piece: data.numero,
    libelle,
    compteId: compteStock.id,
    debit: 0,
    credit: data.montantTotal,
    reference: data.numero,
    referenceType: 'TRANSFERT',
    referenceId: data.transfertId,
    utilisateurId: data.utilisateurId,
  })
}

/**
 * Initialise le plan de comptes et les journaux par défaut
 */
export async function initialiserComptabilite() {
  // Créer les journaux par défaut
  await getOrCreateJournal('VE', 'Journal des Ventes', 'VENTES')
  await getOrCreateJournal('AC', 'Journal des Achats', 'ACHATS')
  await getOrCreateJournal('CA', 'Journal de Caisse', 'CAISSE')
  await getOrCreateJournal('BA', 'Journal de Banque', 'BANQUE')
  await getOrCreateJournal('OD', 'Journal des Opérations Diverses', 'OD')
  
  // Créer les comptes principaux
  await getOrCreateCompte('31', 'Stock de marchandises', '3', 'ACTIF')
  await getOrCreateCompte('401', 'Fournisseurs', '4', 'PASSIF')
  await getOrCreateCompte('411', 'Clients', '4', 'ACTIF')
  await getOrCreateCompte('512', 'Banque', '5', 'ACTIF')
  await getOrCreateCompte('513', 'Banques - Comptes courants', '5', 'ACTIF')
  await getOrCreateCompte('514', 'Banques - Comptes à terme', '5', 'ACTIF')
  await getOrCreateCompte('531', 'Caisse', '5', 'ACTIF')
  await getOrCreateCompte('601', 'Achats de marchandises', '6', 'CHARGES')
  await getOrCreateCompte('701', 'Ventes de marchandises', '7', 'PRODUITS')
}
