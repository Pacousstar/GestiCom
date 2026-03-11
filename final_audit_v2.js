const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runFinalAudit() {
    console.log("=== AUDIT TECHNIQUE DE PERSISTENCE GESTICOM (V2) ===");
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

    // Préparation : s'assurer que les IDs de base existent
    const magasin = await prisma.magasin.findFirst() || await prisma.magasin.create({ data: { nom: "Audit Mag", code: "AM" } });
    const entite = await prisma.entite.findFirst() || await prisma.entite.create({ data: { nom: "Audit Entite", code: "AE" } });
    const user = await prisma.utilisateur.findFirst() || await prisma.utilisateur.create({ data: { nom: "Audit User", login: "audit", password: "pwd", role: "SUPER_ADMIN" } });
    const caisse = await prisma.caisse.findFirst() || await prisma.caisse.create({ data: { nom: "Audit Caisse", code: "AC", magasinId: magasin.id } });
    const banque = await prisma.compteBanque.findFirst() || await prisma.compteBanque.create({ data: { nom: "Audit Banque", numero: "ABC", banque: "AuditB" } });

    // 1. Produits
    let p;
    await check("Produits", async () => {
        p = await prisma.produit.create({ data: { code: "AUDIT-P-" + Date.now(), designation: "Audit", categorie: "TEST", actif: true } });
    });

    // 2. Stocks
    await check("Stock", async () => {
        const s = await prisma.stock.create({ data: { produitId: p.id, magasinId: magasin.id, quantite: 100 } });
        await prisma.stock.delete({ where: { id: s.id } });
    });

    // 3. Ventes
    await check("Ventes", async () => {
        const v = await prisma.vente.create({ data: { 
            numero: "AUDIT-V-" + Date.now(), 
            magasinId: magasin.id, 
            entiteId: entite.id, 
            utilisateurId: user.id, 
            montantTotal: 100, 
            montantPaye: 100,
            modePaiement: "ESPECES",
            statutPaiement: "PAYE",
            statut: "VALIDEE" 
        } });
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
        const t = await prisma.transactionCaisse.create({ data: { libelle: "Audit Caisse", montant: 100, type: "ENTREE", caisseId: caisse.id, utilisateurId: user.id } });
        await prisma.transactionCaisse.delete({ where: { id: t.id } });
    });
    await check("Banque", async () => {
        const t = await prisma.transactionBanque.create({ data: { libelle: "Audit Banque", montant: 100, type: "DEPOT", compteId: banque.id, utilisateurId: user.id } });
        await prisma.transactionBanque.delete({ where: { id: t.id } });
    });
    await check("Dépenses", async () => {
        const d = await prisma.depense.create({ data: { libelle: "Audit Depense", montant: 100, categorie: "DIVERS", utilisateurId: user.id } });
        await prisma.depense.delete({ where: { id: d.id } });
    });

    // 6. Comptabilité
    await check("Comptabilité", async () => {
        const e = await prisma.ecritureComptable.create({ data: { date: new Date(), libelle: "Audit Compta", journalCode: "OD", utilisateurId: user.id } });
        await prisma.ecritureComptable.delete({ where: { id: e.id } });
    });

    // 7. Audit Log
    await check("Journal d'audit", async () => {
        const a = await prisma.auditLog.create({ data: { action: "AUDIT", utilisateurId: user.id, entite: "SYSTEM", entiteId: entite.id } });
        await prisma.auditLog.delete({ where: { id: a.id } });
    });

    // Nettoyage final
    if (p) await prisma.produit.delete({ where: { id: p.id } });

    console.log("\n=== RÉSUMÉ DE L'AUDIT FINAL ===");
    const failed = results.filter(r => r.status === "ERREUR");
    if (failed.length === 0) {
        console.log("✅ TOUS LES SYSTÈMES SONT 100% OPÉRATIONNELS.");
    } else {
        console.log(`❌ ${failed.length} ERREURS DÉTECTÉES.`);
    }

    await prisma.$disconnect();
}

runFinalAudit();
