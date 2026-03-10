const fetch = require('node-fetch');

async function testRecord() {
    const baseUrl = 'http://localhost:3000'; // Note: Le serveur doit tourner pour un test réel
    console.log('--- Test d\'enregistrement Client ---');
    try {
        // Simulation d'un test interne via Prisma car le serveur n'est peut-être pas démarré
        console.log('Simulation de création via script de test...');
        // On va plutôt créer un script qui utilise Prisma directement pour valider la persistence
    } catch (e) {
        console.error(e);
    }
}
testRecord();
