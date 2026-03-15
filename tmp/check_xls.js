const XLSX = require('xlsx-prototype-pollution-fixed');
const path = require('path');

const XLS_PATH = 'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM/Valeur de stock par produit.xls';

try {
  const workbook = XLSX.readFile(XLS_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
  console.log(`Total data length: ${data.length}`);
  data.slice(0, 5).forEach((row, i) => console.log(`[Start ${i}]`, row));
  data.slice(-5).forEach((row, i) => console.log(`[End ${i}]`, row));
} catch (e) {
  console.error(e);
}
