const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function massiveRepair() {
  console.log('🚀 Démarrage de la réparation massive v6...');
  
  const VALID_ENTITE_ID = 18;
  
  // Noms exacts des modèles dans Prisma Client (souvent en minuscules)
  const jobs = [
    { model: 'utilisateur', field: 'entiteId' },
    { model: 'magasin', field: 'entiteId' },
    { model: 'mouvement', field: 'entiteId' },
    { model: 'vente', field: 'entiteId' },
    { model: 'achat', field: 'entiteId' },
    { model: 'transfert', field: 'entiteId' },
    { model: 'depense', field: 'entiteId' },
    { model: 'charge', field: 'entiteId' },
    { model: 'banque', field: 'entiteId' }
  ];

  for (const job of jobs) {
    try {
      if (prisma[job.model]) {
        const result = await prisma[job.model].updateMany({
          where: {
            OR: [
              { [job.field]: 13 },
              { [job.field]: 0 },
              { [job.field]: null }
            ]
          },
          data: { [job.field]: VALID_ENTITE_ID }
        });
        console.log(`✅ ${job.model} : ${result.count} enregistrements réparés.`);
      } else {
        console.log(`⚠️ Modèle ${job.model} non trouvé dans Prisma Client.`);
      }
    } catch (err) {
      console.log(`❌ Erreur sur ${job.model} : ${err.message}`);
    }
  }

  // Vérification finale du SUPER_ADMIN
  const admin = await prisma.utilisateur.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (admin && admin.entiteId !== VALID_ENTITE_ID) {
    await prisma.utilisateur.update({
      where: { id: admin.id },
      data: { entiteId: VALID_ENTITE_ID }
    });
    console.log(`✅ SUPER_ADMIN (${admin.login}) : entiteId forcé à ${VALID_ENTITE_ID}.`);
  }

  console.log('✨ Réparation terminée !');
}

massiveRepair()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
