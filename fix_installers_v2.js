const fs = require('fs');

const files = [
    'c:\\Users\\GSN EXPETISES  GROUP\\Projets\\gesticom2\\install\\INSTALLER.bat',
    'c:\\Users\\GSN EXPETISES  GROUP\\Projets\\INSTALLATION_GESTICOM\\INSTALLER.bat'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let buffer = fs.readFileSync(file);
        // Si il y a un BOM UTF-8 (EF BB BF), on le vire
        if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
            buffer = buffer.slice(3);
        }
        let content = buffer.toString('utf8');
        // Uniformiser CRLF
        content = content.replace(/\r?\n/g, '\r\n');
        // Ecrire en UTF-8 propre (sans BOM)
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fichier traité (UTF-8) : ${file}`);
    }
});
