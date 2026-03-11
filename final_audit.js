const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runFinalAudit() {
    console.log("=== AUDIT TECHNIQUE DE PERSISTENCE GESTICOM ===");
    const results = [];

    async function check(moduleName, fn) {
        try {
            await fn();
            console.log(`[OK] ${moduleName}`);
            results.push({ module: moduleName, status: "OK" });
        } catch (e) {
            console.error(`[ERREUR] ${moduleName}:`, e.message);
            results.push({ module: moduleName, status: "ERREUR", error: e.message });
        }
    }

    // 1. Produits
    await check("Produits", async () => {
        const p = await prisma.produit.create({ data: { code: "AUDIT-P", designation: "Audit", categorie: "TEST", actif: true } });
        await prisma.produit.delete({ where: { id: p.id } });
    });

    // 2. Stocks
    await check("Stock", async () => {
        const s = await prisma.stock.create({ data: { produitId: 1, magasinId: 1, quantite: 100 } });
        await prisma.stock.delete({ where: { id: s.id } });
    });

    // 3. Ventes
    await check("Ventes", async () => {
        const v = await prisma.vente.create({ data: { numero: "AUDIT-V", magasinId: 1, entiteId: 1, utilisateurId: 1, montantTotal: 0, statut: "BROUILLON" } });
        await prisma.vente.delete({ where: { id: v.id } });
    });

    // 4. Clients / Fournisseurs
    await check("Clients", async () => {
        const c = await prisma.client.create({ data: { nom: "Client Audit", type: "COMPTANT" } });
        await prisma.client.delete({ where: { id: c.id } });
    });
    await check("Fournisseurs", async () => {
        const f = await prisma.fournisseur.create({ data: { nom: "Fournisseur Audit" } });
        await prisma.fournisseur.delete({ where: { id: f.id } });
    });

    // 5. Trésorerie (Caisse / Banque / Dépenses)
    await check("Caisse", async () => {
        const t = await prisma.transactionCaisse.create({ data: { libelle: "Audit Caisse", montant: 100, type: "ENTREE", caisseId: 1, utilisateurId: 1 } });
        await prisma.transactionCaisse.delete({ where: { id: t.id } });
    });
    await check("Banque", async () => {
        const t = await prisma.transactionBanque.create({ data: { libelle: "Audit Banque", montant: 100, type: "DEPOT", compteId: 1, utilisateurId: 1 } });
        await prisma.transactionBanque.delete({ where: { id: t.id } });
    });
    await check("Dépenses", async () => {
        const d = await prisma.depense.create({ data: { libelle: "Audit Depense", montant: 100, categorie: "DIVERS", utilisateurId: 1 } });
        await prisma.depense.delete({ where: { id: d.id } });
    });

    // 6. Comptabilité
    await check("Comptabilité", async () => {
        const e = await prisma.ecritureComptable.create({ data: { date: new Date(), libelle: "Audit Compta", journalCode: "OD", utilisateurId: 1 } });
        await prisma.ecritureComptable.delete({ where: { id: e.id } });
    });

    // 7. Utilisateurs & Audit
    await check("Utilisateurs", async () => {
        const u = await prisma.utilisateur.create({ data: { nom: "Audit User", login: "audit-user", password: "pwd", role: "VENDEUR" } });
        await prisma.utilisateur.delete({ where: { id: u.id } });
    });
    await check("Journal d'audit", async () => {
        const a = await prisma.auditLog.create({ data: { action: "AUDIT", utilisateurId: 1, entite: "SYSTEM", entiteId: 1 } });
        await prisma.auditLog.delete({ where: { id: a.id } });
    });

    console.log("\n=== RÉSUMÉ DE L'AUDIT ===");
    const failed = results.filter(r => r.status === "ERREUR");
    if (failed.length === 0) {
        console.log("✅ TOUS LES SYSTÈMES SONT OPÉRATIONNELS.");
    } else {
        console.log(`❌ ${failed.length} ERREURS DÉTECTÉES.`);
    }

    await prisma.$disconnect();
}

runFinalAudit();
