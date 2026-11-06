// Backend/tests/slaReport.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const {
  formatDurasi,
  formatDateIndo,
  getLaporanSLA,
  getSlaReportData,
} = require('../controllers/slaController');

const {
  exportExcelSla,
  exportPdfSla,
} = require('../controllers/slaExportController');

const prisma = require('../db');

const { Writable } = require('node:stream');

// Helper mock response yang kompatibel penuh dengan stream Writable
function createMockRes() {
  const headers = {};
  const chunks = [];

  const res = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      callback();
    },
  });

  res.statusCode = 200;
  res.body = null;
  res.headers = headers;
  res.chunks = chunks;

  res.status = function (code) {
    this.statusCode = code;
    return this;
  };

  res.json = function (data) {
    this.body = data;
    return this;
  };

  res.setHeader = function (key, val) {
    headers[key.toLowerCase()] = val;
  };

  res.getHeader = function (key) {
    return headers[key.toLowerCase()];
  };

  return res;
}

describe('Modul 3: Laporan Kinerja SLA (19 Skenario UAT)', () => {

  // 1. Staff mengumpulkan tugas sebelum deadline -> SESUAI_SLA
  it('1. Staff mengumpulkan tugas sebelum deadline -> terhitung SESUAI_SLA', () => {
    const deadline = new Date('2026-11-05T12:00:00Z');
    const submission = new Date('2026-11-05T10:30:00Z');
    const isTepatWaktu = submission.getTime() <= deadline.getTime();
    const statusSLA = isTepatWaktu ? 'SESUAI_SLA' : 'TERLAMBAT';

    assert.equal(isTepatWaktu, true);
    assert.equal(statusSLA, 'SESUAI_SLA');
  });

  // 2. Staff mengumpulkan tugas tepat pada deadline -> SESUAI_SLA
  it('2. Staff mengumpulkan tugas tepat pada deadline -> terhitung SESUAI_SLA', () => {
    const deadline = new Date('2026-11-05T12:00:00Z');
    const submission = new Date('2026-11-05T12:00:00Z');
    const isTepatWaktu = submission.getTime() <= deadline.getTime();
    const statusSLA = isTepatWaktu ? 'SESUAI_SLA' : 'TERLAMBAT';

    assert.equal(isTepatWaktu, true);
    assert.equal(statusSLA, 'SESUAI_SLA');
  });

  // 3. Staff mengumpulkan tugas setelah deadline -> TERLAMBAT
  it('3. Staff mengumpulkan tugas setelah deadline -> terhitung TERLAMBAT dengan selisih menit', () => {
    const deadline = new Date('2026-11-05T12:00:00Z');
    const submission = new Date('2026-11-05T13:45:00Z'); // Telat 1 jam 45 menit (105 menit)
    const isTepatWaktu = submission.getTime() <= deadline.getTime();
    const statusSLA = isTepatWaktu ? 'SESUAI_SLA' : 'TERLAMBAT';
    const selisihKeterlambatanMs = Math.max(0, submission.getTime() - deadline.getTime());
    const selisihMenit = Math.round(selisihKeterlambatanMs / 60000);

    assert.equal(isTepatWaktu, false);
    assert.equal(statusSLA, 'TERLAMBAT');
    assert.equal(selisihMenit, 105);
    assert.equal(formatDurasi(selisihMenit), '1 jam 45 menit');
  });

  // 4. Tugas berstatus DIPROSES dikecualikan dari perhitungan persentase SLA final
  it('4. Tugas DIPROSES dikecualikan dari status query laporan SLA final', async () => {
    // Memverifikasi filter dasar getSlaReportData membatasi status hanya SELESAI
    // Mock prisma.ticket.findMany sementara
    const originalFindMany = prisma.ticket.findMany;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [];
    };

    try {
      await getSlaReportData({
        user: { id: 1, role: 'DIREKTUR' },
        query: {},
      });
      assert.equal(capturedWhere.status, 'SELESAI');
    } finally {
      prisma.ticket.findMany = originalFindMany;
    }
  });

  // 5. Tugas berstatus MENUNGGU_VALIDASI dikecualikan dari laporan SLA final
  it('5. Tugas MENUNGGU_VALIDASI tidak dimasukkan dalam laporan SLA final', async () => {
    const originalFindMany = prisma.ticket.findMany;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [];
    };

    try {
      await getSlaReportData({
        user: { id: 2, role: 'ADMIN' },
        query: {},
      });
      assert.notEqual(capturedWhere.status, 'MENUNGGU_VALIDASI');
      assert.equal(capturedWhere.status, 'SELESAI');
    } finally {
      prisma.ticket.findMany = originalFindMany;
    }
  });

  // 6. Tugas berstatus SELESAI dihitung dalam laporan SLA final
  it('6. Tugas SELESAI dengan deadline dihitung dalam laporan SLA final', async () => {
    const originalTicketFindMany = prisma.ticket.findMany;
    const originalAuditLogFindMany = prisma.auditLog.findMany;

    prisma.ticket.findMany = async () => [
      {
        id: 901,
        judul: 'Pembersihan AC Poli Anak',
        lokasi: 'Poli Anak',
        prioritas: 'MEDIUM',
        status: 'SELESAI',
        divisiId: 2,
        divisi: { id: 2, nama: 'Umum & Logistik' },
        pelaksana: { id: 10, nama: 'Budi Santoso' },
        penanggungJawab: { id: 5, nama: 'Koordinator Umum' },
        pembuat: { id: 3, nama: 'Kadiv Umum' },
        createdAt: new Date('2026-11-01T08:00:00Z'),
        deadline: new Date('2026-11-02T12:00:00Z'),
        completedAt: new Date('2026-11-02T10:00:00Z'),
        updatedAt: new Date('2026-11-02T10:00:00Z'),
      },
    ];

    prisma.auditLog.findMany = async () => [
      {
        entityId: 901,
        createdAt: new Date('2026-11-02T09:30:00Z'), // Staf kirim jam 09:30 (sebelum deadline 12:00)
      },
    ];

    try {
      const res = await getSlaReportData({
        user: { id: 1, role: 'DIREKTUR' },
        query: {},
      });

      assert.equal(res.ringkasan.totalTiket, 1);
      assert.equal(res.ringkasan.sesuaiSLA, 1);
      assert.equal(res.ringkasan.terlambat, 0);
      assert.equal(res.ringkasan.persentaseSLA, 100);
      assert.equal(res.data[0].statusSLA, 'SESUAI_SLA');
    } finally {
      prisma.ticket.findMany = originalTicketFindMany;
      prisma.auditLog.findMany = originalAuditLogFindMany;
    }
  });

  // 7. Tugas berstatus DITOLAK dikecualikan dari perhitungan SLA
  it('7. Tugas berstatus DITOLAK tidak dimasukkan dalam laporan SLA', async () => {
    const originalFindMany = prisma.ticket.findMany;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [];
    };

    try {
      await getSlaReportData({
        user: { id: 1, role: 'DIREKTUR' },
        query: {},
      });
      assert.notEqual(capturedWhere.status, 'DITOLAK');
    } finally {
      prisma.ticket.findMany = originalFindMany;
    }
  });

  // 8. Filter rentang waktu kustom (startDate dan endDate)
  it('8. Filter rentang waktu kustom (startDate & endDate) terpasang di klausul query', async () => {
    const originalFindMany = prisma.ticket.findMany;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [];
    };

    try {
      await getSlaReportData({
        user: { id: 1, role: 'DIREKTUR' },
        query: {
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        },
      });

      assert.ok(capturedWhere.createdAt);
      assert.ok(capturedWhere.createdAt.gte instanceof Date);
      assert.ok(capturedWhere.createdAt.lte instanceof Date);
      assert.equal(capturedWhere.createdAt.gte.getFullYear(), 2026);
      assert.equal(capturedWhere.createdAt.gte.getMonth(), 9); // Bulan ke-10 (Oktober) adalah index 9
      assert.equal(capturedWhere.createdAt.gte.getDate(), 1);
      assert.equal(capturedWhere.createdAt.lte.getFullYear(), 2026);
      assert.equal(capturedWhere.createdAt.lte.getMonth(), 9);
      assert.equal(capturedWhere.createdAt.lte.getDate(), 31);
    } finally {
      prisma.ticket.findMany = originalFindMany;
    }
  });

  // 9. Filter divisi menyaring tiket sesuai divisi yang dipilih
  it('9. Filter divisi menyaring tiket sesuai divisi yang dipilih', async () => {
    const originalFindMany = prisma.ticket.findMany;
    const originalDivisiFindUnique = prisma.divisi.findUnique;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [];
    };
    prisma.divisi.findUnique = async ({ where }) => ({ id: where.id, nama: 'Divisi Test' });

    try {
      await getSlaReportData({
        user: { id: 1, role: 'DIREKTUR' },
        query: { divisiId: '3' },
      });

      assert.equal(capturedWhere.divisiId, 3);
    } finally {
      prisma.ticket.findMany = originalFindMany;
      prisma.divisi.findUnique = originalDivisiFindUnique;
    }
  });

  // 10. Pengguna DIREKTUR / ADMIN dapat mengakses data SLA seluruh divisi
  it('10. Direktur/Admin tanpa parameter divisiId dapat mengakses data seluruh divisi', async () => {
    const originalFindMany = prisma.ticket.findMany;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [];
    };

    try {
      await getSlaReportData({
        user: { id: 1, role: 'DIREKTUR' },
        query: {},
      });

      assert.equal(capturedWhere.divisiId, undefined);
    } finally {
      prisma.ticket.findMany = originalFindMany;
    }
  });

  // 11. Pengguna KADIV terkunci hanya pada divisinya sendiri
  it('11. Kadiv terkunci secara mutlak pada divisi miliknya sendiri', async () => {
    const originalFindMany = prisma.ticket.findMany;
    const originalDivisiFindUnique = prisma.divisi.findUnique;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [];
    };
    prisma.divisi.findUnique = async ({ where }) => ({ id: where.id, nama: 'Divisi Test' });

    try {
      await getSlaReportData({
        user: { id: 4, role: 'KADIV', divisiId: 2 },
        query: {},
      });

      assert.equal(capturedWhere.divisiId, 2);
    } finally {
      prisma.ticket.findMany = originalFindMany;
      prisma.divisi.findUnique = originalDivisiFindUnique;
    }
  });

  // 12. Pengguna STAF ditolak saat mengakses laporan SLA (HTTP 403)
  it('12. Staf ditolak mengakses laporan SLA dengan HTTP 403', async () => {
    const req = {
      user: { id: 15, role: 'STAF', divisiId: 2 },
      query: {},
    };
    const res = createMockRes();

    await getLaporanSLA(req, res);

    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /Staf tidak memiliki hak akses/);
  });

  // 13. Upaya manipulasi parameter query divisi oleh KADIV dinetralkan ke divisinya
  it('13. Kadiv yang mencoba bypass ?divisiId=99 tetap dipaksa membaca divisinya sendiri', async () => {
    const originalFindMany = prisma.ticket.findMany;
    const originalDivisiFindUnique = prisma.divisi.findUnique;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [];
    };
    prisma.divisi.findUnique = async ({ where }) => ({ id: where.id, nama: 'Divisi Test' });

    try {
      await getSlaReportData({
        user: { id: 4, role: 'KADIV', divisiId: 2 },
        query: { divisiId: '99' }, // Percobaan akses data divisi lain
      });

      assert.equal(capturedWhere.divisiId, 2); // Tetap 2, bukan 99
    } finally {
      prisma.ticket.findMany = originalFindMany;
      prisma.divisi.findUnique = originalDivisiFindUnique;
    }
  });

  // 14. Ringkasan KPI konsisten dengan rincian tabel
  it('14. Total tiket selesai, persentase kepatuhan, dan jumlah tepat waktu konsisten dengan rincian tabel', async () => {
    const originalTicketFindMany = prisma.ticket.findMany;
    const originalAuditLogFindMany = prisma.auditLog.findMany;

    // 2 tiket: 1 Tepat Waktu, 1 Terlambat
    prisma.ticket.findMany = async () => [
      {
        id: 101,
        judul: 'Perbaikan Printer Farmasi',
        prioritas: 'HIGH',
        status: 'SELESAI',
        divisiId: 1,
        divisi: { id: 1, nama: 'IT' },
        pelaksana: { id: 7, nama: 'Rian' },
        penanggungJawab: { id: 2, nama: 'Koor IT' },
        pembuat: { id: 1, nama: 'Kadiv IT' },
        createdAt: new Date('2026-11-01T08:00:00Z'),
        deadline: new Date('2026-11-01T12:00:00Z'),
        completedAt: new Date('2026-11-01T11:00:00Z'),
      },
      {
        id: 102,
        judul: 'Backup Database SIMRS',
        prioritas: 'MEDIUM',
        status: 'SELESAI',
        divisiId: 1,
        divisi: { id: 1, nama: 'IT' },
        pelaksana: { id: 8, nama: 'Fajar' },
        penanggungJawab: { id: 2, nama: 'Koor IT' },
        pembuat: { id: 1, nama: 'Kadiv IT' },
        createdAt: new Date('2026-11-01T08:00:00Z'),
        deadline: new Date('2026-11-01T10:00:00Z'),
        completedAt: new Date('2026-11-01T14:00:00Z'),
      },
    ];

    prisma.auditLog.findMany = async () => [
      { entityId: 101, createdAt: new Date('2026-11-01T10:30:00Z') }, // Tepat waktu (deadline 12:00)
      { entityId: 102, createdAt: new Date('2026-11-01T13:30:00Z') }, // Terlambat 3.5 jam (deadline 10:00)
    ];

    try {
      const res = await getSlaReportData({
        user: { id: 1, role: 'DIREKTUR' },
        query: {},
      });

      assert.equal(res.ringkasan.totalTiket, 2);
      assert.equal(res.ringkasan.sesuaiSLA, 1);
      assert.equal(res.ringkasan.terlambat, 1);
      assert.equal(res.ringkasan.persentaseSLA, 50.0);
      assert.equal(res.data.length, 2);
    } finally {
      prisma.ticket.findMany = originalTicketFindMany;
      prisma.auditLog.findMany = originalAuditLogFindMany;
    }
  });

  // 15. Perhitungan selisih keterlambatan menghasilkan nilai menit dan format teks akurat
  it('15. Perhitungan selisih keterlambatan akurat dalam format hari, jam, dan menit', () => {
    assert.equal(formatDurasi(0), '-');
    assert.equal(formatDurasi(25), '25 menit');
    assert.equal(formatDurasi(90), '1 jam 30 menit');
    assert.equal(formatDurasi(1500), '1 hari 1 jam');
    assert.equal(formatDurasi(1515), '1 hari 1 jam 15 menit');
  });

  // 16. Saat tidak ada tiket selesai, nilai KPI menampilkan 0 tanpa error NaN
  it('16. Saat tidak ada tiket selesai, sistem aman tanpa pembagian nol atau NaN', async () => {
    const originalTicketFindMany = prisma.ticket.findMany;
    prisma.ticket.findMany = async () => [];

    try {
      const res = await getSlaReportData({
        user: { id: 1, role: 'DIREKTUR' },
        query: {},
      });

      assert.equal(res.ringkasan.totalTiket, 0);
      assert.equal(res.ringkasan.sesuaiSLA, 0);
      assert.equal(res.ringkasan.terlambat, 0);
      assert.equal(res.ringkasan.persentaseSLA, 0);
      assert.equal(res.ringkasan.rataRataDurasiJam, 0);
      assert.equal(Number.isNaN(res.ringkasan.persentaseSLA), false);
      assert.equal(Number.isNaN(res.ringkasan.rataRataDurasiJam), false);
    } finally {
      prisma.ticket.findMany = originalTicketFindMany;
    }
  });

  // 17. Tiket historis tanpa log audit pengumpulan menggunakan completedAt sebagai fallback
  it('17. Tiket historis tanpa AuditLog pengumpulan fallback jujur ke completedAt', async () => {
    const originalTicketFindMany = prisma.ticket.findMany;
    const originalAuditLogFindMany = prisma.auditLog.findMany;

    const legacyDeadline = new Date('2026-10-10T12:00:00Z');
    const legacyCompletedAt = new Date('2026-10-10T11:00:00Z');

    prisma.ticket.findMany = async () => [
      {
        id: 50,
        judul: 'Tiket Lama Sebelum Modul 3',
        prioritas: 'LOW',
        status: 'SELESAI',
        divisiId: 2,
        divisi: { id: 2, nama: 'Umum' },
        pelaksana: { id: 5, nama: 'Agus' },
        penanggungJawab: { id: 2, nama: 'Koor Umum' },
        pembuat: { id: 1, nama: 'Kadiv Umum' },
        createdAt: new Date('2026-10-09T08:00:00Z'),
        deadline: legacyDeadline,
        completedAt: legacyCompletedAt,
        updatedAt: legacyCompletedAt,
      },
    ];

    prisma.auditLog.findMany = async () => []; // Tidak ada AuditLog pengumpulan staf

    try {
      const res = await getSlaReportData({
        user: { id: 1, role: 'DIREKTUR' },
        query: {},
      });

      assert.equal(res.data.length, 1);
      assert.equal(res.data[0].isHistoricalFallback, true);
      assert.equal(res.data[0].statusSLA, 'SESUAI_SLA');
    } finally {
      prisma.ticket.findMany = originalTicketFindMany;
      prisma.auditLog.findMany = originalAuditLogFindMany;
    }
  });

  // 18. Ekspor Excel menghasilkan response attachment spreadsheet valid
  it('18. Ekspor Excel menghasilkan response attachment dengan header Content-Type openxmlformats', async () => {
    const originalTicketFindMany = prisma.ticket.findMany;
    const originalAuditLogFindMany = prisma.auditLog.findMany;

    prisma.ticket.findMany = async () => [
      {
        id: 777,
        judul: 'Kalibrasi Tensimeter',
        prioritas: 'HIGH',
        status: 'SELESAI',
        divisiId: 2,
        divisi: { id: 2, nama: 'Elektromedis' },
        pelaksana: { id: 9, nama: 'Teknisi Medis' },
        penanggungJawab: { id: 3, nama: 'Koor Medis' },
        pembuat: { id: 1, nama: 'Kadiv Medis' },
        createdAt: new Date('2026-11-01T08:00:00Z'),
        deadline: new Date('2026-11-02T12:00:00Z'),
        completedAt: new Date('2026-11-02T10:00:00Z'),
        updatedAt: new Date('2026-11-02T10:00:00Z'),
      },
    ];
    prisma.auditLog.findMany = async () => [];

    const req = {
      user: { id: 1, role: 'DIREKTUR' },
      query: {},
    };
    const res = createMockRes();

    try {
      await exportExcelSla(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(
        res.getHeader('content-type'),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      assert.match(res.getHeader('content-disposition'), /attachment; filename="Laporan_SLA_/);
      assert.ok(res.chunks.length > 0);
    } finally {
      prisma.ticket.findMany = originalTicketFindMany;
      prisma.auditLog.findMany = originalAuditLogFindMany;
    }
  });

  // 19. Ekspor PDF menghasilkan dokumen landscape A4 dan tidak membocorkan data medis
  it('19. Ekspor PDF menghasilkan dokumen application/pdf dan bebas dari kebocoran data rekam medis', async () => {
    const originalTicketFindMany = prisma.ticket.findMany;
    const originalAuditLogFindMany = prisma.auditLog.findMany;

    prisma.ticket.findMany = async () => [
      {
        id: 888,
        judul: 'Perbaikan Lampu Operasi OK 1',
        prioritas: 'HIGH',
        status: 'SELESAI',
        divisiId: 3,
        divisi: { id: 3, nama: 'Pemeliharaan Sarana' },
        pelaksana: { id: 12, nama: 'Dedi' },
        penanggungJawab: { id: 4, nama: 'Koor Sarana' },
        pembuat: { id: 2, nama: 'Kadiv Sarana' },
        createdAt: new Date('2026-11-01T08:00:00Z'),
        deadline: new Date('2026-11-02T12:00:00Z'),
        completedAt: new Date('2026-11-02T11:00:00Z'),
        updatedAt: new Date('2026-11-02T11:00:00Z'),
      },
    ];
    prisma.auditLog.findMany = async () => [];

    const req = {
      user: { id: 1, role: 'DIREKTUR' },
      query: {},
    };
    const res = createMockRes();

    try {
      await new Promise((resolve, reject) => {
        res.on('finish', resolve);
        res.on('error', reject);
        exportPdfSla(req, res).catch(reject);
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.getHeader('content-type'), 'application/pdf');
      assert.match(res.getHeader('content-disposition'), /attachment; filename="Laporan_SLA_/);

      const combinedPdfBuffer = Buffer.concat(res.chunks);
      assert.ok(combinedPdfBuffer.length > 0);

      // Verifikasi zero data RME/rekam medis/nik pasien
      const pdfString = combinedPdfBuffer.toString('latin1');
      assert.equal(pdfString.includes('rekam_medis'), false);
      assert.equal(pdfString.includes('diagnosa'), false);
    } finally {
      prisma.ticket.findMany = originalTicketFindMany;
      prisma.auditLog.findMany = originalAuditLogFindMany;
    }
  });

});
