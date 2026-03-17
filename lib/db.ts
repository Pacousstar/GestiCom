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
// On utilise la DATABASE_URL du .env en priorité absolue.
// Si rien n'est défini, on tente une détection intelligente mais sans verrouillage forcé.
if (!process.env.DATABASE_URL) {
  const centralDb = "C:/gesticom/gesticom.db";
  if (fs.existsSync(centralDb)) {
    process.env.DATABASE_URL = `file:${centralDb}`;
  }
}

if (process.env.DATABASE_URL) {
  console.log('[lib/db] Connecté à : ' + process.env.DATABASE_URL);
}

const dbUrl = process.env.DATABASE_URL || "file:C:/gesticom/gesticom.db";

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'], 
  datasources: {
    db: {
      url: dbUrl,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
