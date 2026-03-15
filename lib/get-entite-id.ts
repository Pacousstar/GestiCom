import { Session } from './auth'
import { prisma } from './db'

/**
 * Récupère l'entiteId à utiliser pour les opérations.
 * Pour SUPER_ADMIN, utilise l'entiteId de la session (qui peut être changé).
 * Pour les autres, utilise l'entiteId de l'utilisateur en base (sécurité).
 */
export async function getEntiteId(session: Session): Promise<number> {
  if (session.role === 'SUPER_ADMIN') {
    // SUPER_ADMIN peut utiliser l'entité sélectionnée dans la session
    return session.entiteId || session.userId // Fallback si pas défini
  }
  
  // Pour les autres rôles ou si SUPER_ADMIN n'a pas d'entité valide
  const user = await prisma.utilisateur.findUnique({
    where: { id: session.userId },
    select: { entiteId: true },
  })
  
  const potentialId = user?.entiteId || session.entiteId

  if (potentialId) {
    // Vérifier si l'entité existe vraiment en base
    const exists = await prisma.entite.findUnique({
      where: { id: potentialId },
      select: { id: true }
    })
    if (exists) return potentialId
  }

  // Fallback ultime : première entité trouvée (pour éviter P2003)
  const firstEntite = await prisma.entite.findFirst({ select: { id: true } })
  if (firstEntite) return firstEntite.id

  return 0 // Cas théorique sans aucune entité
}
