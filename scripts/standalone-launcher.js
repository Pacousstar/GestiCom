/**
 * Lance le serveur Next.js standalone (Option B).
 * À exécuter depuis la racine du projet : node scripts/standalone-launcher.js
 *
 * Stratégie pour éviter "Unable to open the database file" (Windows, Prisma/standalone) :
 * - Copie prisma/gesticom.db vers .next/standalone/prisma/gesticom.db
 * - Bootstrap run-standalone.js : lit DATABASE_URL depuis .database_url et fait require(server)
 *   pour que la variable soit définie avant tout chargement Next/Prisma.
 * - DATABASE_URL = chemin absolu file: vers la copie (sans %20 : espaces réels, plus compatible
 *   avec le moteur SQLite/Prisma sous Windows).
 * - À l'arrêt : recopie la base standalone vers le projet.
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const projectRoot = path.join(__dirname, '..')
const standaloneDir = path.join(projectRoot, '.next', 'standalone')

// Recherche récursive de server.js dans .next/standalone
function findServerJs(dir) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (file === 'server.js') return fullPath;
        if (fs.statSync(fullPath).isDirectory() && file !== 'node_modules') {
            const found = findServerJs(fullPath);
            if (found) return found;
        }
    }
    return null;
}

const serverPath = findServerJs(standaloneDir)

if (!serverPath) {
  console.error('Erreur: server.js introuvable dans .next/standalone. Vérifiez votre build.');
  process.exit(1)
}

const serverDir = path.dirname(serverPath)
console.log('[Launcher] Moteur detecte dans : ' + serverDir)

// Configuration DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || "file:C:/gesticom/gesticom.db";
process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = 'production';

// Fichier de configuration pour le bootstrap
fs.writeFileSync(path.join(serverDir, '.database_url'), databaseUrl, 'utf8')

const runStandalone = `'use strict';
const p = require('path'), fs = require('fs');
const f = p.join(__dirname, '.database_url');
if (fs.existsSync(f)) { process.env.DATABASE_URL = fs.readFileSync(f, 'utf8').trim(); }
console.log('[Server] Lancement avec DATABASE_URL=' + process.env.DATABASE_URL);
require('./server.js');
`
fs.writeFileSync(path.join(serverDir, 'run-standalone.js'), runStandalone, 'utf8')

// S'assurer que public et .next/static sont à côté de server.js
const pubDest = path.join(serverDir, 'public')
const staticDest = path.join(serverDir, '.next', 'static')

if (!fs.existsSync(pubDest)) {
    const pubSource = path.join(projectRoot, 'public')
    if (fs.existsSync(pubSource)) {
        fs.cpSync(pubSource, pubDest, { recursive: true })
        console.log('[Launcher] Copie public/ vers ' + pubDest)
    }
}

if (!fs.existsSync(staticDest)) {
    const staticSource = path.join(projectRoot, '.next', 'static')
    if (fs.existsSync(staticSource)) {
        if (!fs.existsSync(path.dirname(staticDest))) fs.mkdirSync(path.dirname(staticDest), { recursive: true })
        fs.cpSync(staticSource, staticDest, { recursive: true })
        console.log('[Launcher] Copie static/ vers ' + staticDest)
    }
}

console.log('[GestiCom] Lancement...');
const child = spawn('node', ['run-standalone.js'], {
  cwd: serverDir,
  env: process.env,
  stdio: 'inherit',
})

child.on('exit', (code) => {
  console.log('[GestiCom] Arret du moteur (Code ' + code + ')');
  process.exit(code || 0)
})
