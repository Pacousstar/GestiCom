import { execSync } from 'child_process'
import crypto from 'crypto'

/**
 * Récupère un identifiant unique pour la machine (Hardware ID).
 * Utilise le numéro de série de la carte mère sous Windows.
 */
export async function getHardwareId(): Promise<string> {
    try {
        if (process.platform !== 'win32') {
            return 'NON-WINDOWS-' + crypto.randomBytes(4).toString('hex').toUpperCase()
        }

        // On tente de récupérer le numéro de série de la carte mère (Baseboard)
        const output = execSync('wmic baseboard get serialnumber', { encoding: 'utf8' })
        const lines = output.trim().split('\n')
        const serial = lines.length > 1 ? lines[1].trim() : 'UNKNOWN'

        if (!serial || serial === 'None' || serial === 'Default string') {
            // Fallback sur le UUID système si le serial baseboard est indisponible
            const uuidOutput = execSync('wmic csproduct get uuid', { encoding: 'utf8' })
            const uuidLines = uuidOutput.trim().split('\n')
            const uuid = uuidLines.length > 1 ? uuidLines[1].trim() : 'UNKNOWN'
            return generateGestiComId(uuid)
        }

        return generateGestiComId(serial)
    } catch (error) {
        console.error('Erreur lors de la récupération du HWID:', error)
        return 'GCOM-ERROR-' + crypto.randomBytes(4).toString('hex').toUpperCase()
    }
}

/**
 * Formate un ID brut en identifiant GestiCom lisible (ex: GCOM-XXXX-XXXX)
 */
function generateGestiComId(raw: string): string {
    const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase()
    const part1 = hash.substring(0, 4)
    const part2 = hash.substring(4, 8)
    return `GCOM-${part1}-${part2}`
}

/**
 * Vérifie si une clé est valide pour un HWID donné
 */
export function verifyLicenseKey(hwid: string, key: string): boolean {
    const expectedKey = generateLicenseKey(hwid)
    return key === expectedKey
}

/**
 * Génère la clé de licence à partir du HWID (Algorithme propriétaire)
 * Note : Ce secret doit rester côté serveur/générateur.
 */
export function generateLicenseKey(hwid: string): string {
    const SALT = "GESTICOM-SECRET-SAFETY-2026"
    const hash = crypto.createHash('sha256').update(hwid + SALT).digest('hex').toUpperCase()
    // On extrait des segments pour former une clé type XXXX-XXXX-XXXX-XXXX
    return `${hash.substring(0, 4)}-${hash.substring(8, 12)}-${hash.substring(16, 20)}-${hash.substring(24, 28)}`
}
