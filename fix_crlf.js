const fs = require('fs');
const files = [
  'C:\\Users\\GSN EXPETISES  GROUP\\Projets\\INSTALLATION_GESTICOM\\INSTALLER.bat',
  'C:\\Users\\GSN EXPETISES  GROUP\\Projets\\gesticom2\\install\\INSTALLER.bat'
];
for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fix CRLF ok: ${file}`);
  }
}
