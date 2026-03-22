SELECT f.nom, f.soldeInitial, 
       COALESCE(SUM(a.montantTotal), 0) as total_achats, 
       COALESCE(SUM(a.montantPaye), 0) as total_paye,
       COALESCE(SUM(a.montantTotal), 0) - COALESCE(SUM(a.montantPaye), 0) - f.soldeInitial as dette_calculée
FROM Fournisseur f
LEFT JOIN Achat a ON f.id = a.fournisseurId
WHERE f.actif = true
GROUP BY f.id, f.nom, f.soldeInitial
ORDER BY f.nom;
