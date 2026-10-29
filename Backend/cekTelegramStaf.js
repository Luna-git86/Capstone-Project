
const prisma = require('./db');

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      nama: true,
      telegramChatId: true,
    },
    orderBy: { id: 'asc' },
  });

  console.table(
    users.map((user) => ({
      id: user.id,
      nama: user.nama,
      statusTelegram: user.telegramChatId
        ? 'SUDAH TERHUBUNG'
        : 'BELUM TERHUBUNG',
    }))
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
