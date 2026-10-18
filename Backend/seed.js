const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Memulai proses seeding database...');

  // 1. Seeding Data Master Divisi RSIA Qurrata A'yun (Sesuai Struktur Organisasi)
  const divisions = [
    { namaDivisi: 'Pelayanan Medis' },
    { namaDivisi: 'Penunjang Medis' },
    { namaDivisi: 'Administrasi Keuangan' },
    { namaDivisi: 'Marketing' },
    { namaDivisi: 'Umum/IT' },
    { namaDivisi: 'Human Resource Development' }
  ];

  console.log('Menanamkan data divisi...');
  for (const div of divisions) {
    const exists = await prisma.division.findFirst({
      where: { namaDivisi: div.namaDivisi }
    });
    
    if (!exists) {
      await prisma.division.create({ data: div });
    }
  }

  // 2. Seeding Akun ADMIN Permanen
  console.log('Menanamkan akun Admin Sistem...');
  const hashedAdminPassword = await bcrypt.hash('adminrsia123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@rsia.com' },
    update: {}, 
    create: {
      namaLengkap: 'Admin Sistem E-Ticketing',
      email: 'admin@rsia.com',
      password: hashedAdminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`Berhasil! Akun Admin dibuat: ${adminUser.email}`);

  console.log('✅ Proses Seeding Selesai (Sesuai UAT)!');
}

main()
  .catch((e) => {
    console.error('Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });