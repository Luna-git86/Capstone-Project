// Backend/clean_users.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Membersihkan akun ganda dan menyetel masing-masing role di Divisi Pelayanan Medis...');

  // 1. Dapatkan Divisi Pelayanan Medis
  let divisiMedis = await prisma.divisi.findFirst({
    where: {
      OR: [
        { nama: 'Divisi Pelayanan Medis & Keperawatan' },
        { nama: 'Pelayanan Medis' },
      ],
    },
  });

  if (!divisiMedis) {
    divisiMedis = await prisma.divisi.create({
      data: { nama: 'Divisi Pelayanan Medis & Keperawatan' },
    });
  }

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 5 Akun Resmi: 1 Akun per Role di Divisi Pelayanan Medis
  const validUsers = [
    {
      nama: 'Administrator Sistem',
      noHp: '082260737808',
      email: 'admin@rsia.com',
      password: defaultPassword,
      role: 'ADMIN',
      divisiId: divisiMedis.id,
      telegramChatId: null,
    },
    {
      nama: 'dr. H. Direktur Utama, M.Kes',
      noHp: '080000000004',
      email: 'direktur@rsia.com',
      password: defaultPassword,
      role: 'DIREKTUR',
      divisiId: divisiMedis.id,
      telegramChatId: null,
    },
    {
      nama: 'dr. Christ Naufal, Sp.A (Kepala Divisi Medis)',
      noHp: '080000000003',
      email: 'kadiv.medis@rsia.com',
      password: defaultPassword,
      role: 'KADIV',
      divisiId: divisiMedis.id,
      telegramChatId: '9197345291', // terhubung telegram
    },
    {
      nama: 'M. Rifan Hakim (Koordinator Pelayanan Medis)',
      noHp: '080000000008',
      email: 'koor.medis@rsia.com',
      password: defaultPassword,
      role: 'KOORDINATOR',
      divisiId: divisiMedis.id,
      telegramChatId: null,
    },
    {
      nama: 'Wicak Naufal (Staf Pelaksana Medis)',
      noHp: '080000000001',
      email: 'staf.wicak@rsia.com',
      password: defaultPassword,
      role: 'STAF',
      divisiId: divisiMedis.id,
      telegramChatId: null,
    },
  ];

  const allowedPhones = validUsers.map((u) => u.noHp);

  // Hapus relasi terkait jika ada user yang bukan bagian dari allowedPhones
  const usersToDelete = await prisma.user.findMany({
    where: {
      noHp: { notIn: allowedPhones },
    },
    select: { id: true, nama: true, noHp: true, role: true },
  });

  console.log(`Ditemukan ${usersToDelete.length} akun ganda/tambahan yang akan dihapus:`);
  usersToDelete.forEach((u) => console.log(`- ${u.nama} (${u.noHp} - ${u.role})`));

  const deleteIds = usersToDelete.map((u) => u.id);

  if (deleteIds.length > 0) {
    await prisma.telegramLinkToken.deleteMany({ where: { userId: { in: deleteIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: deleteIds } } });
    await prisma.dokumenSop.deleteMany({ where: { pengajuId: { in: deleteIds } } });
    await prisma.notificationLog.deleteMany({ where: { recipientId: { in: deleteIds } } });
    await prisma.ticket.deleteMany({
      where: {
        OR: [
          { pembuatId: { in: deleteIds } },
          { pelaksanaId: { in: deleteIds } },
          { penanggungJawabId: { in: deleteIds } },
        ],
      },
    });

    const deleted = await prisma.user.deleteMany({
      where: { id: { in: deleteIds } },
    });
    console.log(`Berhasil menghapus ${deleted.count} akun ganda.`);
  }

  // Upsert 5 akun resmi
  for (const u of validUsers) {
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

  // Tampilkan daftar akun final
  const finalUsers = await prisma.user.findMany({
    include: { divisi: true },
    orderBy: { role: 'asc' },
  });

  console.log('\n================================================================');
  console.log('✅ DAFTAR AKUN FINAL (1 AKUN PER ROLE DI DIVISI PELAYANAN MEDIS):');
  console.log('================================================================');
  finalUsers.forEach((u) => {
    console.log(`[${u.role.padEnd(11)}] ${u.nama.padEnd(46)} | No HP: ${u.noHp} | Divisi: ${u.divisi?.nama}`);
  });
  console.log('================================================================');
  console.log('Password default semua akun: password123\n');
}

main()
  .catch((e) => {
    console.error('Gagal membersihkan user:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
