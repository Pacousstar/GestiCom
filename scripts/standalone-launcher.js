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
const serverPath = path.join(standaloneDir, 'server.js')

if (!fs.existsSync(serverPath)) {
  console.error('Erreur: .next/standalone/server.js introuvable. Lancez d\'abord: npm run build')
  process.exit(1)
}

// Charger .env (SESSION_SECRET, etc.) — on écrase DATABASE_URL plus bas
const envPath = path.join(projectRoot, '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      let val = m[2].trim().replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  })
}

const dbProject = path.join(projectRoot, 'prisma', 'gesticom.db')
const prismaStandaloneDir = path.join(standaloneDir, 'prisma')
const dbStandalone = path.join(prismaStandaloneDir, 'gesticom.db')

if (!fs.existsSync(dbProject)) {
  console.warn('Attention: prisma/gesticom.db introuvable. Lancez "npx prisma db push" et "npm run db:seed".')
} else {
  if (!fs.existsSync(prismaStandaloneDir)) {
    fs.mkdirSync(prismaStandaloneDir, { recursive: true })
  }
  fs.copyFileSync(dbProject, dbStandalone)
}

// DATABASE_URL : chemin SANS espaces (SQLite/Prisma échoue avec des espaces dans le chemin, ex. "GSN EXPETISES  GROUP")
const dbAbs = path.resolve(standaloneDir, 'prisma', 'gesticom.db')

function toFileUrl(p, win32NoThirdSlash) {
  const s = String(p).replace(/\\/g, '/')
  return win32NoThirdSlash ? 'file:' + s : 'file:///' + s
}

let databaseUrl = toFileUrl(dbAbs, false)
let dbToPersist = dbStandalone

if (process.platform === 'win32' && dbAbs.includes(' ') && fs.existsSync(dbStandalone)) {
  // Copier la base vers un chemin SANS espaces (Prisma/SQLite sous Windows)
  const candidates = [
    path.join('C:', 'Users', 'Public', 'gesticom', 'gesticom.db'),
    path.join('C:', 'gesticom', 'gesticom.db'),
  ]
  for (const fallbackDb of candidates) {
    const fallbackDir = path.dirname(fallbackDb)
    try {
      if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true })
      fs.copyFileSync(dbStandalone, fallbackDb)
      databaseUrl = toFileUrl(fallbackDb, true)
      dbToPersist = fallbackDb
      console.log('[GestiCom] Base SQLite utilisee: ' + fallbackDb)
      break
    } catch (e) {
      if (fallbackDb === candidates[candidates.length - 1]) {
        console.warn(
          '[GestiCom] Impossible de copier la base vers un chemin sans espaces. ' +
          'Conseil: deplacez le projet vers C:\\Projets\\gesticom ou executer en administrateur.'
        )
      }
    }
  }
}

process.env.DATABASE_URL = databaseUrl

// Fichier lu par le bootstrap AVANT require(server)
fs.writeFileSync(path.join(standaloneDir, '.database_url'), databaseUrl, 'utf8')

// .env dans standalone pour que Next/chargeurs .env trouvent DATABASE_URL (et SESSION_SECRET)
const standaloneEnv = [
  'DATABASE_URL="' + databaseUrl.replace(/"/g, '\\"') + '"',
  'SESSION_SECRET="' + (process.env.SESSION_SECRET || '').replace(/"/g, '\\"') + '"',
  'NODE_ENV=production',
  'PORT=' + (process.env.PORT || '3000'),
].join('\n')
fs.writeFileSync(path.join(standaloneDir, '.env'), standaloneEnv, 'utf8')

// Bootstrap : définit DATABASE_URL puis charge server.js
const runStandalone = `'use strict';
var p = require('path'), fs = require('fs');
var f = p.join(__dirname, '.database_url');
if (fs.existsSync(f)) { process.env.DATABASE_URL = fs.readFileSync(f, 'utf8').trim(); }
require('./server.js');
`
fs.writeFileSync(path.join(standaloneDir, 'run-standalone.js'), runStandalone, 'utf8')

// Copier public et .next/static dans standalone si absents
const pubStandalone = path.join(standaloneDir, 'public')
const staticStandalone = path.join(standaloneDir, '.next', 'static')
if (!fs.existsSync(pubStandalone)) {
  const pub = path.join(projectRoot, 'public')
  if (fs.existsSync(pub)) {
    fs.cpSync(pub, pubStandalone, { recursive: true })
    console.log('Copié public/ vers standalone')
  }
}
if (!fs.existsSync(staticStandalone)) {
  const st = path.join(projectRoot, '.next', 'static')
  if (fs.existsSync(st)) {
    const nextDir = path.join(standaloneDir, '.next')
    if (!fs.existsSync(nextDir)) fs.mkdirSync(nextDir, { recursive: true })
    fs.cpSync(st, staticStandalone, { recursive: true })
    console.log('Copié .next/static vers standalone')
  }
}

process.env.NODE_ENV = process.env.NODE_ENV || 'production'
process.env.PORT = process.env.PORT || '3000'

const child = spawn('node', ['run-standalone.js'], {
  cwd: standaloneDir,
  env: process.env,
  stdio: 'inherit',
})

const cronChild = spawn('node', [path.join(projectRoot, 'scripts', 'cron-backups.js')], {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
})

child.on('error', (err) => {
  console.error('Erreur:', err)
  process.exit(1)
})
child.on('exit', (code) => {
  if (fs.existsSync(dbToPersist) && fs.existsSync(dbProject)) {
    try {
      fs.copyFileSync(dbToPersist, dbProject)
    } catch (e) {
      console.warn('Impossible de recopier la base vers le projet:', e.message)
    }
  }
  cronChild.kill('SIGINT') // S'assurer de tuer le processus de background
  process.exit(code || 0)
})
