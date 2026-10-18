const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Mulai proses seeding data awal...');

  // 1. Buat Data Divisi (Opsional, tapi bagus untuk relasi)
  const divisiIT = await prisma.division.create({
    data: { namaDivisi: 'Teknologi Informasi (IT)' }
  });
  console.log(`Divisi dibuat: ${divisiIT.namaDivisi}`);

  // 2. Siapkan password yang sudah dienkripsi (Contoh password: "password123")
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('password123', saltRounds);

  // 3. Buat Akun Direktur
  const direktur = await prisma.user.create({
    data: {
      namaLengkap: 'Bapak Direktur RS',
      email: 'direktur@rsia.com',
      nomorWhatsApp: '081234567890',
      password: hashedPassword,
      role: 'DIREKTUR', // Pastikan tulisan ini sesuai dengan Enum di schema.prisma Anda
      divisiId: divisiIT.id
    }
  });
  console.log(`User dibuat: ${direktur.namaLengkap} (${direktur.email})`);

  // 4. Buat Akun Staff Koordinator
  const koordinator = await prisma.user.create({
    data: {
      namaLengkap: 'Staff Koordinator IT',
      email: 'koordinator@rsia.com',
      nomorWhatsApp: '081234567891',
      password: hashedPassword,
      role: 'KOORDINATOR', // Pastikan sesuai dengan Enum
      divisiId: divisiIT.id
    }
  });
  console.log(`User dibuat: ${koordinator.namaLengkap} (${koordinator.email})`);

  console.log('Seeding selesai!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });