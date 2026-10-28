// Backend/seed.js
const prisma = require('./db');
const bcrypt = require('bcrypt');

async function main() {
  console.log('Memulai proses seeding data master RSIA Qurrata A\'yun...');

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

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 5 Akun Utama dengan Nomor HP Resmi untuk Pengujian UAT
  const akunUji = [
    {
      nama: 'Admin Sistem IT',
      noHp: '081100000001',
      email: 'admin@rsia.com',
      role: 'ADMIN',
      divisiId: divisiMap['Umum & IT'],
    },
    {
      nama: 'dr. Direktur RSIA',
      noHp: '081100000002',
      email: 'direktur@rsia.com',
      role: 'DIREKTUR',
      divisiId: null,
    },
    {
      nama: 'Kepala Divisi Umum & IT',
      noHp: '081100000003',
      email: 'kadiv.it@rsia.com',
      role: 'KADIV',
      divisiId: divisiMap['Umum & IT'],
    },
    {
      nama: 'Koordinator Unit Penunjang',
      noHp: '081100000004',
      email: 'koor.penunjang@rsia.com',
      role: 'KOORDINATOR',
      divisiId: divisiMap['Penunjang Medis'],
    },
    {
      nama: 'Staf Teknisi IT',
      noHp: '081100000005',
      email: 'staf.it@rsia.com',
      role: 'STAF',
      divisiId: divisiMap['Umum & IT'],
    },
  ];

  for (const akun of akunUji) {
    await prisma.user.upsert({
      where: { noHp: akun.noHp },
      update: {
        nama: akun.nama,
        email: akun.email,
        role: akun.role,
        divisiId: akun.divisiId,
      },
      create: {
        nama: akun.nama,
        noHp: akun.noHp,
        email: akun.email,
        password: hashedPassword,
        role: akun.role,
        divisiId: akun.divisiId,
      },
    });
  }

  console.log('Seeding selesai! Gunakan No HP (081100000001 s/d 081100000005) dan password "password123".');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });