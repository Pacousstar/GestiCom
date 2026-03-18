const fs = require('fs');
const path = require('path');

const targetDir = 'C:\\Users\\GSN EXPETISES  GROUP\\Projets\\INSTALLATION_CLIENT_GESTICOM';
const keep = [
  '.env',
  '.next',
  'node_modules',
  'prisma',
  'public',
  'scripts',
  'server.js',
  'INSTALLER-PRO.bat',
  'LANCER-SILENCIEUX.vbs',
  'REPARER-ADMIN.bat',
  'MISE-A-JOUR.bat',
  'DESINSTALLER.bat',
  'gesticom.ico',
  'NOTICE-INSTALLATION.txt'
];

fs.readdirSync(targetDir).forEach(file => {
  if (!keep.includes(file)) {
    const fullPath = path.join(targetDir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log('Deleted Dir:', file);
    } else {
      fs.unlinkSync(fullPath);
      console.log('Deleted File:', file);
    }
  }
});
