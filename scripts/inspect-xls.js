const XLSX = require('xlsx-prototype-pollution-fixed');
const path = require('path');

const filePath = 'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM/Valeur de stock par produit.xls';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
} catch (error) {
  console.error('Error reading XLS:', error.message);
}
