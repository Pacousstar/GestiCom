const Service = require('node-windows').Service;
const path = require('path');

// Configuration du service
const svc = new Service({
  name: 'GestiCom-Server',
  description: 'Moteur de gestion commerciale GestiCom Pro (GSN EXPERTISES GROUP)',
  script: path.join(__dirname, 'standalone-launcher.js'),
  nodeOptions: [
    '--max-old-space-size=4096'
  ]
});

// Événement d'installation
svc.on('install', function() {
  console.log('[GestiCom] Service installé avec succès !');
  svc.start();
});

// Événement de démarrage
svc.on('start', function() {
  console.log('[GestiCom] Service démarré. L\'application est accessible sur le port 3000.');
});

// Événement d'erreur
svc.on('error', function(err) {
    console.error('[GestiCom] Erreur de service :', err);
});

// Lancer l'installation
console.log('[GestiCom] Installation du service en cours...');
svc.install();
