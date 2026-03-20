const Service = require('node-windows').Service;
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const fs = require('fs');

// Charger .env pour le PORT et le nom
let port = "3000";
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^PORT\s*=\s*(.*)$/m);
    if (match) port = match[1].trim().replace(/^["']|["']$/g, '');
}

// Configuration du service
const svc = new Service({
  name: 'GestiCom-Server-' + port,
  description: 'Moteur de gestion commerciale GestiCom Pro - Port ' + port + ' (GSN EXPERTISES GROUP)',
  script: path.join(__dirname, 'standalone-launcher.js'),
  nodeOptions: [
    '--max-old-space-size=4096'
  ]
});

// Événement d'installation
svc.on('install', function() {
  console.log(`[GestiCom] Service "${svc.name}" installé avec succès !`);
  svc.start();
});

// Événement de démarrage
svc.on('start', function() {
  console.log(`[GestiCom] Service démarré. L'application est accessible sur le port ${port}.`);
});

// Événement d'erreur
svc.on('error', function(err) {
    console.error('[GestiCom] Erreur de service :', err);
});

// Lancer l'installation
console.log('[GestiCom] Installation du service en cours...');
svc.install();
