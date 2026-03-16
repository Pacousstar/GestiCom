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
// Production : VERROUILLAGE TOTAL sur la base centrale C:\gesticom\gesticom.db
if (process.env.NODE_ENV === 'production') {
  const centralDb = "C:/gesticom/gesticom.db";
  
  // On force le chemin absolu standard GSN - AUCUNE EXCEPTION
  process.env.DATABASE_URL = `file:${centralDb}`;
  
  console.log('==========================================================');
  console.log('[lib/db] PRODUCTION : BASE DE DONNEES VERROUILLEE SUR :');
  console.log('         ' + process.env.DATABASE_URL);
  console.log('==========================================================');
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
