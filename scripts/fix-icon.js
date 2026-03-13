const fs = require('fs');
const path = require('path');

// Note: This is a fake ICO header + BMP for demonstration if we don't have a real converter.
// But we actually just want to make sure the favicon.ico is updated or we use a proper shortcut method.
// Let's at least try to copy the png to a fixed location for the shortcut.

const source = 'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM/logo_shortcut.png';
const dest = 'C:/gesticom/gesticom.png';

if (fs.existsSync(source)) {
    if (!fs.existsSync('C:/gesticom')) fs.mkdirSync('C:/gesticom');
    fs.copyFileSync(source, dest);
    console.log('✅ Image copiée vers C:/gesticom/gesticom.png');
} else {
    console.error('❌ Source introuvable');
}
