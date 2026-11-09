// Backend/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log("Memulai proses seeding data master RSIA Qurrata A'yun...");

  const daftarDivisi = [
    'Divisi Umum & Rumah Tangga',
    'Divisi IT & SIMRS',
    'Divisi Sarana & Prasarana (IPS-RS)',
    'Divisi Pelayanan Medis & Keperawatan',
    'Divisi Penunjang Medis',
    'Divisi Administrasi & Keuangan',
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

  const defaultPassword = await bcrypt.hash('password123', 10);

  const defaultUsers = [
    {
      nama: 'Admin Sistem IT',
      noHp: '081100000001',
      email: 'admin@rsia.com',
      password: defaultPassword,
      role: 'ADMIN',
      divisiId: divisiMap['Divisi IT & SIMRS'],
    },
    {
      nama: 'dr. Direktur RSIA',
      noHp: '081100000002',
      email: 'direktur@rsia.com',
      password: defaultPassword,
      role: 'DIREKTUR',
      divisiId: null,
    },
    {
      nama: 'Kepala Divisi Umum & IT',
      noHp: '081100000003',
      email: 'kadiv@rsia.com',
      password: defaultPassword,
      role: 'KADIV',
      divisiId: divisiMap['Divisi IT & SIMRS'],
    },
    {
      nama: 'Koordinator Lapangan IT',
      noHp: '081100000004',
      email: 'koordinator@rsia.com',
      password: defaultPassword,
      role: 'KOORDINATOR',
      divisiId: divisiMap['Divisi IT & SIMRS'],
    },
    {
      nama: 'Staf Teknis Pelaksana',
      noHp: '081100000005',
      email: 'staf@rsia.com',
      password: defaultPassword,
      role: 'STAF',
      divisiId: divisiMap['Divisi IT & SIMRS'],
    },
  ];

  for (const u of defaultUsers) {
    await prisma.user.upsert({
      where: { noHp: u.noHp },
      update: {
        nama: u.nama,
        email: u.email,
        password: u.password,
        role: u.role,
        divisiId: u.divisiId,
      },
      create: u,
    });
  }

  console.log('✅ Seeding selesai! Seluruh Divisi dan 5 Akun Jabatan siap digunakan.');
  console.log('   Password default semua akun: password123');
}

main()
  .catch((e) => {
    console.error('❌ Gagal melakukan seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });