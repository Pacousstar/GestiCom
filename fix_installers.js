const fs = require('fs');

const files = [
    'c:\\Users\\GSN EXPETISES  GROUP\\Projets\\gesticom2\\install\\INSTALLER.bat',
    'c:\\Users\\GSN EXPETISES  GROUP\\Projets\\INSTALLATION_GESTICOM\\INSTALLER.bat'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        // Supprimer le BOM si présent
        content = content.replace(/^\uFEFF/, '');
        // Forcer les fins de ligne CRLF
        content = content.replace(/\r?\n/g, '\r\n');
        fs.writeFileSync(file, content, { encoding: 'latin1' }); // Latin1 est souvent plus robuste pour CMD que UTF-8 sans BOM
        console.log(`Fichier traité : ${file}`);
    }
});
