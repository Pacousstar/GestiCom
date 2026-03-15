const XLSX = require('xlsx-prototype-pollution-fixed');
const XLS_PATH = 'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM/Valeur de stock par produit.xls';

try {
  const workbook = XLSX.readFile(XLS_PATH);
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false });
  
  const uniqueNames = new Set();
  const duplicates = [];
  
  data.forEach((row, i) => {
    const name = (row[' Désignation  '] || row['Désignation'] || '').trim();
    if (name) {
      if (uniqueNames.has(name)) {
        duplicates.push({ line: i + 2, name });
      } else {
        uniqueNames.add(name);
      }
    }
  });

  console.log(`Lignes non vides : ${uniqueNames.size + duplicates.length}`);
  console.log(`Produits uniques : ${uniqueNames.size}`);
  console.log(`Doublons trouvés :`, duplicates);
} catch (e) {
  console.error(e);
}
