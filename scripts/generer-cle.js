const crypto = require('crypto');
const readline = require('readline');

/**
 * GÉNÉRATEUR DE CLÉ DE LICENCE GESTICOM
 * Cet outil est réservé à l'usage exclusif du DG DIHI.
 */

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const SALT = "GESTICOM-SECRET-SAFETY-2026";

function generateLicenseKey(hwid) {
    if (!hwid || !hwid.startsWith('GCOM-')) {
        throw new Error("Format HWID invalide. Il doit commencer par 'GCOM-'.");
    }
    
    const hash = crypto.createHash('sha256').update(hwid + SALT).digest('hex').toUpperCase();
    
    // Format : XXXX-XXXX-XXXX-XXXX (segments extraits du hash)
    return `${hash.substring(0, 4)}-${hash.substring(8, 12)}-${hash.substring(16, 20)}-${hash.substring(24, 28)}`;
}

console.log("\n======================================================");
console.log("       GÉNÉRATEUR DE CLÉ DE LICENCE GESTICOM        ");
console.log("             (Usage Réservé au DG DIHI)            ");
console.log("======================================================\n");

rl.question("Entrez l'ID Machine du client (ex: GCOM-ABCD-1234) : ", (hwid) => {
    try {
        const cleanHwid = hwid.trim().toUpperCase();
        const key = generateLicenseKey(cleanHwid);
        
        console.log("\n------------------------------------------------------");
        console.log(`POUR HWID : ${cleanHwid}`);
        console.log(`CLÉ GÉNÉRÉE : ${key}`);
        console.log("------------------------------------------------------\n");
        console.log("Veuillez transmettre cette clé au client.");
    } catch (error) {
        console.log(`\nERREUR : ${error.message}`);
    } finally {
        rl.close();
    }
});
