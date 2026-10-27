// Backend/seed.js
const prisma = require('./db');
const bcrypt = require('bcrypt');

async function main() {
  console.log('Memulai proses seeding data master RSIA Qurrata A\'yun...');

  // 1. Seed Data Divisi Sesuai Struktur Organisasi RSIA
  const daftarDivisi = [
    'Pelayanan Medis',
    'Penunjang Medis',
    'Keperawatan & Kebidanan',
    'Umum & IT',
    'Administrasi & Keuangan',
    'HRD & Marketing',
  ];

  const divisiMap = {};
  for (const nama of daftarDivisi) {
    const div = await prisma.divisi.upsert({
      where: { nama },
      update: {},
      create: { nama },
    });
    divisiMap[nama] = div.id;
  }

  // Password seragam untuk pengujian UAT: password123
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 2. Seed 5 Akun Utama Sesuai 5 Entitas Role UAT
  const akunUji = [
    {
      nama: 'Admin Sistem IT',
      email: 'admin@rsia.com',
      role: 'ADMIN',
      divisiId: divisiMap['Umum & IT'],
    },
    {
      nama: 'dr. Direktur RSIA',
      email: 'direktur@rsia.com',
      role: 'DIREKTUR',
      divisiId: null,
    },
    {
      nama: 'Kepala Divisi Umum & IT',
      email: 'kadiv.it@rsia.com',
      role: 'KADIV',
      divisiId: divisiMap['Umum & IT'],
    },
    {
      nama: 'Koordinator Unit Penunjang',
      email: 'koor.penunjang@rsia.com',
      role: 'KOORDINATOR',
      divisiId: divisiMap['Penunjang Medis'],
    },
    {
      nama: 'Staf Teknisi IT',
      email: 'staf.it@rsia.com',
      role: 'STAF',
      divisiId: divisiMap['Umum & IT'],
    },
  ];

  for (const akun of akunUji) {
    await prisma.user.upsert({
      where: { email: akun.email },
      update: {
        nama: akun.nama,
        role: akun.role,
        divisiId: akun.divisiId,
      },
      create: {
        nama: akun.nama,
        email: akun.email,
        password: hashedPassword,
        role: akun.role,
        divisiId: akun.divisiId,
      },
    });
  }

  console.log('Seeding selesai! Gunakan password "password123" untuk semua akun uji.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });