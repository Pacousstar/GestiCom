# Fiche Commerce : Super Alimentation GSN (Supermarché de proximité)

Ce document contient les paramètres de structure et les données de test pour une alimentation générale utilisant GestiCom.

## 1. Paramètres de Structure (Configuration)

| Champ | Valeur |
| :--- | :--- |
| **Nom de l'Entreprise** | Super Alimentation GSN |
| **Slogan** | Fraîcheur et qualité à votre porte |
| **Contact** | +237 699 99 99 99 |
| **Email** | shop@gesticom-aliment.cm |
| **Site Web** | www.super-gsn.cm |
| **Localisation** | Carrefour Bastos, Yaoundé, Cameroun |
| **Numéro NCC** | A012000033445C |
| **Devise** | FCFA |
| **TVA par défaut** | 19.25 % (sur produits taxables) |
| **Type de Commerce** | ALIMENTATION GÉNÉRALE |
| **Pied de page** | GSN Alimentation - Bastos Yaoundé - RCCM: 2024/RC/600 |

---

## 2. Éléments de Base de Données (Tests - 5 par menu)

### PRODUITS
1. Sac de Riz 25kg (Cat: Épicerie, Prix Achat: 14 500, Prix Vente: 16 500)
2. Huile de Palme 5L (Cat: Épicerie, Prix Achat: 5 200, Prix Vente: 6 500)
3. Pack Eau Minérale 6x1.5L (Cat: Boissons, Prix Achat: 1 800, Prix Vente: 2 400)
4. Sucre en Poudre 1kg (Cat: Épicerie, Prix Achat: 750, Prix Vente: 950)
5. Lait en Poudre 400g (Cat: Épicerie, Prix Achat: 2 100, Prix Vente: 2 800)

### STOCKS (Quantité Initiale)
1. Riz : 50 sacs
2. Huile : 20 bidons
3. Eau : 100 packs
4. Sucre : 150 paquets
5. Lait : 60 boîtes

### VENTES
1. Vente n°V-SA-001 : 1 Sac de Riz + 2 Huiles (Client: Mme BIYA, Espèces, 29 500 FCFA)
2. Vente n°V-SA-002 : 5 Packs Eau (Client: Restaurant X, Crédit, 12 000 FCFA)
3. Vente n°V-SA-003 : 10 Sucres + 3 Laits (Client: Boulangerie, Mobile Money, 17 900 FCFA)
4. Vente n°V-SA-004 : Courses diverses (Client: Passant, Espèces, 8 400 FCFA)
5. Vente n°V-SA-005 : 1 Sac de Riz (Client: M. ATANGANA, Espèces, 16 500 FCFA)

### ACHATS
1. Achat n°A-SA-001 : Riz et Céréales (Fournisseur: SOCCAM, 725 000 FCFA)
2. Achat n°A-SA-002 : Boissons et Eaux (Fournisseur: SEMC, 180 000 FCFA)
3. Achat n°A-SA-003 : Produits Laitiers (Fournisseur: NESTLÉ, 126 000 FCFA)
4. Achat n°A-SA-004 : Huiles et Graisses (Fournisseur: SCR MAYA, 104 000 FCFA)
5. Achat n°A-SA-005 : Divers Épicerie (Fournisseur: Grossiste Bastos, 50 000 FCFA)

### CLIENTS
1. Mme BIYA (Tél: 650 11 11 11, Type: CASH)
2. Restaurant X (Tél: 222 33 33 33, Type: CREDIT, Plafond: 100 000)
3. Boulangerie du Coin (Tél: 699 00 11 22, Type: CASH)
4. M. ATANGANA (Tél: 677 88 99 00, Type: CASH)
5. Association Y (Tél: 222 00 00 00, Type: CREDIT, Plafond: 200 000)

### FOURNISSEURS
1. SOCCAM (Société Camerounaise de Commerce)
2. SEMC (Eaux Minérales du Cameroun)
3. NESTLÉ Cameroun (Produits agro-alimentaires)
4. SCR MAYA (Huilerie)
5. Grossiste Bastos (Local)

### DÉPENSES
1. Facture Électricité Vitrines (Cat: ENEO, Montant: 35 000 FCFA)
2. Achat sacs plastiques (Cat: EMBALLAGE, Montant: 5 000 FCFA)
3. Maintenance Frigo Boissons (Cat: MAINTENANCE, Montant: 20 000 FCFA)
4. Petit déjeuner équipe (Cat: DIVERS, Montant: 3 000 FCFA)
5. Nettoyage boutique (Cat: MAINTENANCE, Montant: 7 000 FCFA)

### BANQUE (Banque: UBA, Compte: Super GSN Biz)
1. Règlement SOCCAM (Type: VIREMENT_SORTANT, Montant: 725 000 FCFA)
2. Encaissement Chèque Restaurant X (Type: DEPOT, Montant: 50 000 FCFA)
3. Versement Recette Espèces (Type: DEPOT, Montant: 400 000 FCFA)
4. Paiement Loyer (Type: VIREMENT_SORTANT, Montant: 100 000 FCFA)
5. Commisions Banque (Type: FRAIS, Montant: 2 200 FCFA)

### CAISSE
1. Encaissement Vente V-SA-001 (Entrée: 29 500 FCFA)
2. Paiement Sacs Plastiques (Sortie: 5 000 FCFA)
3. Encaissement Vente V-SA-005 (Entrée: 16 500 FCFA)
4. Rendu de Monnaie (Sortie: 1 500 FCFA)
5. Retrait pour Dépôt Banque (Sortie: 400 000 FCFA)
