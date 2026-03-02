import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.utilisateur.findMany({
        select: {
            login: true,
            nom: true,
            role: true,
            permissionsPersonnalisees: true
        }
    })

    console.log('--- Liste des utilisateurs et permissions ---')
    users.forEach(u => {
        console.log(`Utilisateur: ${u.nom} (${u.login})`)
        console.log(`Rôle: ${u.role}`)
        console.log(`Permissions Personnalisées: ${u.permissionsPersonnalisees || 'Aucune (utilise les défauts du rôle)'}`)
        console.log('---')
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
