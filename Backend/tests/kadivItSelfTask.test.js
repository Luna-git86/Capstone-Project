// Backend/tests/kadivItSelfTask.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  createTicket,
  updateTicketStatus,
  isDivisiIT,
} = require('../controllers/ticketController');
const { getTicketOptions } = require('../controllers/ticketOptionsController');
const { getSlaReportData } = require('../controllers/slaController');
const { dispatchTicketNotifications } = require('../services/ticketNotificationService');
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

describe('Khusus Kepala Divisi IT & SIMRS — Laporan Tugas Mandiri & Penanganan Laporan Masuk', () => {
  it('1. isDivisiIT mengenali Divisi IT & SIMRS secara presisi tanpa salah deteksi kata lain', () => {
    assert.equal(isDivisiIT('Divisi IT & SIMRS'), true);
    assert.equal(isDivisiIT('Unit IT'), true);
    assert.equal(isDivisiIT('Instalasi SIMRS'), true);
    assert.equal(isDivisiIT('Divisi Umum & Rumah Tangga'), false);
    assert.equal(isDivisiIT('Divisi Pelayanan Medis & Keperawatan'), false);
    assert.equal(isDivisiIT('Divisi Sanitasi'), false);
    assert.equal(isDivisiIT('Unit Audit Internal'), false);
  });

  it('2. Kadiv IT dapat membuat laporan tugas sendiri (1 form sekaligus) dan langsung berstatus SELESAI + terukur SESUAI_SLA', async () => {
    const originalDivisi = prisma.divisi.findUnique;
    const originalCreate = prisma.ticket.create;
    const originalAudit = prisma.auditLog.create;
    const originalTicketFindMany = prisma.ticket.findMany;
    const originalAuditFindMany = prisma.auditLog.findMany;

    let capturedTicketData = null;
    let capturedAuditData = null;

    prisma.divisi.findUnique = async () => ({ id: 2, nama: 'Divisi IT & SIMRS' });
    prisma.ticket.create = async ({ data }) => {
      capturedTicketData = data;
      return {
        id: 501,
        createdAt: data.completedAt,
        updatedAt: data.completedAt,
        ...data,
        divisi: { id: 2, nama: 'Divisi IT & SIMRS' },
        pelaksana: { id: 3, nama: 'Kepala Divisi IT', role: 'KADIV' },
        pembuat: { id: 3, nama: 'Kepala Divisi IT', role: 'KADIV' },
        penanggungJawab: { id: 3, nama: 'Kepala Divisi IT', role: 'KADIV' },
      };
    };
    prisma.auditLog.create = async ({ data }) => {
      capturedAuditData = data;
      return { id: 91, ...data };
    };

    const req = {
      user: {
        id: 3,
        nama: 'Kepala Divisi IT',
        role: 'KADIV',
        divisiId: 2,
        divisi: 'Divisi IT & SIMRS',
      },
      body: {
        tipe: 'LAPORAN_TUGAS_MANDIRI',
        judul: 'Pemeliharaan Database & Optimasi Query SIMRS',
        lokasi: 'Ruang Server IT',
        deskripsi: 'Melakukan re-indexing tabel kunjungan SIMRS dan backup harian.',
        prioritas: 'HIGH',
        divisiId: 2,
        fotoBukti: 'data:image/jpeg;base64,fakebukti123',
        laporanPenyelesaian: 'Database berhasil dioptimasi dan waktu respon normal kembali.',
      },
    };
    const res = createMockRes();

    try {
      await createTicket(req, res);
      assert.equal(res.statusCode, 201);
      assert.equal(capturedTicketData.status, 'SELESAI');
      assert.equal(capturedTicketData.jenisTiket, 'TUGAS');
      assert.equal(capturedTicketData.pembuatId, 3);
      assert.equal(capturedTicketData.pelaksanaId, 3);
      assert.equal(capturedTicketData.penanggungJawabId, 3);
      assert.equal(capturedTicketData.fotoBukti, 'data:image/jpeg;base64,fakebukti123');
      assert.ok(capturedTicketData.completedAt instanceof Date);
      assert.ok(capturedTicketData.deadline instanceof Date);
      assert.equal(capturedAuditData.action, 'SUBMIT_COMPLETION_REPORT');

      // Pastikan terbaca SESUAI_SLA di Laporan Kinerja SLA
      prisma.ticket.findMany = async () => [res.body.data];
      prisma.auditLog.findMany = async () => [
        { entityId: 501, createdAt: capturedAuditData.createdAt },
      ];
      const slaReport = await getSlaReportData({
        user: { id: 3, role: 'KADIV', divisiId: 2 },
        query: {},
      });
      assert.equal(slaReport.data.length, 1);
      assert.equal(slaReport.data[0].statusSLA, 'SESUAI_SLA');
    } finally {
      prisma.divisi.findUnique = originalDivisi;
      prisma.ticket.create = originalCreate;
      prisma.auditLog.create = originalAudit;
      prisma.ticket.findMany = originalTicketFindMany;
      prisma.auditLog.findMany = originalAuditFindMany;
    }
  });

  it('3. Kadiv IT ditolak 400 jika fotoBukti atau laporanPenyelesaian kosong saat membuat laporan tugas mandiri', async () => {
    const originalDivisi = prisma.divisi.findUnique;
    prisma.divisi.findUnique = async () => ({ id: 2, nama: 'Divisi IT & SIMRS' });

    const req = {
      user: { id: 3, role: 'KADIV', divisiId: 2, divisi: 'Divisi IT & SIMRS' },
      body: {
        tipe: 'LAPORAN_TUGAS_MANDIRI',
        judul: 'Reset Jaringan Router IGD',
        lokasi: 'IGD',
        deskripsi: 'Reset perangkat jaringan',
        divisiId: 2,
        fotoBukti: '',
        laporanPenyelesaian: 'Sudah selesai',
      },
    };
    const res = createMockRes();

    try {
      await createTicket(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /Foto bukti/i);
    } finally {
      prisma.divisi.findUnique = originalDivisi;
    }
  });

  it('4. Kadiv divisi lain (bukan IT) ditolak 403 saat mencoba memakai mode LAPORAN_TUGAS_MANDIRI', async () => {
    const originalDivisi = prisma.divisi.findUnique;
    prisma.divisi.findUnique = async () => ({
      id: 4,
      nama: 'Divisi Pelayanan Medis & Keperawatan',
    });

    const req = {
      user: {
        id: 7,
        role: 'KADIV',
        divisiId: 4,
        divisi: 'Divisi Pelayanan Medis & Keperawatan',
      },
      body: {
        tipe: 'LAPORAN_TUGAS_MANDIRI',
        judul: 'Coba Bypass Delegasi',
        lokasi: 'Poli Anak',
        deskripsi: 'Percobaan bypass koordinator',
        divisiId: 4,
        fotoBukti: 'data:image/jpeg;base64,abc',
        laporanPenyelesaian: 'Selesai',
      },
    };
    const res = createMockRes();

    try {
      await createTicket(req, res);
      assert.equal(res.statusCode, 403);
      assert.match(res.body.message, /khusus untuk Kepala Divisi IT/i);
    } finally {
      prisma.divisi.findUnique = originalDivisi;
    }
  });

  it('5. Laporan Masalah IT yang ditindaklanjuti Kadiv IT lewat laporan tugas mandiri otomatis ikut berstatus SELESAI', async () => {
    const originalDivisi = prisma.divisi.findUnique;
    const originalTicketFind = prisma.ticket.findUnique;
    const originalTicketUpdate = prisma.ticket.update;
    const originalTicketCreate = prisma.ticket.create;
    const originalAudit = prisma.auditLog.create;

    let parentUpdatePayload = null;

    prisma.divisi.findUnique = async () => ({ id: 2, nama: 'Divisi IT & SIMRS' });
    prisma.ticket.findUnique = async () => ({
      id: 77,
      judul: 'Printer Farmasi Error',
      status: 'MENUNGGU_TRIASE',
      jenisTiket: 'LAPORAN',
      divisiId: 2,
      fotoInstruksi: 'data:image/jpeg;base64,printerawal',
    });
    prisma.ticket.update = async ({ where, data }) => {
      parentUpdatePayload = { where, data };
      return { id: where.id, ...data };
    };
    prisma.ticket.create = async ({ data }) => ({
      id: 502,
      ...data,
      divisi: { id: 2, nama: 'Divisi IT & SIMRS' },
    });
    prisma.auditLog.create = async () => ({ id: 92 });

    const req = {
      user: { id: 3, role: 'KADIV', divisiId: 2, divisi: 'Divisi IT & SIMRS' },
      body: {
        tipe: 'LAPORAN_TUGAS_MANDIRI',
        ticketId: 77,
        judul: 'Perbaikan Spooler Printer Farmasi',
        lokasi: 'Instalasi Farmasi',
        deskripsi: 'Instal ulang driver printer thermal',
        divisiId: 2,
        fotoBukti: 'data:image/jpeg;base64,printerselesai',
        laporanPenyelesaian: 'Driver diperbarui dan test print berhasil.',
      },
    };
    const res = createMockRes();

    try {
      await createTicket(req, res);
      assert.equal(res.statusCode, 201);
      assert.ok(parentUpdatePayload);
      assert.equal(parentUpdatePayload.where.id, 77);
      assert.equal(parentUpdatePayload.data.status, 'SELESAI');
      assert.equal(parentUpdatePayload.data.pelaksanaId, 3);
      assert.equal(res.body.data.fotoInstruksi, 'data:image/jpeg;base64,printerawal');
    } finally {
      prisma.divisi.findUnique = originalDivisi;
      prisma.ticket.findUnique = originalTicketFind;
      prisma.ticket.update = originalTicketUpdate;
      prisma.ticket.create = originalTicketCreate;
      prisma.auditLog.create = originalAudit;
    }
  });

  it('6. Kadiv IT dapat langsung mengeskalasi Laporan Masalah IT dari MENUNGGU_TRIASE ke Direktur & menyelesaikan tugas mandiri', async () => {
    const originalFindUnique = prisma.ticket.findUnique;
    const originalUpdate = prisma.ticket.update;
    const originalAudit = prisma.auditLog.create;

    prisma.ticket.findUnique = async () => ({
      id: 89,
      judul: 'Penggantian Switch Core Server',
      jenisTiket: 'LAPORAN',
      status: 'MENUNGGU_TRIASE',
      divisiId: 2,
      pembuatId: 12,
      catatanRevisi: null,
    });
    prisma.ticket.update = async ({ data }) => ({ id: 89, divisiId: 2, ...data });
    prisma.auditLog.create = async () => ({ id: 95 });

    const req = {
      params: { id: '89' },
      user: { id: 3, role: 'KADIV', divisiId: 2, divisi: 'Divisi IT & SIMRS' },
      body: {
        status: 'HOLD_ESKALASI',
        catatanRevisi: '[Eskalasi KADIV ke DIREKTUR]: Butuh persetujuan pengadaan switch core 24 port.',
      },
    };
    const res = createMockRes();

    try {
      await updateTicketStatus(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.data.status, 'HOLD_ESKALASI');
    } finally {
      prisma.ticket.findUnique = originalFindUnique;
      prisma.ticket.update = originalUpdate;
      prisma.auditLog.create = originalAudit;
    }
  });

  it('7. getTicketOptions untuk Kadiv IT mengembalikan dirinya sendiri (bukan mencari Koordinator)', async () => {
    const originalDivisiMany = prisma.divisi.findMany;
    const originalUserMany = prisma.user.findMany;
    let capturedWherePelaksana = null;

    prisma.divisi.findMany = async () => [
      { id: 1, nama: 'Divisi Umum & Rumah Tangga' },
      { id: 2, nama: 'Divisi IT & SIMRS' },
    ];
    prisma.user.findMany = async ({ where }) => {
      capturedWherePelaksana = where;
      return [{ id: 3, nama: 'Kepala Divisi IT', role: 'KADIV', divisiId: 2 }];
    };

    const req = {
      user: { id: 3, role: 'KADIV', divisiId: 2, divisi: 'Divisi IT & SIMRS' },
      query: {},
    };
    const res = createMockRes();

    try {
      await getTicketOptions(req, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(capturedWherePelaksana, { id: 3 });
      assert.equal(res.body.pelaksana.length, 1);
      assert.equal(res.body.pelaksana[0].id, 3);
    } finally {
      prisma.divisi.findMany = originalDivisiMany;
      prisma.user.findMany = originalUserMany;
    }
  });

  it('8. Notifikasi Laporan Masalah baru untuk Divisi IT & SIMRS dikirim langsung ke Kadiv IT', async () => {
    const recipients = [];
    const mockDb = {
      divisi: {
        findUnique: async () => ({ nama: 'Divisi IT & SIMRS' }),
      },
      user: {
        findMany: async ({ where }) => {
          if (where.role === 'KADIV' && where.divisiId === 2) {
            return [{ id: 3 }];
          }
          return [{ id: 99 }];
        },
      },
    };

    await dispatchTicketNotifications(
      {
        previous: null,
        current: {
          id: 600,
          judul: 'Komputer Kasir Tidak Bisa Cetak Kwitansi',
          prioritas: 'HIGH',
          status: 'MENUNGGU_TRIASE',
          divisiId: 2,
        },
        actor: { id: 20, nama: 'Staf Kasir', role: 'STAF' },
      },
      {
        db: mockDb,
        notifyTicketEvent: async (evt) => {
          recipients.push(evt.recipientId);
          return { sent: true };
        },
      }
    );

    assert.deepEqual(recipients, [3]);
  });
});
