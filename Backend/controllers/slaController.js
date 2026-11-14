// Backend/controllers/slaController.js
const prisma = require('../db');

function formatDurasi(menit) {
  if (menit == null || Number.isNaN(menit) || menit <= 0) return '-';
  const hari = Math.floor(menit / 1440);
  const sisaMenit = menit % 1440;
  const jam = Math.floor(sisaMenit / 60);
  const m = Math.round(sisaMenit % 60);
  const parts = [];
  if (hari > 0) parts.push(`${hari} hari`);
  if (jam > 0) parts.push(`${jam} jam`);
  if (m > 0 || parts.length === 0) parts.push(`${m} menit`);
  return parts.join(' ');
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Fungsi inti untuk mengambil dan mengkalkulasi data SLA sesuai ketentuan UAT
async function getSlaReportData(req) {
  const user = req.user;
  const role = user?.role;
  const userDivisiId = user?.divisiId ? Number(user.divisiId) : null;

  // 1. Validasi Hak Akses (Modul 4)
  if (role === 'STAF') {
    const error = new Error('Staf tidak memiliki hak akses untuk melihat laporan SLA.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Filter Divisi & Isolasi Data
  let targetDivisiId = null;
  if (role === 'KADIV' || role === 'KOORDINATOR') {
    // Kadiv & Koordinator terkunci secara mutlak pada divisinya sendiri
    targetDivisiId = userDivisiId;
  } else if (['DIREKTUR', 'ADMIN'].includes(role)) {
    // Direktur & Admin dapat memfilter divisi apa saja atau melihat semua divisi
    if (req.query.divisiId && req.query.divisiId !== 'SEMUA') {
      const parsedId = Number(req.query.divisiId);
      if (Number.isInteger(parsedId) && parsedId > 0) {
        targetDivisiId = parsedId;
      }
    }
  }

  // 3. Filter Rentang Waktu (startDate & endDate ATAU periode preset hari)
  const where = {
    status: 'SELESAI', // Sesuai UAT B.6: Hanya tugas dengan status final (Verified/Closed) yang masuk laporan SLA final
  };

  if (targetDivisiId) {
    where.divisiId = targetDivisiId;
  }

  const { startDate, endDate, periode, prioritas } = req.query;

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  } else if (periode && periode !== 'SEMUA' && periode !== 'ALL') {
    const days = Number(periode);
    if ([30, 90, 180, 365].includes(days)) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.createdAt = { gte: since };
    }
  }

  // 4. Filter Prioritas
  if (prioritas && ['LOW', 'MEDIUM', 'HIGH'].includes(String(prioritas).toUpperCase())) {
    where.prioritas = prioritas.toUpperCase();
  }

  // 5. Query database tiket
  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      divisi: { select: { id: true, nama: true } },
      pelaksana: { select: { id: true, nama: true, noHp: true, role: true } },
      penanggungJawab: { select: { id: true, nama: true, role: true } },
      pembuat: { select: { id: true, nama: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const ticketIds = tickets.map((t) => t.id);

  // 6. Ambil timestamp pengumpulan pertama yang valid dari Staf melalui AuditLog (Ketentuan UAT B.1 & B.2)
  const submissionLogs = ticketIds.length > 0
    ? await prisma.auditLog.findMany({
        where: {
          entityType: 'Ticket',
          action: 'SUBMIT_COMPLETION_REPORT',
          entityId: { in: ticketIds },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          entityId: true,
          createdAt: true,
        },
      })
    : [];

  const firstSubmissionMap = new Map();
  for (const log of submissionLogs) {
    if (!firstSubmissionMap.has(log.entityId)) {
      firstSubmissionMap.set(log.entityId, log.createdAt);
    }
  }

  // 7. Klasifikasi dan Kalkulasi SLA Per Tiket
  const items = [];
  for (const t of tickets) {
    // Abaikan jika tidak memiliki deadline (tidak terukur SLA)
    if (!t.deadline) continue;

    const submissionDate = firstSubmissionMap.get(t.id) || t.completedAt || t.updatedAt;
    const isHistoricalFallback = !firstSubmissionMap.has(t.id);

    const deadlineMs = new Date(t.deadline).getTime();
    const submissionMs = new Date(submissionDate).getTime();
    const isTepatWaktu = submissionMs <= deadlineMs;
    const statusSLA = isTepatWaktu ? 'SESUAI_SLA' : 'TERLAMBAT';

    const selisihKeterlambatanMs = isTepatWaktu ? 0 : Math.max(0, submissionMs - deadlineMs);
    const selisihMenit = Math.round(selisihKeterlambatanMs / 60000);

    const durasiPengerjaanMs = Math.max(0, submissionMs - new Date(t.createdAt).getTime());
    const durasiJam = Number((durasiPengerjaanMs / 3600000).toFixed(1));

    items.push({
      id: t.id,
      judul: t.judul,
      lokasi: t.lokasi || '-',
      prioritas: t.prioritas,
      status: t.status,
      divisiId: t.divisiId,
      divisi: t.divisi?.nama || '-',
      pelaksana: t.pelaksana?.nama || 'Belum ditugaskan',
      penanggungJawab: t.penanggungJawab?.nama || '-',
      pembuat: t.pembuat?.nama || '-',
      deadline: t.deadline,
      deadlineFormatted: formatDateIndo(t.deadline),
      waktuPengumpulan: submissionDate,
      waktuPengumpulanFormatted: formatDateIndo(submissionDate),
      completedAt: t.completedAt,
      completedAtFormatted: formatDateIndo(t.completedAt),
      createdAt: t.createdAt,
      statusSLA,
      selisihKeterlambatanMenit: selisihMenit,
      selisihKeterlambatanFormatted: formatDurasi(selisihMenit),
      durasiJam,
      isHistoricalFallback,
    });
  }

  // Filter Kategori Ketepatan Waktu jika diminta via query ?statusSla=
  let filteredItems = items;
  if (req.query.statusSla && ['SESUAI_SLA', 'TERLAMBAT'].includes(req.query.statusSla.toUpperCase())) {
    filteredItems = items.filter((item) => item.statusSLA === req.query.statusSla.toUpperCase());
  }

  // 8. Hitung Agregat Ringkasan (Ketentuan UAT C)
  const totalTiket = items.length;
  const sesuaiSLA = items.filter((t) => t.statusSLA === 'SESUAI_SLA').length;
  const terlambat = items.filter((t) => t.statusSLA === 'TERLAMBAT').length;
  const persentaseSLA = totalTiket > 0 ? Number(((sesuaiSLA / totalTiket) * 100).toFixed(1)) : 0;

  const totalDurasi = items.reduce((acc, t) => acc + (t.durasiJam || 0), 0);
  const rataRataDurasiJam = totalTiket > 0 ? Number((totalDurasi / totalTiket).toFixed(1)) : 0;

  // Metadata Laporan
  let divisiText = 'Seluruh Divisi';
  if (targetDivisiId) {
    const d = await prisma.divisi.findUnique({ where: { id: targetDivisiId }, select: { nama: true } });
    if (d) divisiText = d.nama;
  }

  let periodeText = '30 Hari Terakhir';
  if (startDate && endDate) {
    periodeText = `${formatDateIndo(startDate).split(',')[0]} s/d ${formatDateIndo(endDate).split(',')[0]}`;
  } else if (periode === 'ALL' || periode === 'SEMUA') {
    periodeText = 'Semua Periode';
  } else if (periode) {
    periodeText = `${periode} Hari Terakhir`;
  }

  return {
    metadata: {
      periodeText,
      divisiText,
      targetDivisiId,
      tanggalCetak: formatDateIndo(new Date()),
      roleAkses: role,
    },
    ringkasan: {
      totalTiket,
      totalSelesai: totalTiket,
      sesuaiSLA,
      terlambat,
      persentaseSLA,
      rataRataDurasiJam,
    },
    data: filteredItems,
  };
}

// Controller HTTP untuk endpoint GET /api/laporan-sla
const getLaporanSLA = async (req, res) => {
  try {
    const report = await getSlaReportData(req);

    // Ambil daftar divisi untuk pilihan filter bagi Direktur/Admin
    let daftarDivisi = [];
    if (['DIREKTUR', 'ADMIN'].includes(req.user?.role)) {
      daftarDivisi = await prisma.divisi.findMany({
        orderBy: { nama: 'asc' },
        select: { id: true, nama: true },
      });
    }

    return res.status(200).json({
      metadata: report.metadata,
      ringkasan: report.ringkasan,
      summary: report.ringkasan,
      data: report.data,
      daftarDivisi,
    });
  } catch (error) {
    console.error('Error getLaporanSLA:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      message: error.message || 'Gagal memuat laporan SLA.',
    });
  }
};

module.exports = {
  getLaporanSLA,
  getSlaReportData,
  formatDurasi,
  formatDateIndo,
};
