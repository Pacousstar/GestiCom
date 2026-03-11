import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getHardwareId, verifyLicenseKey } from '@/lib/security'

export async function GET() {
    try {
        const hwid = await getHardwareId()
        
        // Vérifier si une licence existe pour cet HWID
        const licence = await prisma.licence.findUnique({
            where: { hwid: hwid }
        })

        if (!licence) {
            return NextResponse.json({ 
                activated: false, 
                hwid: hwid,
                message: "Logiciel non activé sur cette machine." 
            })
        }

        // Vérifier la validité de la clé stockée (anti-tamper)
        const isValid = verifyLicenseKey(hwid, licence.cle)

        if (!isValid || licence.statut !== 'ACTIVE') {
            return NextResponse.json({ 
                activated: false, 
                hwid: hwid,
                message: "Licence invalide ou révoquée." 
            })
        }

        return NextResponse.json({ 
            activated: true, 
            hwid: hwid,
            message: "Licence valide." 
        })
    } catch (error) {
        console.error('License Check Error:', error)
        return NextResponse.json({ error: 'Erreur lors de la vérification de la licence' }, { status: 500 })
    }
}
