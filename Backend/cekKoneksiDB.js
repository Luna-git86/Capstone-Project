const prisma = require('./db');

async function main() {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  console.log('Koneksi database berhasil.');
}

main()
  .catch((error) => {
    console.error('Koneksi database gagal:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });