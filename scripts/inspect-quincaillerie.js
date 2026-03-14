
const xlsx = require('xlsx-prototype-pollution-fixed');
const path = require('path');

const filePath = 'C:/Users/GSN EXPETISES  GROUP/Projets/INSTALLATION_GESTICOM/Quincaillerie ETB.xlsx';

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log('--- Colonnes détectées ---');
    if (data.length > 0) {
        console.log(Object.keys(data[0]));
    }

    console.log('\n--- Aperçu des 5 premières lignes ---');
    console.log(JSON.stringify(data.slice(0, 5), null, 2));

    const categories = new Set();
    data.forEach(row => {
        if (row['Catégorie'] || row['Categorie']) {
            categories.add(row['Catégorie'] || row['Categorie']);
        }
    });

    console.log('\n--- Catégories uniques détectées ---');
    console.log(Array.from(categories));

} catch (e) {
    console.error('Erreur lors de la lecture du fichier Excel:', e.message);
}
