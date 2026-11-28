// Backend/tests/rbacDataIsolation.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  createTicket,
  getTickets,
  getTicketById,
  triageTicket,
  updateTicketStatus,
} = require('../controllers/ticketController');

const {
  getLaporanSLA,
  getSlaReportData,
} = require('../controllers/slaController');

const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const prisma = require('../db');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

describe('MODUL 4 – RBAC & Data Isolation Test Suite (18 Skenario UAT)', () => {

  // Skenario 1: Direktur dapat mengakses laporan dan tiket seluruh divisi
  it('1. Direktur dapat mengakses tiket seluruh divisi tanpa isolasi terbatas', async () => {
    const originalFindMany = prisma.ticket.findMany;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [{ id: 1, judul: 'Tiket Medis' }, { id: 2, judul: 'Tiket Umum' }];
    };

    const req = { user: { id: 1, role: 'DIREKTUR', divisiId: null } };
    const res = createMockRes();

    try {
      await getTickets(req, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(capturedWhere, {}); // Tidak ada filter pembatas divisi
      assert.equal(res.body.data.length, 2);
    } finally {
      prisma.ticket.findMany = originalFindMany;
    }
  });

  // Skenario 2: Direktur ditolak jika mencoba memberikan tugas operasional langsung kepada Staf
  it('2. Direktur ditolak jika mencoba memberikan tugas operasional langsung kepada Staf', async () => {
    const originalDivisiFindUnique = prisma.divisi.findUnique;
    const originalUserFindUnique = prisma.user.findUnique;

    prisma.divisi.findUnique = async () => ({ id: 1, nama: 'Medis' });
    prisma.user.findUnique = async ({ where }) => {
      if (where.id === 10) return { id: 10, role: 'STAF', nama: 'Staf Medis', divisiId: 1 };
      return null;
    };

    const req = {
      user: { id: 1, role: 'DIREKTUR', nama: 'Direktur RS' },
      body: {
        judul: 'Cuci Alkes Langsung',
        deskripsi: 'Instruksi langsung',
        divisiId: 1,
        pelaksanaId: 10,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        tipe: 'BUAT_TUGAS',
      },
    };
    const res = createMockRes();

    try {
      await createTicket(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /Direktur tidak menerbitkan tugas operasional langsung kepada Staf/);
    } finally {
      prisma.divisi.findUnique = originalDivisiFindUnique;
      prisma.user.findUnique = originalUserFindUnique;
    }
  });

  // Skenario 3: Kadiv dapat mengakses tugas dalam divisinya sendiri
  it('3. Kadiv dapat melihat tiket dalam divisinya sendiri', async () => {
    const originalFindMany = prisma.ticket.findMany;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [{ id: 101, divisiId: 2 }];
    };

    const req = { user: { id: 5, role: 'KADIV', divisiId: 2 } };
    const res = createMockRes();

    try {
      await getTickets(req, res);
      assert.equal(res.statusCode, 200);
      assert.ok(capturedWhere.OR);
      const hasDivisiFilter = capturedWhere.OR.some((cond) => cond.divisiId === 2);
      assert.equal(hasDivisiFilter, true);
    } finally {
      prisma.ticket.findMany = originalFindMany;
    }
  });

  // Skenario 4: Kadiv ditolak (HTTP 403) saat mencoba mengakses tugas divisi lain
  it('4. Kadiv ditolak 403 saat mencoba mengakses detail tiket divisi lain', async () => {
    const originalFindUnique = prisma.ticket.findUnique;
    prisma.ticket.findUnique = async () => ({
      id: 88,
      judul: 'Server Down SIMRS',
      divisiId: 1, // Divisi IT
      pembuatId: 2,
      pelaksanaId: 3,
    });

    const req = {
      params: { id: 88 },
      user: { id: 5, role: 'KADIV', divisiId: 2 }, // Kadiv Umum (Divisi 2)
    };
    const res = createMockRes();

    try {
      await getTicketById(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.body.message, /tidak memiliki hak akses untuk melihat tiket dari divisi lain/);
    } finally {
      prisma.ticket.findUnique = originalFindUnique;
    }
  });

  // Skenario 5: Kadiv dapat memberikan arahan kepada Koordinator dalam divisinya
  it('5. Kadiv dapat memberikan arahan kepada Koordinator dalam divisi tujuan', async () => {
    const originalDivisi = prisma.divisi.findUnique;
    const originalUser = prisma.user.findUnique;
    const originalCreate = prisma.ticket.create;
    const originalAudit = prisma.auditLog.create;

    prisma.divisi.findUnique = async () => ({ id: 2, nama: 'Divisi Umum' });
    prisma.user.findUnique = async () => ({ id: 6, role: 'KOORDINATOR', divisiId: 2, nama: 'Koor Umum' });
    prisma.ticket.create = async ({ data }) => ({ id: 202, ...data, divisi: { nama: 'Divisi Umum' } });
    prisma.auditLog.create = async () => ({ id: 1 });

    const req = {
      user: { id: 5, role: 'KADIV', divisiId: 2, nama: 'Kadiv Umum' },
      body: {
        judul: 'Optimalisasi Sarana Nifas',
        deskripsi: 'Instruksi pimpinan',
        divisiId: 2,
        pelaksanaId: 6,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        tipe: 'BUAT_TUGAS',
      },
    };
    const res = createMockRes();

    try {
      await createTicket(req, res);
      assert.equal(res.statusCode, 201);
      assert.match(res.body.message, /Arahan divisi berhasil diterbitkan kepada Koordinator/);
    } finally {
      prisma.divisi.findUnique = originalDivisi;
      prisma.user.findUnique = originalUser;
      prisma.ticket.create = originalCreate;
      prisma.auditLog.create = originalAudit;
    }
  });

  // Skenario 6: Kadiv ditolak jika mencoba menugaskan Staf secara langsung
  it('6. Kadiv ditolak jika mencoba menugaskan Staf secara langsung', async () => {
    const originalDivisi = prisma.divisi.findUnique;
    const originalUser = prisma.user.findUnique;

    prisma.divisi.findUnique = async () => ({ id: 2, nama: 'Divisi Umum' });
    prisma.user.findUnique = async () => ({ id: 12, role: 'STAF', divisiId: 2, nama: 'Staf Lapangan' });

    const req = {
      user: { id: 5, role: 'KADIV', divisiId: 2, nama: 'Kadiv Umum' },
      body: {
        judul: 'Perbaikan Lampu',
        deskripsi: 'Bypass langsung ke staf',
        divisiId: 2,
        pelaksanaId: 12, // Staf
        deadline: new Date(Date.now() + 86400000).toISOString(),
        tipe: 'BUAT_TUGAS',
      },
    };
    const res = createMockRes();

    try {
      await createTicket(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /Kepala Divisi tidak dapat menugaskan Staf secara langsung/);
    } finally {
      prisma.divisi.findUnique = originalDivisi;
      prisma.user.findUnique = originalUser;
    }
  });

  // Skenario 7: Koordinator dapat membuat tiket operasional dalam divisinya
  it('7. Koordinator dapat membuat tiket operasional dalam divisinya', async () => {
    const originalDivisi = prisma.divisi.findUnique;
    const originalUser = prisma.user.findUnique;
    const originalCreate = prisma.ticket.create;
    const originalAudit = prisma.auditLog.create;

    prisma.divisi.findUnique = async () => ({ id: 3, nama: 'Divisi Farmasi' });
    prisma.user.findUnique = async () => ({ id: 15, role: 'STAF', divisiId: 3, nama: 'Staf Farmasi' });
    prisma.ticket.create = async ({ data }) => ({ id: 303, ...data, divisi: { nama: 'Divisi Farmasi' } });
    prisma.auditLog.create = async () => ({ id: 2 });

    const req = {
      user: { id: 7, role: 'KOORDINATOR', divisiId: 3, nama: 'Koor Farmasi' },
      body: {
        judul: 'Stok Opname Obat',
        deskripsi: 'Tugas bulanan',
        divisiId: 3,
        pelaksanaId: 15,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        tipe: 'BUAT_TUGAS',
      },
    };
    const res = createMockRes();

    try {
      await createTicket(req, res);
      assert.equal(res.statusCode, 201);
      assert.match(res.body.message, /Tugas operasional berhasil dibuat dan ditugaskan kepada Staf/);
    } finally {
      prisma.divisi.findUnique = originalDivisi;
      prisma.user.findUnique = originalUser;
      prisma.ticket.create = originalCreate;
      prisma.auditLog.create = originalAudit;
    }
  });

  // Skenario 8: Koordinator dapat menugaskan Staf dari divisi yang sama
  it('8. Koordinator dapat menugaskan Staf dari divisi yang sama', async () => {
    const originalDivisi = prisma.divisi.findUnique;
    const originalUser = prisma.user.findUnique;
    const originalCreate = prisma.ticket.create;
    const originalAudit = prisma.auditLog.create;

    prisma.divisi.findUnique = async () => ({ id: 3, nama: 'Farmasi' });
    prisma.user.findUnique = async () => ({ id: 18, role: 'STAF', divisiId: 3, nama: 'Staf Gudang' });
    prisma.ticket.create = async ({ data }) => ({ id: 304, ...data, divisi: { nama: 'Farmasi' } });
    prisma.auditLog.create = async () => ({ id: 3 });

    const req = {
      user: { id: 7, role: 'KOORDINATOR', divisiId: 3, nama: 'Koor Farmasi' },
      body: {
        judul: 'Penerimaan Vaksin',
        deskripsi: 'Operasional',
        divisiId: 3,
        pelaksanaId: 18,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        tipe: 'BUAT_TUGAS',
      },
    };
    const res = createMockRes();

    try {
      await createTicket(req, res);
      assert.equal(res.statusCode, 201);
    } finally {
      prisma.divisi.findUnique = originalDivisi;
      prisma.user.findUnique = originalUser;
      prisma.ticket.create = originalCreate;
      prisma.auditLog.create = originalAudit;
    }
  });

  // Skenario 9: Koordinator ditolak jika mencoba menugaskan Staf dari divisi lain
  it('9. Koordinator ditolak jika mencoba menugaskan Staf dari divisi lain', async () => {
    const originalDivisi = prisma.divisi.findUnique;
    const originalUser = prisma.user.findUnique;

    prisma.divisi.findUnique = async () => ({ id: 3, nama: 'Farmasi' });
    prisma.user.findUnique = async () => ({ id: 25, role: 'STAF', divisiId: 1, nama: 'Staf IT' }); // Staf IT (Divisi 1)

    const req = {
      user: { id: 7, role: 'KOORDINATOR', divisiId: 3, nama: 'Koor Farmasi' },
      body: {
        judul: 'Pemasangan Kabel',
        deskripsi: 'Menugaskan staf beda divisi',
        divisiId: 3,
        pelaksanaId: 25,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        tipe: 'BUAT_TUGAS',
      },
    };
    const res = createMockRes();

    try {
      await createTicket(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /Koordinator hanya dapat menugaskan Staf di dalam divisi yang sama/);
    } finally {
      prisma.divisi.findUnique = originalDivisi;
      prisma.user.findUnique = originalUser;
    }
  });

  // Skenario 10: Koordinator ditolak jika menetapkan pemeriksa yang sama dengan pelaksana
  it('10. Pelaksana tugas ditolak saat mencoba memverifikasi (SELESAI) tugasnya sendiri', async () => {
    const originalTicket = prisma.ticket.findUnique;
    prisma.ticket.findUnique = async () => ({
      id: 501,
      judul: 'Tugas Mandiri',
      divisiId: 2,
      pelaksanaId: 6, // Pelaksana adalah user ID 6
      penanggungJawabId: 6,
      fotoBukti: 'foto.jpg',
      laporanPenyelesaian: 'Selesai',
      status: 'MENUNGGU_VALIDASI',
    });

    const req = {
      params: { id: 501 },
      user: { id: 6, role: 'KOORDINATOR', divisiId: 2 }, // User ID 6 mencoba verifikasi SELESAI
      body: { status: 'SELESAI' },
    };
    const res = createMockRes();

    try {
      await updateTicketStatus(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /Pelaksana tugas tidak dapat memverifikasi atau mengevaluasi pekerjaannya sendiri/);
    } finally {
      prisma.ticket.findUnique = originalTicket;
    }
  });

  // Skenario 11: Staf dapat melihat tugas yang ditugaskan kepadanya
  it('11. Staf dapat melihat tugas yang ditugaskan kepadanya', async () => {
    const originalFindMany = prisma.ticket.findMany;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [{ id: 701, pelaksanaId: 20 }];
    };

    const req = { user: { id: 20, role: 'STAF', divisiId: 2 } };
    const res = createMockRes();

    try {
      await getTickets(req, res);
      assert.equal(res.statusCode, 200);
      assert.ok(capturedWhere.OR);
      const isFilteredToPelaksana = capturedWhere.OR.some((cond) => cond.pelaksanaId === 20);
      assert.equal(isFilteredToPelaksana, true);
    } finally {
      prisma.ticket.findMany = originalFindMany;
    }
  });

  // Skenario 12: Staf ditolak (HTTP 403) saat mencoba melihat tugas milik Staf lain
  it('12. Staf ditolak 403 saat mencoba melihat detail tugas milik Staf lain', async () => {
    const originalFindUnique = prisma.ticket.findUnique;
    prisma.ticket.findUnique = async () => ({
      id: 702,
      judul: 'Tugas Khusus Staf Lain',
      pembuatId: 6,
      pelaksanaId: 21, // Pelaksana adalah Staf 21
      divisiId: 2,
    });

    const req = {
      params: { id: 702 },
      user: { id: 20, role: 'STAF', divisiId: 2 }, // Staf 20 mencoba melihat tugas Staf 21
    };
    const res = createMockRes();

    try {
      await getTicketById(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.body.message, /Anda tidak memiliki hak akses untuk melihat tiket ini/);
    } finally {
      prisma.ticket.findUnique = originalFindUnique;
    }
  });

  // Skenario 13: Staf ditolak (HTTP 403) saat mencoba mengubah status menjadi Verified (SELESAI)
  it('13. Staf ditolak 403 saat mencoba mengubah status menjadi SELESAI', async () => {
    const req = {
      params: { id: 703 },
      user: { id: 20, role: 'STAF', divisiId: 2 },
      body: { status: 'SELESAI' },
    };
    const res = createMockRes();

    await updateTicketStatus(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /Penyelesaian tugas harus melalui pelaporan bukti foto dan dievaluasi/);
  });

  // Skenario 14: Staf ditolak (HTTP 403) saat mencoba mengakses laporan SLA
  it('14. Staf ditolak 403 saat mencoba mengakses laporan SLA', async () => {
    const req = {
      user: { id: 20, role: 'STAF', divisiId: 2 },
      query: {},
    };
    const res = createMockRes();

    await getLaporanSLA(req, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /Staf tidak memiliki hak akses untuk melihat laporan SLA/);
  });

  // Skenario 15: Pengguna ditolak saat memanipulasi userId, role, atau divisiId pada request body
  it('15. Backend mengabaikan manipulasi userId/role di body dan memakai data JWT otentik', async () => {
    const originalDivisi = prisma.divisi.findUnique;
    const originalUser = prisma.user.findUnique;
    const originalCreate = prisma.ticket.create;
    const originalAudit = prisma.auditLog.create;

    let capturedTicketData = null;

    prisma.divisi.findUnique = async () => ({ id: 2, nama: 'Umum' });
    prisma.user.findUnique = async () => ({ id: 9, role: 'STAF', divisiId: 2, nama: 'Staf' });
    prisma.ticket.create = async ({ data }) => {
      capturedTicketData = data;
      return { id: 999, ...data, divisi: { nama: 'Umum' } };
    };
    prisma.auditLog.create = async () => ({ id: 10 });

    const req = {
      user: { id: 7, role: 'KOORDINATOR', divisiId: 2, nama: 'Koor Asli' },
      body: {
        judul: 'Pencegahan Manipulasi Parameter',
        deskripsi: 'Uji body tampering',
        divisiId: 2,
        pelaksanaId: 9,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        tipe: 'BUAT_TUGAS',
        // Parameter percobaan manipulasi:
        userId: 1, // Mencoba memalsukan pembuat sebagai Direktur
        role: 'DIREKTUR',
      },
    };
    const res = createMockRes();

    try {
      await createTicket(req, res);
      assert.equal(res.statusCode, 201);
      // Pembuat tiket HARUS tetap ID 7 dari req.user, bukan ID 1 dari req.body!
      assert.equal(capturedTicketData.pembuatId, 7);
    } finally {
      prisma.divisi.findUnique = originalDivisi;
      prisma.user.findUnique = originalUser;
      prisma.ticket.create = originalCreate;
      prisma.auditLog.create = originalAudit;
    }
  });

  // Skenario 16: Request tanpa token ditolak (HTTP 401) saat mengakses endpoint privat secara langsung
  it('16. Request tanpa token ditolak HTTP 401 oleh middleware verifyToken', () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    verifyToken(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /Token tidak ditemukan/);
    assert.equal(nextCalled, false);
  });

  // Skenario 17: Kadiv/Koordinator dipaksa hanya mengekstrak data divisinya sendiri pada endpoint export
  it('17. Kadiv dipaksa membaca divisinya sendiri saat mengakses getSlaReportData untuk export', async () => {
    const originalTicketFindMany = prisma.ticket.findMany;
    const originalDivisiFindUnique = prisma.divisi.findUnique;

    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [];
    };
    prisma.divisi.findUnique = async () => ({ id: 2, nama: 'Divisi Umum' });

    try {
      const report = await getSlaReportData({
        user: { id: 5, role: 'KADIV', divisiId: 2 },
        query: { divisiId: '99' }, // Percobaan memalsukan query ke divisi 99
      });

      assert.equal(capturedWhere.divisiId, 2); // Wajib dinetralkan ke divisi 2
      assert.equal(report.metadata.targetDivisiId, 2);
    } finally {
      prisma.ticket.findMany = originalTicketFindMany;
      prisma.divisi.findUnique = originalDivisiFindUnique;
    }
  });

  // Skenario 18: Seluruh perubahan status, penugasan, dan eskalasi tercatat lengkap pada AuditLog
  it('18. Perubahan status mencatat action dan riwayat lengkap pada AuditLog', async () => {
    const originalTicket = prisma.ticket.findUnique;
    const originalUpdate = prisma.ticket.update;
    const originalAudit = prisma.auditLog.create;

    let capturedAudit = null;

    prisma.ticket.findUnique = async () => ({
      id: 888,
      judul: 'Eskalasi Anggaran Genset',
      divisiId: 2,
      pelaksanaId: 9,
      status: 'DIPROSES',
    });

    prisma.ticket.update = async ({ data }) => ({
      id: 888,
      judul: 'Eskalasi Anggaran Genset',
      divisiId: 2,
      pelaksanaId: 9,
      ...data,
    });

    prisma.auditLog.create = async ({ data }) => {
      capturedAudit = data;
      return { id: 55, ...data };
    };

    const req = {
      params: { id: 888 },
      user: { id: 7, role: 'KOORDINATOR', divisiId: 2, nama: 'Koor Umum' },
      body: {
        status: 'HOLD_ESKALASI',
        catatanRevisi: 'Biaya perbaikan melebihi pagu anggaran divisi.',
      },
    };
    const res = createMockRes();

    try {
      await updateTicketStatus(req, res);
      assert.equal(res.statusCode, 200);
      assert.ok(capturedAudit);
      assert.equal(capturedAudit.action, 'ESCALATE_TASK');
      assert.equal(capturedAudit.entityId, 888);
      assert.equal(capturedAudit.userId, 7);
      assert.match(capturedAudit.details, /KOORDINATOR mengubah status tiket #T-888 menjadi HOLD_ESKALASI/);
    } finally {
      prisma.ticket.findUnique = originalTicket;
      prisma.ticket.update = originalUpdate;
      prisma.auditLog.create = originalAudit;
    }
  });

});
