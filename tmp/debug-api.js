const fetch = require('node-fetch');

async function testAPIs() {
    const baseUrl = 'http://localhost:3000/api';
    const endpoints = [
        '/clients/soldes?dateDebut=2026-03-01&dateFin=2026-03-31',
        '/rapports/inventaire/mouvements?dateDebut=2026-03-01&dateFin=2026-03-31'
    ];

    console.log('--- TEST DES APIS GESTICOM ---');
    for (const ep of endpoints) {
        try {
            console.log(`Lancement de ${ep}...`);
            // Note: On ne peut pas tester facilement car il faut une session (cookie).
            // Mais on peut essayer de voir si ça renvoie 401 ou 500 sans session.
            const res = await fetch(baseUrl + ep);
            console.log(`Status ${ep}: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.log(`Réponse (début): ${text.substring(0, 100)}...`);
        } catch (e) {
            console.error(`Erreur sur ${ep}:`, e.message);
        }
    }
}

// Puisque je ne peux pas facilement simuler une session, je vais plutôt vérifier la cohérence du schéma Prisma
// avec les requêtes suspectes.
testAPIs();
