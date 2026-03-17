const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCols() {
  try {
    const cols = await prisma.$queryRaw`PRAGMA table_info(Produit)`
    console.table(cols)
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

checkCols()
