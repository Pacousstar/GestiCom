import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getHardwareId, verifyLicenseKey } from '@/lib/security'

export async function POST(request: Request) {
    try {
        const { key } = await request.json()
        const hwid = await getHardwareId()

        if (!key) {
            return NextResponse.json({ error: 'La clé d\'activation est requise' }, { status: 400 })
        }

        // Vérifier la clé
        const isValid = verifyLicenseKey(hwid, key)

        if (!isValid) {
            return NextResponse.json({ error: 'Clé d\'activation invalide pour cette machine.' }, { status: 400 })
        }

        // Enregistrer ou mettre à jour la licence
        const licence = await prisma.licence.upsert({
            where: { hwid: hwid },
            update: {
                cle: key,
                statut: 'ACTIVE',
                dateActivation: new Date(),
                updatedAt: new Date()
            },
            create: {
                hwid: hwid,
                cle: key,
                statut: 'ACTIVE',
                dateActivation: new Date()
            }
        })

        return NextResponse.json({ 
            success: true, 
            message: 'Logiciel activé avec succès !',
            licence
        })
    } catch (error) {
        console.error('Activation Error:', error)
        return NextResponse.json({ error: 'Erreur lors de l\'activation' }, { status: 500 })
    }
}
