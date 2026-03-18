const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🛡️ Vérification de l\'utilisateur administrateur...');
  
  const adminPassword = 'Admin@123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  try {

    // 1. S'assurer qu'au moins une entité existe
    let entite = await prisma.entite.findFirst();
    if (!entite) {
      console.log('➕ Création de l\'entité par défaut...');
      entite = await prisma.entite.create({
        data: {
          code: 'SIEGE',
          nom: 'SIÈGE SOCIAL',
          type: 'PRINCIPAL',
          localisation: 'Ville',
          active: true
        }
      });
      console.log('✅ Entité "SIÈGE SOCIAL" créée.');
    }

    // 2. S'assurer qu'au moins un magasin existe
    let magasin = await prisma.magasin.findFirst();
    if (!magasin) {
      console.log('➕ Création du magasin par défaut...');
      magasin = await prisma.magasin.create({
        data: {
          code: 'MAG001',
          nom: 'MAGASIN PRINCIPAL',
          localisation: 'Siège',
          entiteId: entite.id,
          actif: true
        }
      });
      console.log('✅ Magasin "MAGASIN PRINCIPAL" créé.');
    }

    const admin = await prisma.utilisateur.findFirst({
      where: { login: 'admin' }
    });

    if (!admin) {
      console.log('➕ Création du compte admin par défaut...');
      await prisma.utilisateur.create({
        data: {
          nom: 'Administrateur',
          login: 'admin',
          motDePasse: hashedPassword,
          role: 'SUPER_ADMIN',
          entiteId: entite.id,
          actif: true
        }
      });
      console.log('✅ Compte admin créé avec succès.');
    } else {
      console.log('🔄 Mise à jour du compte admin existant...');
      await prisma.utilisateur.update({
        where: { id: admin.id },
        data: {
          motDePasse: hashedPassword,
          role: 'SUPER_ADMIN',
          entiteId: entite.id,
          actif: true
        }
      });
      console.log('✅ Compte admin réinitialisé avec succès.');
    }
    
    console.log('---------------------------------------------');
    console.log('IDENTIFIANTS PAR DEFAUT :');
    console.log('Login    : admin');
    console.log('Password : ' + adminPassword);
    console.log('---------------------------------------------');

  } catch (error) {
    console.error('❌ Erreur lors de la réparation de l\'admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
