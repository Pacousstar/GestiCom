# Fiche Commerce : Élégance Fashion GSN (Boutique de Mode)

Ce document contient les paramètres de structure et les données de test pour une boutique de mode utilisant GestiCom.

## 1. Paramètres de Structure (Configuration)

| Champ | Valeur |
| :--- | :--- |
| **Nom de l'Entreprise** | Élégance Fashion GSN |
| **Slogan** | L'excellence du style au quotidien |
| **Contact** | +237 600 000 001 |
| **Email** | contact@elegance-fashion.cm |
| **Site Web** | www.elegance-fashion.cm |
| **Localisation** | Boulevard du 20 Mai, Yaoundé, Cameroun |
| **Numéro NCC** | M102400012345Z |
| **Devise** | FCFA |
| **TVA par défaut** | 19.25 % |
| **Type de Commerce** | HABILLEMENT / MODE |
| **Pied de page** | Élégance Fashion GSN - RCCM: RC/YAO/2024/B/150 - Contribuable: M102400012345Z |

---

## 2. Éléments de Base de Données (Tests - 5 par menu)

### PRODUITS
1. Robe de Soirée "Stella" (Cat: Prêt-à-porter, Prix Achat: 25 000, Prix Vente: 45 000)
2. Chemise Homme Slim Fit (Cat: Homme, Prix Achat: 8 000, Prix Vente: 15 000)
3. Jean Denim Blue Heritage (Cat: Pantalons, Prix Achat: 12 000, Prix Vente: 22 000)
4. Escarpins Cuir Italien (Cat: Chaussures, Prix Achat: 30 000, Prix Vente: 55 000)
5. Sac à Main "Versailles" (Cat: Accessoires, Prix Achat: 40 000, Prix Vente: 75 000)

### STOCKS (Quantité Initiale)
1. Robe de Soirée : 10 unités (Magasin Central)
2. Chemise Homme : 50 unités (Magasin Central)
3. Jean Denim : 30 unités (Magasin Central)
4. Escarpins : 15 unités (Magasin Central)
5. Sac à Main : 5 unités (Magasin Central)

### VENTES
1. Vente n°V-EF-001 : 2 Chemises + 1 Jean (Client: Jean DUPONT, Espèces, 52 000 FCFA)
2. Vente n°V-EF-002 : 1 Robe Stella (Client: Marie CLAIRE, Mobile Money, 45 000 FCFA)
3. Vente n°V-EF-003 : 1 Sac "Versailles" (Client: Inconnu, Espèces, 75 000 FCFA)
4. Vente n°V-EF-004 : 2 Paires Escarpins (Client: Alice BEKONO, Crédit, 110 000 FCFA)
5. Vente n°V-EF-005 : 5 Chemises (Client: Entreprise X, Virement, 75 000 FCFA)

### ACHATS
1. Achat n°A-EF-001 : 100 Chemises (Fournisseur: Textile Africa, 800 000 FCFA)
2. Achat n°A-EF-002 : 20 Robes (Fournisseur: Mode de Paris, 500 000 FCFA)
3. Achat n°A-EF-003 : 50 Jeans (Fournisseur: Denim Global, 600 000 FCFA)
4. Achat n°A-EF-004 : 10 Sacs (Fournisseur: Maroquinerie de Luxe, 400 000 FCFA)
5. Achat n°A-EF-005 : 30 Chaussures (Fournisseur: StepByStep, 900 000 FCFA)

### CLIENTS
1. Jean DUPONT (Tél: 670 00 00 11, Type: CASH)
2. Marie CLAIRE (Tél: 690 00 00 22, Type: CASH)
3. Alice BEKONO (Tél: 677 00 00 33, Type: CREDIT, Plafond: 200 000)
4. Entreprise X (Tél: 222 00 00 44, Type: CREDIT, Plafond: 500 000)
5. Paul BIYONG (Tél: 655 00 00 55, Type: CASH)

### FOURNISSEURS
1. Textile Africa (Tél: 242 11 11 11, Dubaï)
2. Mode de Paris (Tél: +33 1 22 33 44, France)
3. Denim Global (Tél: +91 44 55 66, Inde)
4. Maroquinerie de Luxe (Local, Yaoundé)
5. StepByStep (Local, Douala)

### DÉPENSES
1. Loyer Boutique (Cat: LOYER, Montant: 150 000 FCFA)
2. Facture Électricité (Cat: ENEO/Électricité, Montant: 25 000 FCFA)
3. Salaire Vendeuse (Cat: SALAIRES, Montant: 60 000 FCFA)
4. Marketing Réseaux Sociaux (Cat: AUTRE, Montant: 30 000 FCFA)
5. Frais de Transport (Cat: TRANSPORT, Montant: 15 000 FCFA)

### BANQUE (Banque: UBA, Compte: Main Account)
1. Dépôt Initial (Type: DEPOT, Montant: 2 000 000 FCFA)
2. Règlement Virement Entreprise X (Type: VIREMENT_ENTRANT, Montant: 75 000 FCFA)
3. Paiement Fournisseur StepByStep (Type: VIREMENT_SORTANT, Montant: 450 000 FCFA)
4. Frais de Tenue de Compte (Type: FRAIS, Montant: 2 500 FCFA)
5. Retrait pour Caisse (Type: RETRAIT, Montant: 100 000 FCFA)

### CAISSE
1. Approvisionnement (Entrée: 100 000 FCFA, Motif: Retrait Banque)
2. Encaissement Vente V-EF-001 (Entrée: 52 000 FCFA)
3. Paiement Facture Électricité (Sortie: 25 000 FCFA)
4. Paiement Petit Matériel (Sortie: 5 000 FCFA)
5. Encaissement Vente V-EF-003 (Entrée: 75 000 FCFA)
