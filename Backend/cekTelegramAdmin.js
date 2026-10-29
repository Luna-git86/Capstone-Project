const prisma = require('./db');

async function main() {
  const admin = await prisma.user.findUnique({
    where: { id: 1 },
    select: {
      id: true,
      nama: true,
      telegramChatId: true,
    },
  });

  if (!admin) {
    console.log('Akun Administrator tidak ditemukan.');
    return;
  }

  console.log({
    id: admin.id,
    nama: admin.nama,
    telegramTerhubung: Boolean(admin.telegramChatId),
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });