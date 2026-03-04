## Scanner Code-Barre — Intégration GestiCom

### Approche retenue
- **Librairie** : `html5-qrcode` (scan via caméra navigateur, offline-compatible)
- **Intégration** : Bouton 📷 dans la section "Lignes" du formulaire Nouvelle Vente
- **Flux** : Scan → Recherche du produit par code-barres → Ajout automatique au panier

### Fichiers modifiés/créés
- [NEW] `components/scanner/BarcodeScanner.tsx` — Composant modal de scan
- [MODIFY] `app/(dashboard)/dashboard/ventes/page.tsx` — Intégration bouton + callback
- [MODIFY] `app/(dashboard)/dashboard/stock/page.tsx` — (optionnel) scan pour recherche rapide

### Champ code-barres produit
Les produits ont déjà un champ `code` en base. Le scan retourne le code-barres → on cherche le produit par `code` exact.
