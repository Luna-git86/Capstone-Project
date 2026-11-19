const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showUsers() {
  const users = await prisma.user.findMany({
    include: { divisi: true },
    orderBy: { id: 'asc' }
  });
  console.log(JSON.stringify(users.map(u => ({
    id: u.id,
    nama: u.nama,
    noHp: u.noHp,
    role: u.role,
    divisiId: u.divisiId,
    divisi: u.divisi ? u.divisi.nama : null
  })), null, 2));
}

showUsers()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
