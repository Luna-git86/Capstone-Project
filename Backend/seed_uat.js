// Backend/seed_uat.js
// Script Seeding Database Khusus UAT RSIA Qurrata A'yun Samarinda
// 100% Presisi Menyesuaikan Seluruh Alur & Judul Dokumen UAT Terbaru

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const SVG_IMAGE_PREVIEW =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><rect width="400" height="260" fill="%230f5c43" rx="16"/><circle cx="200" cy="110" r="45" fill="%23ffffff" fill-opacity="0.2"/><path d="M185 110l12 12 25-25" stroke="%23ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><text x="50%" y="185" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-weight="bold" font-size="16">FOTO BUKTI RSIA QURRATA A YUN</text><text x="50%" y="210" dominant-baseline="middle" text-anchor="middle" fill="%23d1fae5" font-family="sans-serif" font-size="12">Dokumentasi Terverifikasi Sistem</text></svg>';

async function main() {
  console.log('================================================================');
  console.log('🚀 RESET & SEEDING DATABASE UAT RSIA QURRATA A\'YUN SAMARINDA');
  console.log('================================================================');

  // 1. Data Divisi Standar Rumah Sakit (Sesuai Branch Main)
  const divisiData = [
    { id: 1, nama: 'Divisi Pelayanan Medis & Keperawatan' },
    { id: 2, nama: 'Divisi Penunjang Medis' },
    { id: 3, nama: 'Divisi Sarana & Prasarana (IPS-RS)' },
    { id: 4, nama: 'Divisi IT & SIMRS' },
    { id: 5, nama: 'Divisi Administrasi & Keuangan' },
    { id: 6, nama: 'Divisi Umum & Rumah Tangga' },
  ];

  for (const d of divisiData) {
    await prisma.divisi.upsert({
      where: { id: d.id },
      update: { nama: d.nama },
      create: { id: d.id, nama: d.nama },
    });
  }
  console.log('✅ 1. Master Divisi terverifikasi (6 Divisi)');

  // 2. Data Pengguna (User) UAT: Tepat 1 Akun per Role di Divisi Pelayanan Medis
  const defaultPassword = await bcrypt.hash('password123', 10);

  const usersData = [
    {
      id: 1,
      nama: 'Administrator Sistem',
      noHp: '082260737808',
      email: 'admin@rsia.com',
      password: defaultPassword,
      role: 'ADMIN',
      divisiId: 1, // Pelayanan Medis
      telegramChatId: null, // Awalnya BELUM TERHUBUNG (untuk UAT-5.1 & UAT-5.4)
    },
    {
      id: 5,
      nama: 'dr. H. Direktur Utama, M.Kes',
      noHp: '080000000004',
      email: 'direktur@rsia.com',
      password: defaultPassword,
      role: 'DIREKTUR',
      divisiId: 1, // Pelayanan Medis
      telegramChatId: null, // BELUM TERHUBUNG (untuk UAT-3.1)
    },
    {
      id: 4,
      nama: 'dr. Christ Naufal, Sp.A (Kepala Divisi Medis)',
      noHp: '080000000003',
      email: 'kadiv.medis@rsia.com',
      password: defaultPassword,
      role: 'KADIV',
      divisiId: 1, // Pelayanan Medis
      telegramChatId: '9197345291', // TERHUBUNG (untuk perbandingan di UAT-5.4)
    },
    {
      id: 9,
      nama: 'M. Rifan Hakim (Koordinator Pelayanan Medis)',
      noHp: '080000000008',
      email: 'koor.medis@rsia.com',
      password: defaultPassword,
      role: 'KOORDINATOR',
      divisiId: 1, // Pelayanan Medis
      telegramChatId: null, // BELUM TERHUBUNG (untuk UAT-1.1)
    },
    {
      id: 2,
      nama: 'Wicak Naufal (Staf Pelaksana Medis)',
      noHp: '080000000001',
      email: 'staf.wicak@rsia.com',
      password: defaultPassword,
      role: 'STAF',
      divisiId: 1, // Pelayanan Medis
      telegramChatId: null, // BELUM TERHUBUNG (untuk UAT-2.1)
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {
        nama: u.nama,
        noHp: u.noHp,
        email: u.email,
        password: u.password,
        role: u.role,
        divisiId: u.divisiId,
        telegramChatId: u.telegramChatId,
      },
      create: u,
    });
  }
  console.log('✅ 2. Master Akun Pegawai (5 Role di Pelayanan Medis, Password: password123)');

  // 3. Bersihkan Seluruh Riwayat Tiket dan Log Notifikasi Lama
  await prisma.notificationLog.deleteMany({});
  await prisma.ticket.deleteMany({});
  console.log('🧹 3. Riwayat tiket penugasan, pelaporan masalah, dan log notifikasi lama dibersihkan');

  const now = new Date();
  const besok = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const lusa = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const kemarin = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const duaHariLalu = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // 4. Seeding Data Tiket yang Persis 100% dengan Langkah Pengujian UAT
  // -----------------------------------------------------------------
  
  // [MODUL 1 - UAT-1.3]: Koordinator Mengevaluasi 2 Tugas Menunggu Validasi
  // Tugas 1: "Pemeriksaan Tabung Oksigen Cadangan Kamar Operasi"
  // (Diuji oleh Koordinator: klik [Minta Revisi Ulang] dengan catatan "Tolong dilengkapi lagi")
  // (Setelah itu tugas ini otomatis berubah menjadi status "Sedang Dikerjakan" dengan catatan revisi untuk diuji oleh Staf pada UAT-2.4!)
  const t1 = await prisma.ticket.create({
    data: {
      judul: 'Pemeriksaan Tabung Oksigen Cadangan Kamar Operasi',
      lokasi: 'Gedung Bedah Sentral Lt. 2',
      deskripsi: 'Cek tekanan regulator tabung oksigen nomor 4 dan 5 pada sentral gas medis cadangan.',
      prioritas: 'HIGH',
      status: 'MENUNGGU_VALIDASI',
      jenisTiket: 'TUGAS',
      divisiId: 1, // Pelayanan Medis
      pembuatId: 9, // Koordinator Medis
      pelaksanaId: 2, // Staf Wicak
      deadline: besok,
      laporanPenyelesaian: 'Pengecekan tabung oksigen nomor 4 dan 5 sudah dilaksanakan. Tekanan regulator stabil 4 bar.',
      fotoBukti: SVG_IMAGE_PREVIEW,
      createdAt: kemarin,
    },
  });

  // Tugas 2: "Sterilisasi Set Bedah Minor Kamar Bersalin"
  // (Diuji oleh Koordinator: klik [Setujui (Tugas Selesai)] -> status berubah menjadi Selesai Tuntas)
  const t2 = await prisma.ticket.create({
    data: {
      judul: 'Sterilisasi Set Bedah Minor Kamar Bersalin',
      lokasi: 'Ruang Bersalin (VK) Lt. 1',
      deskripsi: 'Sterilkan 3 paket instrumen partus set dan klem hemostatik menggunakan autoklaf suhu 121 derajat.',
      prioritas: 'MEDIUM',
      status: 'MENUNGGU_VALIDASI',
      jenisTiket: 'TUGAS',
      divisiId: 1, // Pelayanan Medis
      pembuatId: 9, // Koordinator Medis
      pelaksanaId: 2, // Staf Wicak
      deadline: besok,
      laporanPenyelesaian: 'Set bedah minor 3 paket sudah selesai disterilisasi autoklaf dan telah dibungkus rapi steril siap pakai.',
      fotoBukti: SVG_IMAGE_PREVIEW,
      createdAt: kemarin,
    },
  });

  // [MODUL 1 - UAT-1.4]: Koordinator Tindak Lanjut 2 Laporan Masalah di Menu Laporan (Menunggu Triase)
  // Laporan 1: "Lampu Tindakan Ruang Bersalin 1 Berkedip Redup" (diuji klik [Tugaskan Staf])
  const t3 = await prisma.ticket.create({
    data: {
      judul: 'Lampu Tindakan Ruang Bersalin 1 Berkedip Redup',
      lokasi: 'Gedung Kebidanan Lt. 1 Ruang Bersalin 1',
      deskripsi: 'Lampu sorot tindakan persalinan berkedip dan intensitas cahaya redup, butuh penanganan segera dari tim teknis.',
      prioritas: 'HIGH',
      status: 'MENUNGGU_TRIASE',
      jenisTiket: 'LAPORAN',
      divisiId: 1, // Pelayanan Medis
      pembuatId: 2, // Staf Wicak
      fotoInstruksi: SVG_IMAGE_PREVIEW,
      createdAt: now,
    },
  });

  // Laporan 2: "Permintaan Tambahan Bantal Pasien Poli Anak" (diuji klik [Tolak & Kembalikan] alasan "Foto kurang jelas")
  const t4 = await prisma.ticket.create({
    data: {
      judul: 'Permintaan Tambahan Bantal Pasien Poli Anak',
      lokasi: 'Poli Rawat Jalan Anak Lt. 2',
      deskripsi: 'Bantal di meja periksa anak robek dan kurang 2 buah, mohon penambahan bantal baru dari gudang logistik.',
      prioritas: 'LOW',
      status: 'MENUNGGU_TRIASE',
      jenisTiket: 'LAPORAN',
      divisiId: 1, // Pelayanan Medis
      pembuatId: 2, // Staf Wicak
      fotoInstruksi: SVG_IMAGE_PREVIEW,
      createdAt: now,
    },
  });

  // [MODUL 2 - UAT-2.3]: Staf Pelaksana Lapor Tugas Selesai (Tugas Aktif Baru Belum Lapor)
  // (Diuji oleh Staf: buka tugas ini, upload bukti_cek_stok_vk.jpg, ketik laporan "Tugas sudah selesai dikerjakan", klik Kirim Bukti)
  const t5 = await prisma.ticket.create({
    data: {
      judul: 'Pengecekan Rutin Stok Kassa & Obat Emergensi Ruang VK',
      lokasi: 'Ruang Bersalin (VK) Lt. 1',
      deskripsi: 'Lakukan inventarisasi kassa steril, betadine, serta kelengkapan obat oksitosin di kotak emergensi partus.',
      prioritas: 'MEDIUM',
      status: 'DIPROSES',
      jenisTiket: 'TUGAS',
      divisiId: 1, // Pelayanan Medis
      pembuatId: 9, // Koordinator Medis
      pelaksanaId: 2, // Staf Wicak
      deadline: lusa,
      createdAt: now,
    },
  });

  // Data Historis Tiket Selesai (Untuk Grafik & Rekap Laporan Kinerja UAT-1.6, 1.7, 3.2, 3.3, 4.2, 4.3)
  // Divisi 1: Pelayanan Medis (Terkunci untuk Koordinator & Kadiv)
  await prisma.ticket.create({
    data: {
      judul: 'Penggantian Filter Hepa Ruang Isolasi Infeksi',
      lokasi: 'Ruang Isolasi Flamboyan Lt. 3',
      deskripsi: 'Ganti filter Hepa unit nomor 2 sesuai jadwal pemeliharaan berkala.',
      prioritas: 'HIGH',
      status: 'SELESAI',
      jenisTiket: 'TUGAS',
      divisiId: 1,
      pembuatId: 9,
      pelaksanaId: 2,
      deadline: kemarin,
      completedAt: duaHariLalu, // Selesai Tepat Waktu
      laporanPenyelesaian: 'Filter hepa baru telah terpasang dan segel rapi.',
      fotoBukti: SVG_IMAGE_PREVIEW,
      createdAt: duaHariLalu,
    },
  });

  await prisma.ticket.create({
    data: {
      judul: 'Pembersihan Suction Pump Ruang Tindakan Bedah',
      lokasi: 'Kamar Bedah 1',
      deskripsi: 'Kuras botol suction dan lakukan desinfeksi pipa hisap.',
      prioritas: 'MEDIUM',
      status: 'SELESAI',
      jenisTiket: 'TUGAS',
      divisiId: 1,
      pembuatId: 9,
      pelaksanaId: 2,
      deadline: duaHariLalu,
      completedAt: kemarin, // Selesai Terlambat
      laporanPenyelesaian: 'Suction pump sudah dikuras dan selang hisap diganti baru.',
      fotoBukti: SVG_IMAGE_PREVIEW,
      createdAt: duaHariLalu,
    },
  });

  // Divisi 3: Keperawatan & Kebidanan (untuk Pengujian Laporan Kinerja Lintas Divisi oleh Direktur pada UAT-3.2)
  await prisma.ticket.create({
    data: {
      judul: 'Pemeriksaan Kalibrasi Timbangan Bayi Ruang Perinatologi',
      lokasi: 'Ruang Bayi / Perinatologi Lt. 2',
      deskripsi: 'Uji akurasi timbangan bayi digital dengan anak timbang standar 2 kg.',
      prioritas: 'HIGH',
      status: 'SELESAI',
      jenisTiket: 'TUGAS',
      divisiId: 3, // Keperawatan & Kebidanan
      pembuatId: 5, // Direktur
      pelaksanaId: 2,
      deadline: kemarin,
      completedAt: duaHariLalu, // Tepat Waktu
      laporanPenyelesaian: 'Timbangan bayi telah dikalibrasi dan akurat 0 gram toleransi.',
      fotoBukti: SVG_IMAGE_PREVIEW,
      createdAt: duaHariLalu,
    },
  });

  // Divisi 4: Umum & IT (untuk Pengujian Laporan Kinerja Lintas Divisi oleh Direktur pada UAT-3.2)
  await prisma.ticket.create({
    data: {
      judul: 'Perbaikan Kabel Jaringan LAN Kasir IGD',
      lokasi: 'Kasir IGD Lt. 1',
      deskripsi: 'Kabel UTP RJ-45 kendor sehingga komputer kasir terputus dari SIMRS.',
      prioritas: 'HIGH',
      status: 'SELESAI',
      jenisTiket: 'TUGAS',
      divisiId: 4, // Umum & IT
      pembuatId: 5, // Direktur
      pelaksanaId: 2,
      deadline: kemarin,
      completedAt: duaHariLalu, // Tepat Waktu
      laporanPenyelesaian: 'Konektor RJ-45 sudah di-crimping ulang dan koneksi stabil 1 Gbps.',
      fotoBukti: SVG_IMAGE_PREVIEW,
      createdAt: duaHariLalu,
    },
  });

  console.log('✅ 4. Tiket Tugas dan Laporan Masalah UAT siap 100%');

  // 5. Data Log Notifikasi (Untuk Pengujian UAT-5.3 Admin)
  const logEntries = [
    {
      ticketId: t1.id,
      recipientId: 2,
      type: 'TASK_ASSIGNED',
      status: 'SENT',
      message: '[TUGAS BARU] Anda ditugaskan: Pemeriksaan Tabung Oksigen Cadangan Kamar Operasi.',
      telegramChatId: '9197345291',
      sentAt: kemarin,
      createdAt: kemarin,
    },
    {
      ticketId: t1.id,
      recipientId: 9,
      type: 'TASK_SUBMITTED',
      status: 'SENT',
      message: '[LAPORAN SELESAI] Staf Wicak Naufal telah mengajukan penyelesaian: Pemeriksaan Tabung Oksigen.',
      telegramChatId: '9197345294',
      sentAt: now,
      createdAt: now,
    },
    {
      ticketId: t2.id,
      recipientId: 2,
      type: 'DEADLINE_SOON',
      status: 'SENT',
      message: '[PENGINGAT SLA] Tugas Sterilisasi Set Bedah Minor mendekati batas waktu pengerjaan.',
      telegramChatId: '9197345291',
      sentAt: now,
      createdAt: now,
    },
    {
      ticketId: t3.id,
      recipientId: 9,
      type: 'REPORT_SUBMITTED',
      status: 'SENT',
      message: '[LAPORAN MASALAH] Laporan baru: Lampu Tindakan Ruang Bersalin 1 Berkedip Redup (Prioritas: HIGH).',
      telegramChatId: '9197345294',
      sentAt: now,
      createdAt: now,
    },
    {
      ticketId: t1.id,
      recipientId: 2,
      type: 'TASK_VERIFIED',
      status: 'SENT',
      message: '[TUGAS SELESAI] Tugas Sterilisasi Set Bedah Minor telah disetujui tuntas oleh Koordinator.',
      telegramChatId: '9197345291',
      sentAt: now,
      createdAt: now,
    },
    {
      ticketId: t5.id,
      recipientId: 2,
      type: 'TASK_ASSIGNED',
      status: 'FAILED',
      message: '[TUGAS BARU] Gagal mengirim pesan ke Staf. Sambungan Telegram terputus.',
      telegramChatId: null,
      errorMessage: 'Chat not found: Telegram chat ID is empty or user blocked the bot',
      createdAt: kemarin,
    },
    {
      ticketId: t4.id,
      recipientId: 1,
      type: 'SYSTEM_ALERT',
      status: 'FAILED',
      message: '[GAGAL KIRIM] Terjadi timeout koneksi jaringan saat menghubungkan ke server Telegram.',
      telegramChatId: '9197345299',
      errorMessage: 'ETIMEDOUT: Connection to api.telegram.org timed out after 10000ms',
      createdAt: duaHariLalu,
    },
    {
      ticketId: t5.id,
      recipientId: 2,
      type: 'OVERDUE',
      status: 'PENDING',
      message: '[TERLAMBAT] Tugas Pengecekan Rutin Stok Kassa telah melewati batas waktu SLA.',
      telegramChatId: '9197345291',
      createdAt: now,
    },
  ];

  for (const log of logEntries) {
    await prisma.notificationLog.create({
      data: log,
    });
  }
  console.log('✅ 5. Riwayat Log Notifikasi (Terkirim, Gagal, Dalam Antrean) siap diuji di UAT-5.3');

  console.log('================================================================');
  console.log('🎉 DATABASE BERHASIL DISIAPKAN & DI-RESET 100% SESUAI UAT TERBARU!');
  console.log('================================================================');
  console.log('DAFTAR AKUN PENGUJIAN MANUAL (PELAYANAN MEDIS):');
  console.log('1. KOORDINATOR  : 080000000008 | Password: password123 (M. Rifan Hakim)');
  console.log('2. STAF         : 080000000001 | Password: password123 (Wicak Naufal)');
  console.log('3. DIREKTUR     : 080000000004 | Password: password123 (dr. H. Direktur Utama)');
  console.log('4. KEPALA DIVISI: 080000000003 | Password: password123 (dr. Christ Naufal)');
  console.log('5. ADMIN SISTEM : 082260737808 | Password: password123 (Administrator Sistem)');
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Gagal seeding UAT:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
