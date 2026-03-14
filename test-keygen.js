const crypto = require('crypto');

const HWID = "GCOM-9E1B-CE5B";
const SALT = "GESTICOM-SECRET-SAFETY-2026";

function generateLicenseKey(hwid) {
    const hash = crypto.createHash('sha256').update(hwid + SALT).digest('hex').toUpperCase();
    return `${hash.substring(0, 4)}-${hash.substring(8, 12)}-${hash.substring(16, 20)}-${hash.substring(24, 28)}`;
}

console.log(`HWID: ${HWID}`);
console.log(`Key : ${generateLicenseKey(HWID)}`);
