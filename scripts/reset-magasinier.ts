import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const login = 'magasinier' // À adapter si le login est différent

    const user = await prisma.utilisateur.findUnique({ where: { login } })
    if (!user) {
        console.log(`Utilisateur "${login}" introuvable.`)
        return
    }

    await prisma.utilisateur.update({
        where: { login },
        data: {
            role: 'MAGASINIER',
            permissionsPersonnalisees: null // On vide les surcharges
        }
    })

    console.log(`Utilisateur "${login}" réinitialisé au rôle MAGASINIER sans surcharges.`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
