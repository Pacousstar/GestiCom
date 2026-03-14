import { exec } from 'child_process'
import { promisify } from 'util'
import crypto from 'crypto'

const execAsync = promisify(exec)

// Cache mémorisé pour éviter de relancer wmic à chaque requête
let cachedHardwareId: string | null = null;

/**
 * Récupère un identifiant unique pour la machine (Hardware ID).
 * Mémorise le résultat après la première récupération réussie.
 */
export async function getHardwareId(): Promise<string> {
    if (cachedHardwareId) return cachedHardwareId;

    try {
        if (process.platform !== 'win32') {
            cachedHardwareId = 'NON-WINDOWS-' + crypto.randomBytes(4).toString('hex').toUpperCase()
            return cachedHardwareId;
        }

        // Fonction interne pour tenter de récupérer des infos via shell avec timeout
        const tryExec = async (cmd: string, timeout: number): Promise<string> => {
            return new Promise((resolve) => {
                const timer = setTimeout(() => resolve('TIMEOUT'), timeout);
                exec(cmd, (error, stdout) => {
                    clearTimeout(timer);
                    if (error || !stdout) return resolve('ERROR');
                    resolve(stdout.trim());
                });
            });
        };

        // 1. Essai Board Serial (1s max)
        const serialOutput = await tryExec('wmic baseboard get serialnumber', 1000);
        if (serialOutput !== 'TIMEOUT' && serialOutput !== 'ERROR') {
            const lines = serialOutput.split('\n');
            const serial = lines.length > 1 ? lines[1].trim() : '';
            if (serial && serial !== 'None' && serial !== 'Default string') {
                cachedHardwareId = generateGestiComId(serial);
                return cachedHardwareId;
            }
        }

        // 2. Essai UUID (0.8s max)
        const uuidOutput = await tryExec('wmic csproduct get uuid', 800);
        if (uuidOutput !== 'TIMEOUT' && uuidOutput !== 'ERROR') {
            const lines = uuidOutput.split('\n');
            const uuid = lines.length > 1 ? lines[1].trim() : '';
            if (uuid && uuid !== '00000000-0000-0000-0000-000000000000') {
                cachedHardwareId = generateGestiComId(uuid);
                return cachedHardwareId;
            }
        }

        // 3. Fallback immédiat (Nom du PC)
        cachedHardwareId = generateGestiComId('PC-' + (process.env.COMPUTERNAME || 'STATION'));
        return cachedHardwareId;
    } catch (error) {
        return 'GCOM-ERR-' + crypto.randomBytes(4).toString('hex').toUpperCase()
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
 */
export function generateLicenseKey(hwid: string): string {
    const SALT = "GESTICOM-SECRET-SAFETY-2026"
    const hash = crypto.createHash('sha256').update(hwid + SALT).digest('hex').toUpperCase()
    // On extrait des segments pour former une clé type XXXX-XXXX-XXXX-XXXX
    return `${hash.substring(0, 4)}-${hash.substring(8, 12)}-${hash.substring(16, 20)}-${hash.substring(24, 28)}`
}
