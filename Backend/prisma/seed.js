const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Mengacak password 'admin123' sebelum disimpan ke database
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@rsia.com' },
    update: {}, // Jika sudah ada, jangan lakukan apa-apa
    create: {
      namaLengkap: 'Administrator Sistem',
      email: 'admin@rsia.com',
      password: hashedPassword,
      role: 'ADMIN',
      // divisiId dan nomorWhatsApp dibiarkan kosong (null) karena ini Admin
    },
  });

  console.log(`admin berhasil dibuat: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });