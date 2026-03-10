# Fiche Commerce : Pharmacie de la Santé Plus

Ce document contient les paramètres de structure et les données de test pour une pharmacie utilisant GestiCom.

## 1. Paramètres de Structure (Configuration)

| Champ | Valeur |
| :--- | :--- |
| **Nom de l'Entreprise** | Pharmacie Santé Plus |
| **Slogan** | Votre santé, notre priorité absolue |
| **Contact** | +237 222 00 11 22 |
| **Email** | pharmacie.santeplus@gesticom.cm |
| **Site Web** | www.santeplus-pharma.cm |
| **Localisation** | Avenue de la Liberté, Bafoussam, Cameroun |
| **Numéro NCC** | P052600011223B |
| **Devise** | FCFA |
| **TVA par défaut** | 0 % (Exonéré sur médicaments essentiels) |
| **Type de Commerce** | PHARMACIE / SANTÉ |
| **Pied de page** | Santé Plus Bafoussam - Agrément MinSanté n°1234 - RCCM: B/125/2024 |

---

## 2. Éléments de Base de Données (Tests - 5 par menu)

### PRODUITS
1. Efferalgan 500mg Tab (Cat: Analgésiques, Prix Achat: 850, Prix Vente: 1 200)
2. Amoxicilline 500mg Gél (Cat: Antibiotiques, Prix Achat: 1 500, Prix Vente: 2 500)
3. Thermomètre Infrarouge (Cat: Matériel Médical, Prix Achat: 12 000, Prix Vente: 18 000)
4. Gel Hydroalcoolique 500ml (Cat: Hygiène, Prix Achat: 1 100, Prix Vente: 1 800)
5. Vitamine C 1000mg Eff (Cat: Compléments, Prix Achat: 2 200, Prix Vente: 3 500)

### STOCKS (Quantité Initiale)
1. Efferalgan : 100 boîtes
2. Amoxicilline : 50 boîtes
3. Thermomètre : 10 unités
4. Gel Hydro : 30 flacons
5. Vitamine C : 45 boîtes

### VENTES
1. Vente n°V-PS-001 : 2 Efferalgan + 1 Vitamine C (Client: M. TCHAMENI, Espèces, 5 900 FCFA)
2. Vente n°V-PS-002 : 1 Amoxicilline (Ordonnance n°45, Mobile Money, 2 500 FCFA)
3. Vente n°V-PS-003 : 1 Thermomètre (Client: Dispensaire X, Crédit, 18 000 FCFA)
4. Vente n°V-PS-004 : 3 Gels Hydro (Client: Inconnu, Espèces, 5 400 FCFA)
5. Vente n°V-PS-005 : Panier complet Grippe (Client: Mme NGO, Espèces, 12 500 FCFA)

### ACHATS
1. Achat n°A-PS-001 : Stock Analgésiques (Fournisseur: LABOREX, 250 000 FCFA)
2. Achat n°A-PS-002 : Gamme Antibiotiques (Fournisseur: UCMA, 400 000 FCFA)
3. Achat n°A-PS-003 : Matériel de diagnostic (Fournisseur: MEDPRO, 150 000 FCFA)
4. Achat n°A-PS-004 : Produits d'Hygiène (Fournisseur: SOAP-CAM, 80 000 FCFA)
5. Achat n°A-PS-005 : Vitamines et Sels (Fournisseur: PHARMA-DISTRIB, 120 000 FCFA)

### CLIENTS
1. M. TCHAMENI (Tél: 677 11 22 33, Type: CASH)
2. Mme NGO (Tél: 699 44 55 66, Type: CASH)
3. Dispensaire X (Tél: 233 00 99 88, Type: CREDIT, Plafond: 150 000)
4. Assurance Santé Y (Tél: 222 11 22 33, Type: CREDIT, Plafond: 500 000)
5. Dr. FOKOU (Tél: 650 00 11 22, Type: CASH)

### FOURNISSEURS
1. LABOREX (Répartiteur pharmaceutique, Douala)
2. UCMA (Union Centrale de Médicaments, Bafoussam)
3. MEDPRO (Matériel Médical)
4. SOAP-CAM (Cosmétique & Hygiène)
5. PHARMA-DISTRIB (Distributeur régional)

### DÉPENSES
1. Électricité Climatisations (Cat: ENEO, Montant: 45 000 FCFA)
2. Salaire Préparateur (Cat: SALAIRES, Montant: 120 000 FCFA)
3. Abonnement Logiciel Pharmacie (Cat: COMMUNICATION, Montant: 15 000 FCFA)
4. Produits de Nettoyage (Cat: MAINTENANCE, Montant: 8 000 FCFA)
5. Impôt synthétique (Cat: FISCALITÉ, Montant: 30 000 FCFA)

### BANQUE (Banque: SGBC, Compte: Santé Plus Corporate)
1. Paiement LABOREX (Type: VIREMENT_SORTANT, Montant: 250 000 FCFA)
2. Remboursement Assurance Y (Type: VIREMENT_ENTRANT, Montant: 215 000 FCFA)
3. Dépôt Recettes Semaine (Type: DEPOT, Montant: 650 000 FCFA)
4. Virement Salaire (Type: VIREMENT_SORTANT, Montant: 120 000 FCFA)
5. Agios et Commissions (Type: FRAIS, Montant: 3 800 FCFA)

### CAISSE
1. Encaissement Vente V-PS-001 (Entrée: 5 900 FCFA)
2. Encaissement Vente V-PS-004 (Entrée: 5 400 FCFA)
3. Petit achat fournitures bureau (Sortie: 2 500 FCFA)
4. Transport Ordonnance Urgent (Sortie: 1 000 FCFA)
5. Fond de roulement (Entrée: 20 000 FCFA)
