import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// En développement : si GESTICOM_USE_PORTABLE_DB=1 ou fichier C:\GestiCom-Portable présent, utiliser la même base que le portable.
if (process.env.NODE_ENV !== 'production' && process.platform === 'win32') {
  const usePortableDb = process.env.GESTICOM_USE_PORTABLE_DB === '1'
  const prodPath = path.join('C:', 'GestiCom-Portable', 'database_url.txt')
  if (usePortableDb && fs.existsSync(prodPath)) {
    try {
      const url = fs.readFileSync(prodPath, 'utf8').trim()
      if (url) process.env.DATABASE_URL = url
    } catch (_) { }
  }
}
// Production (portable) : URL = C:\GestiCom-Portable\database_url.txt (priorité), sinon LOCALAPPDATA, puis .database_url.
if (process.env.NODE_ENV === 'production') {
  try {
    const hasValidUrl = process.env.DATABASE_URL?.startsWith('file:')
    if (!hasValidUrl && process.platform === 'win32') {
      const prodPath = path.join('C:', 'GestiCom-Portable', 'database_url.txt')
      if (fs.existsSync(prodPath)) {
        const url = fs.readFileSync(prodPath, 'utf8').trim()
        if (url) process.env.DATABASE_URL = url
      }
      if (!process.env.DATABASE_URL && process.env.LOCALAPPDATA) {
        const fixedPath = path.join(process.env.LOCALAPPDATA, 'GestiComPortable', 'database_url.txt')
        if (fs.existsSync(fixedPath)) {
          const url = fs.readFileSync(fixedPath, 'utf8').trim()
          if (url) process.env.DATABASE_URL = url
        }
      }
    }
    if (!hasValidUrl && !process.env.DATABASE_URL) {
      const cwdFile = path.join(process.cwd(), '.database_url')
      if (fs.existsSync(cwdFile)) {
        const url = fs.readFileSync(cwdFile, 'utf8').trim()
        if (url) process.env.DATABASE_URL = url
      }
    }
  } catch (_) {
    // ignorer
  }
  // Sous Windows, SQLite (erreur 14) peut refuser les chemins avec %20 ; on décode l'URL pour utiliser des espaces réels
  if (process.env.DATABASE_URL && process.platform === 'win32' && process.env.DATABASE_URL.startsWith('file:')) {
    try {
      const raw = process.env.DATABASE_URL
      const decoded = 'file:' + decodeURIComponent(raw.replace(/^file:\/?\/?/, ''))
      if (decoded !== raw) process.env.DATABASE_URL = decoded
    } catch (_) {
      // garder l'URL telle quelle
    }
  }
  if (!process.env.DATABASE_URL) {
    console.error('[lib/db] ERREUR: DATABASE_URL non défini en production')
  } else {
    console.log('[lib/db] DATABASE_URL=' + process.env.DATABASE_URL)
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'], // Moins de logs verbeux
  // Optimisations pour SQLite sur Windows
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
