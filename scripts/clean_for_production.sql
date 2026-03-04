-- Script de nettoyage GestiCom pour mise en production
-- Supprime toutes les données de test SANS toucher à la configuration système
-- Exécuter avec: sqlite3 C:/gesticom/gesticom.db < clean_for_production.sql

PRAGMA foreign_keys = OFF;

-- 1. DONNÉES TRANSACTIONNELLES (suppression en ordre inverse des dépendances)
DELETE FROM AuditLog;
DELETE FROM DashboardPreference;

-- Comptabilité (écritures uniquement, pas le plan de comptes)
DELETE FROM EcritureComptable;

-- Banque (opérations uniquement, pas les comptes bancaires enregistrés)
DELETE FROM OperationBancaire;
DELETE FROM Banque;

-- Ventes
DELETE FROM VenteLigne;
DELETE FROM Vente;

-- Achats
DELETE FROM AchatLigne;
DELETE FROM Achat;

-- Transferts inter-magasins
DELETE FROM TransfertLigne;
DELETE FROM "Mouvement" WHERE referenceTransfertId IS NOT NULL;
DELETE FROM Transfert;

-- Mouvements de stock restants
DELETE FROM Mouvement;

-- Stocks
DELETE FROM Stock;

-- Caisse
DELETE FROM Caisse;

-- Charges et Dépenses
DELETE FROM Charge;
DELETE FROM Depense;

-- 2. DONNÉES MÉTIER (produits, clients, fournisseurs)
DELETE FROM Client;
DELETE FROM Fournisseur;
DELETE FROM Produit;

-- 3. STRUCTURE ORGANISATIONNELLE (magasins + entités de démo, PAS les utilisateurs)
-- On supprime SEULEMENT les magasins et entités de test
-- ⚠️ Si vous avez des utilisateurs liés à une entité,
-- il faut garder au moins une entité.
-- On purge et on laissera l'admin recréer son entité/magasin.
DELETE FROM Magasin;
DELETE FROM Entite;

-- 4. ON RÉINITIALISE LES SÉQUENCES D'AUTO-INCREMENT (IDs repartent de 1)
-- SQLite : Les séquences se réinitialisent automatiquement quand la table est vide
-- et qu'on utilise DELETE (pas TRUNCATE). Mais pour être sûr :
DELETE FROM sqlite_sequence WHERE name IN (
  'AuditLog', 'DashboardPreference', 'EcritureComptable',
  'OperationBancaire', 'Banque', 'VenteLigne', 'Vente',
  'AchatLigne', 'Achat', 'TransfertLigne', 'Transfert',
  'Mouvement', 'Stock', 'Caisse', 'Charge', 'Depense',
  'Client', 'Fournisseur', 'Produit', 'Magasin', 'Entite'
);

-- 5. CE QU'ON GARDE INTACT :
-- ✅ Utilisateur (SUPER_ADMIN conservé — IMPORTANT!)
-- ✅ PlanCompte (plan de comptes SYSCOHADA)
-- ✅ Journal (journaux comptables)
-- ✅ Parametre (configuration entreprise)
-- ✅ PrintTemplate (templates d'impression)

PRAGMA foreign_keys = ON;

-- Vérification finale
SELECT 'Ventes restantes: ' || COUNT(*) FROM Vente;
SELECT 'Produits restants: ' || COUNT(*) FROM Produit;
SELECT 'Utilisateurs conservés: ' || COUNT(*) FROM Utilisateur;
SELECT 'Plan de comptes: ' || COUNT(*) FROM PlanCompte;
SELECT 'Journaux: ' || COUNT(*) FROM Journal;
