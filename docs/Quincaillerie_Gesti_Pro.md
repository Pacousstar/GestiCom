# Fiche Commerce : Quincaillerie Gesti-Pro (Bricolage & Matériaux)

Ce document contient les paramètres de structure et les données de test pour une quincaillerie utilisant GestiCom.

## 1. Paramètres de Structure (Configuration)

| Champ | Valeur |
| :--- | :--- |
| **Nom de l'Entreprise** | Quincaillerie Gesti-Pro |
| **Slogan** | Tout pour vos chantiers, au meilleur prix |
| **Contact** | +237 600 000 002 |
| **Email** | contact@gestipro.cm |
| **Site Web** | www.gestipro.cm |
| **Localisation** | Rue des Matériaux, Douala, Cameroun |
| **Numéro NCC** | M022500098765A |
| **Devise** | FCFA |
| **TVA par défaut** | 19.25 % |
| **Type de Commerce** | BTP / MATÉRIAUX |
| **Pied de page** | Gesti-Pro Douala - RCCM: RC/DLA/2024/B/450 - Contribuable: M022500098765A |

---

## 2. Éléments de Base de Données (Tests - 5 par menu)

### PRODUITS
1. Ciment CPJ-35 (Cat: Gros œuvre, Prix Achat: 4 200, Prix Vente: 4 900)
2. Fer à Béton 12mm (Cat: Gros œuvre, Prix Achat: 3 500, Prix Vente: 4 200)
3. Peinture Satinée Blanche 20L (Cat: Peinture, Prix Achat: 18 000, Prix Vente: 25 000)
4. Perceuse à percussion 800W (Cat: Outillage, Prix Achat: 35 000, Prix Vente: 50 000)
5. Tuyau PVC 100mm (Cat: Plomberie, Prix Achat: 2 500, Prix Vente: 3 800)

### STOCKS (Quantité Initiale)
1. Ciment CPJ-35 : 200 sacs (Dépôt A)
2. Fer à Béton : 150 barres (Dépôt A)
3. Peinture Satinée : 40 pots (Magasin)
4. Perceuse : 10 unités (Rayon Outillage)
5. Tuyau PVC : 80 unités (Dépôt B)

### VENTES
1. Vente n°V-QP-001 : 50 Sacs de Ciment (Client: BTP Construct, Crédit, 245 000 FCFA)
2. Vente n°V-QP-002 : 1 Perceuse + 2 pots Peinture (Client: Particulier, Espèces, 100 000 FCFA)
3. Vente n°V-QP-003 : 10 Barres de Fer (Client: Chantier X, Mobile Money, 42 000 FCFA)
4. Vente n°V-QP-004 : 5 Tuyaux PVC (Client: PLOMBERIE SARL, Espèces, 19 000 FCFA)
5. Vente n°V-QP-005 : 10 pots Peinture (Client: Peintre Pro, Crédit, 250 000 FCFA)

### ACHATS
1. Achat n°A-QP-001 : 1000 Sacs de Ciment (Fournisseur: CIMENCAM, 4 200 000 FCFA)
2. Achat n°A-QP-002 : 500 Barres de Fer (Fournisseur: PROMÉTAL, 1 750 000 FCFA)
3. Achat n°A-QP-003 : 100 pots Peinture (Fournisseur: TOUPRET, 1 800 000 FCFA)
4. Achat n°A-QP-004 : 20 Perceuses (Fournisseur: BOSCH Africa, 700 000 FCFA)
5. Achat n°A-QP-005 : 200 Tuyaux PVC (Fournisseur: PLASTIK, 500 000 FCFA)

### CLIENTS
1. BTP Construct (Tél: 233 44 55 66, Type: CREDIT, Plafond: 1 000 000)
2. PLOMBERIE SARL (Tél: 699 11 22 33, Type: CASH)
3. Peintre Pro (Tél: 655 88 99 00, Type: CREDIT, Plafond: 300 000)
4. Chantier X (Tél: 670 12 34 56, Type: CASH)
5. M. ESSOMBA (Tél: 691 23 45 67, Type: CASH)

### FOURNISSEURS
1. CIMENCAM (Producteur Ciment, Local)
2. PROMÉTAL (Siderurgie, Douala)
3. TOUPRET (Peinture & Enduits)
4. BOSCH Africa (Outillage, International)
5. PLASTIK (Matériaux PVC, Douala)

### DÉPENSES
1. Carburation Camion Livraison (Cat: TRANSPORT, Montant: 40 000 FCFA)
2. Maintenance Chariot Élévateur (Cat: MAINTENANCE, Montant: 35 000 FCFA)
3. Salaire Magasiniers x2 (Cat: SALAIRES, Montant: 180 000 FCFA)
4. Gardiennage de Nuit (Cat: SÉCURITÉ, Montant: 50 000 FCFA)
5. Facture Eau (Cat: CAMWATER, Montant: 12 000 FCFA)

### BANQUE (Banque: ECOBANK, Compte: Pro Account)
1. Règlement CIMENCAM (Type: VIREMENT_SORTANT, Montant: 4 200 000 FCFA)
2. Virement Client BTP Construct (Type: VIREMENT_ENTRANT, Montant: 500 000 FCFA)
3. Dépôt Espèces Vente (Type: DEPOT, Montant: 300 000 FCFA)
4. Retrait Salaire (Type: RETRAIT, Montant: 180 000 FCFA)
5. Frais Bancaires (Type: FRAIS, Montant: 5 000 FCFA)

### CAISSE
1. Fond de Caisse Matin (Entrée: 50 000 FCFA)
2. Encaissement Vente V-QP-002 (Entrée: 100 000 FCFA)
3. Paiement Carburant (Sortie: 40 000 FCFA)
4. Paiement Gardiennage (Sortie: 50 000 FCFA)
5. Encaissement Vente V-QP-004 (Entrée: 19 000 FCFA)
