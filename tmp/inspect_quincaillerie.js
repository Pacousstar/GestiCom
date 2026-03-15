const XLSX = require('xlsx-prototype-pollution-fixed');
const path = require('path');

const XLS_PATH = 'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM/Quincaillerie ETB.xlsx';

try {
  const workbook = XLSX.readFile(XLS_PATH);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
  console.log(`Total data length: ${data.length}`);
  if (data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
    console.log('Sample data (3 items):', JSON.stringify(data.slice(0, 3), null, 2));
  }
} catch (e) {
  console.error(e);
}
