const xlsx = require('xlsx-prototype-pollution-fixed');
const path = require('path');

const EXCEL_PATH = "C:/Users/GSN EXPETISES  GROUP/Projets/Valeur de stock par produit2.xls";

try {
    const workbook = xlsx.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    if (data.length > 0) {
        console.log('--- EN-TÊTES DÉTECTÉS ---');
        console.log(Object.keys(data[0]));
        console.log('--- EXEMPLE DE LIGNE ---');
        console.log(data[0]);
    } else {
        console.log('Le fichier est vide.');
    }
} catch (e) {
    console.error('Erreur lors de la lecture du fichier :', e.message);
}
