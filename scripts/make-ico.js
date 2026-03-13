const fs = require('fs');
const path = require('path');

/**
 * Creates a basic ICO file container around a PNG.
 * Windows supports PNG-compressed icons since Vista.
 */
function createIcoFromPng(pngPath, icoPath) {
    if (!fs.existsSync(pngPath)) {
        console.error(`❌ Source introuvable : ${pngPath}`);
        return;
    }

    const pngBuffer = fs.readFileSync(pngPath);
    const size = pngBuffer.length;

    // ICO Header (6 bytes)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type (1 = ICO)
    header.writeUInt16LE(1, 4); // Number of images

    // Directory Entry (16 bytes)
    const entry = Buffer.alloc(16);
    entry.writeUInt8(0, 0); // Width (0 means 256)
    entry.writeUInt8(0, 1); // Height (0 means 256)
    entry.writeUInt8(0, 2); // Color count
    entry.writeUInt8(0, 3); // Reserved
    header.writeUInt16LE(1, 4); // Planes (must be 1) -- Wait, offset 4 in entry
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(size, 8); // Data size
    entry.writeUInt32LE(22, 12); // Data offset (6 + 16)

    const icoBuffer = Buffer.concat([header, entry, pngBuffer]);
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`✅ Icône générée avec succès : ${icoPath}`);
}

const sourcePng = path.join(__dirname, '..', 'public', 'logo_shortcut.png');
const destIco = path.join(__dirname, '..', 'public', 'gesticom_final.ico');

createIcoFromPng(sourcePng, destIco);
