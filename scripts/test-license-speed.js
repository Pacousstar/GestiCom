const { exec } = require('child_process');
const crypto = require('crypto');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testSecurity() {
    console.time('HWID_Detection');
    console.log('--- TEST DÉTECTION MATÉRIELLE ---');
    
    async function getHardwareId() {
        try {
            if (process.platform !== 'win32') return 'NON-WINDOWS-' + crypto.randomBytes(4).toString('hex').toUpperCase();
            
            let serial = 'UNKNOWN';
            try {
                // Simulation du timeout
                const { stdout } = await execAsync('wmic baseboard get serialnumber', { timeout: 5000 });
                const lines = stdout.trim().split('\n');
                serial = lines.length > 1 ? lines[1].trim() : 'UNKNOWN';
                console.log('Serial détecté:', serial);
            } catch (e) {
                console.warn('WMIC Serial Number failed or timed out');
            }

            if (!serial || serial === 'None' || serial === 'Default string' || serial === 'UNKNOWN') {
                try {
                    const { stdout: uuidOutput } = await execAsync('wmic csproduct get uuid', { timeout: 5000 });
                    const uuidLines = uuidOutput.trim().split('\n');
                    const uuid = uuidLines.length > 1 ? uuidLines[1].trim() : 'UNKNOWN';
                    console.log('UUID détecté:', uuid);
                    return uuid;
                } catch (e) {
                    console.warn('WMIC UUID failed or timed out');
                }
                return 'FALLBACK-' + (process.env.COMPUTERNAME || 'STATION');
            }
            return serial;
        } catch (error) {
            console.error('Erreur:', error);
            return 'ERROR';
        }
    }

    const hwid = await getHardwareId();
    console.log('HWID Final Result:', hwid);
    console.timeEnd('HWID_Detection');
}

testSecurity();
