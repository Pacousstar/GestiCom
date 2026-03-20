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

// Configuration des variables d'environnement depuis le .env (racine du projet)
const envPath = path.join(projectRoot, '.env')
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=')
        if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
            process.env[key.trim()] = value
        }
    })
}

const databaseUrl = process.env.DATABASE_URL || "file:C:/gesticom/gesticom.db";
const port = process.env.PORT || "3000";

process.env.DATABASE_URL = databaseUrl;
process.env.PORT = port;
process.env.NODE_ENV = 'production';

// Fichiers de configuration pour le bootstrap
fs.writeFileSync(path.join(serverDir, '.database_url'), databaseUrl, 'utf8')
fs.writeFileSync(path.join(serverDir, '.port'), port, 'utf8')

const runStandalone = `'use strict';
const p = require('path'), fs = require('fs');
const fDB = p.join(__dirname, '.database_url');
const fPort = p.join(__dirname, '.port');
if (fs.existsSync(fDB)) { process.env.DATABASE_URL = fs.readFileSync(fDB, 'utf8').trim(); }
if (fs.existsSync(fPort)) { process.env.PORT = fs.readFileSync(fPort, 'utf8').trim(); }
console.log('[Server] Lancement sur PORT=' + (process.env.PORT || 3000) + ' avec DATABASE_URL=' + process.env.DATABASE_URL);
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
