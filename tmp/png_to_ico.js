const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function convertPngToIco(inputPath, outputPath) {
  try {
    // 1. Redimensionner l'image en 256x256 (taille max standard ICO/PNG)
    const pngBuffer = await sharp(inputPath)
      .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // 2. Créer l'entête ICO (Header + Directory + Data)
    // Header (6 bytes)
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Resource Type (1 for Icon)
    header.writeUInt16LE(1, 4); // Number of images

    // Directory (16 bytes)
    const directory = Buffer.alloc(16);
    directory.writeUInt8(0, 0);   // Width (0 means 256)
    directory.writeUInt8(0, 1);   // Height (0 means 256)
    directory.writeUInt8(0, 2);   // Color palette
    directory.writeUInt8(0, 3);   // Reserved
    directory.writeUInt16LE(1, 4); // Color planes
    directory.writeUInt16LE(32, 6); // Bits per pixel
    directory.writeUInt32LE(pngBuffer.length, 8); // Image size
    directory.writeUInt32LE(22, 12); // Offset to image data (6+16=22)

    // Fusionner le tout
    const icoBuffer = Buffer.concat([header, directory, pngBuffer]);

    fs.writeFileSync(outputPath, icoBuffer);
    console.log(`✅ Conversion réussie : ${outputPath}`);
  } catch (error) {
    console.error('❌ Erreur conversion :', error);
  }
}

const input = 'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM/LOGOGestiComBuro1.png';
const output = 'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM/gesticom.ico';

convertPngToIco(input, output);
