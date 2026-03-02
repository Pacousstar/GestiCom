import { ROLE_PERMISSIONS } from '../lib/roles-permissions'

const navigation = [
    { name: 'Dashboard', permission: 'dashboard:view' },
    { name: 'Produits', permission: 'produits:view' },
    { name: 'Stock', permission: 'stocks:view' },
    { name: 'Ventes', permission: 'ventes:view' },
    { name: 'Clients', permission: 'clients:view' },
    { name: 'Fournisseurs', permission: 'fournisseurs:view' },
    { name: 'Achats', permission: 'achats:view' },
    { name: 'Caisse', permission: 'caisse:view' },
    { name: 'Banque', permission: 'banque:view' },
    { name: 'Dépenses', permission: 'depenses:view' },
    { name: 'Charges', permission: 'charges:view' },
    { name: 'Rapports', permission: 'rapports:view' },
    { name: 'Rapports Ventes', permission: 'rapports:ventes' },
    { name: 'Comptabilité', permission: 'comptabilite:view' },
    { name: 'Utilisateurs', permission: 'users:view' },
    { name: 'Journal d\'audit', permission: 'audit:view' },
    { name: 'Menu Expérimental', permission: 'test:experimental' },
]

const role = 'MAGASINIER'
const perms = ROLE_PERMISSIONS[role]

console.log(`Permissions pour ${role}:`, perms)
console.log('\n--- Filtrage du menu ---')

navigation.forEach(item => {
    const visible = perms.includes(item.permission as any)
    console.log(`${item.name}: ${visible ? 'VISIBLE' : 'HIDDEN'} (besoin de ${item.permission})`)
})
