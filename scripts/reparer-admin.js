const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🛡️ Vérification de l\'utilisateur administrateur...');
  
  const adminPassword = 'Admin@123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  try {
    const admin = await prisma.utilisateur.findFirst({
      where: { login: 'admin' }
    });

    if (!admin) {
      console.log('➕ Création du compte admin par défaut...');
      await prisma.utilisateur.create({
        data: {
          nom: 'Administrateur',
          login: 'admin',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          actif: true
        }
      });
      console.log('✅ Compte admin créé avec succès.');
    } else {
      console.log('🔄 Mise à jour du compte admin existant...');
      await prisma.utilisateur.update({
        where: { id: admin.id },
        data: {
          password: hashedPassword,
          role: 'SUPER_ADMIN',
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
