const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Mengosongkan riwayat tiket penugasan, pelaporan masalah, dan log notifikasi...');
  
  const deletedLogs = await prisma.notificationLog.deleteMany({});
  const deletedTickets = await prisma.ticket.deleteMany({});
  
  console.log(`- Berhasil menghapus ${deletedLogs.count} data log notifikasi.`);
  console.log(`- Berhasil menghapus ${deletedTickets.count} data tiket penugasan dan pelaporan masalah.`);
  
  const countTickets = await prisma.ticket.count();
  const countLogs = await prisma.notificationLog.count();
  
  console.log('\nStatus Database Saat Ini:');
  console.log(`- Total Tiket Penugasan & Pelaporan: ${countTickets}`);
  console.log(`- Total Riwayat Log Notifikasi: ${countLogs}`);
  console.log('✅ History penugasan dan pelaporan masalah berhasil dikosongkan!');
}

main()
  .catch((e) => {
    console.error('Gagal mengosongkan database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
