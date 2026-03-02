import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const login = 'Pc' // Le nom qui apparaît dans les logs utilisateur

    const user = await prisma.utilisateur.findUnique({ where: { login } })
    if (!user) {
        console.log(`Utilisateur "${login}" introuvable.`)
        // Chercher par nom si login différent
        const users = await prisma.utilisateur.findMany({ where: { nom: { contains: 'Pc' } } })
        console.log('Utilisateurs trouvés avec "Pc" dans le nom:', users.map(u => ({ id: u.id, login: u.login, role: u.role, custom: u.permissionsPersonnalisees })))
        return
    }

    console.log('État actuel de l\'utilisateur Pc:', {
        id: user.id,
        login: user.login,
        role: user.role,
        permissionsPersonnalisees: user.permissionsPersonnalisees
    })

    // Réinitialisation forcée pour le test
    if (user.permissionsPersonnalisees) {
        console.log('Réinitialisation des permissions personnalisées pour Pc...')
        await prisma.utilisateur.update({
            where: { id: user.id },
            data: { permissionsPersonnalisees: null }
        })
        console.log('Permissions réinitialisées à NULL (utilisation du rôle MAGASINIER par défaut).')
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
