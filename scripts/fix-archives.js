const fs = require('fs')
try {
  let txt = fs.readFileSync('app/(dashboard)/dashboard/ventes/page.tsx', 'utf-8')
  txt = txt.replace(/export default function VentesPage\(\)/g, 'export default function ArchivesVentesNouvellePage()')
  txt = txt.replace(/const \[form, setForm\] = useState\(false\)/g, 'const [form, setForm] = useState(true)')
  txt = txt.replace(/fetch\('\/api\/ventes'/g, "fetch('/api/archives/ventes/nouvelle'")
  txt = txt.replace(/Ventes<\/h1>/g, 'Archives des Ventes (Anciennes)</h1>')
  txt = txt.replace(/>Nouvelle Vente<\/button>/g, '>Saisir Archive</button>')
  // Force le tableau à se cacher
  txt = txt.replace(/\{\!form && \(/g, '{false && (')
  fs.writeFileSync('app/(dashboard)/dashboard/archives/ventes/nouvelle/page.tsx', txt)
  console.log('OK')
} catch(e) {
  console.error(e)
}
