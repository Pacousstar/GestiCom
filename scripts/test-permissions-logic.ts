import { hasPermission, ROLE_PERMISSIONS, type Role, type Permission } from '../lib/roles-permissions';

/**
 * Script de test pour valider la logique des permissions
 * Simule différents scénarios pour s'assurer que hasPermission se comporte comme prévu.
 */

function runTests() {
    console.log('🧪 Début des tests de permissions...\n');

    let success = 0;
    let total = 0;

    function assert(condition: boolean, message: string) {
        total++;
        if (condition) {
            console.log(`✅ [OK] ${message}`);
            success++;
        } else {
            console.error(`❌ [FAIL] ${message}`);
        }
    }

    // Scénario 1 : Super Admin a tout
    assert(hasPermission('SUPER_ADMIN', 'ventes:delete'), 'SUPER_ADMIN doit pouvoir supprimer des ventes');
    assert(hasPermission('SUPER_ADMIN', 'parametres:edit'), 'SUPER_ADMIN doit pouvoir modifier les paramètres');

    // Scénario 2 : Magasinier restreint
    assert(hasPermission('MAGASINIER', 'stocks:view'), 'MAGASINIER doit pouvoir voir les stocks');
    assert(!hasPermission('MAGASINIER', 'ventes:create'), 'MAGASINIER ne doit PAS pouvoir créer de ventes');
    assert(!hasPermission('MAGASINIER', 'comptabilite:view'), 'MAGASINIER ne doit PAS voir la comptabilité');

    // Scénario 3 : Comptable
    assert(hasPermission('COMPTABLE', 'comptabilite:view'), 'COMPTABLE doit voir la comptabilité');
    assert(hasPermission('COMPTABLE', 'ventes:view'), 'COMPTABLE doit pouvoir voir les ventes (lecture)');
    assert(!hasPermission('COMPTABLE', 'ventes:delete'), 'COMPTABLE ne doit PAS supprimer de ventes par défaut');

    // Scénario 4 : Permissions Personnalisées (Override)
    // Une assistante qui a exceptionnellement le droit de supprimer
    const customPermsAssistante = ['ventes:view', 'ventes:create', 'ventes:delete'];
    assert(
        hasPermission('ASSISTANTE', 'ventes:delete', customPermsAssistante),
        'ASSISTANTE avec permission custom doit pouvoir supprimer'
    );
    assert(
        !hasPermission('ASSISTANTE', 'achats:view', customPermsAssistante),
        'ASSISTANTE avec permission custom ne doit voir que ce qui est spécifié (override total)'
    );

    // Scénario 5 : Permissions Personnalisées vides (Fallback)
    // Si customPermissions est passé mais n'est pas undefined (ex: []), il override le rôle.
    // Note : La fonction actuelle retourne customPermissions.includes(permission) si customPermissions !== undefined.
    assert(
        !hasPermission('ADMIN', 'ventes:view', []),
        'Permissions custom vides [] doivent tout bloquer (override total)'
    );

    console.log(`\n📊 Résultats : ${success}/${total} tests réussis.`);
}

runTests();
