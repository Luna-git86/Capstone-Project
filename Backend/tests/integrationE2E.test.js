// Backend/tests/integrationE2E.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  triageTicket,
} = require('../controllers/ticketController');

const {
  getLaporanSLA,
  getSlaReportData,
} = require('../controllers/slaController');

const {
  notifyTicketEvent,
  notifyDeadlineEvent,
  retryFailedNotifications,
} = require('../services/telegramService');

const {
  classifyDeadlineTicket,
  checkDeadlines,
} = require('../services/deadlineCheckService');

const {
  planTicketNotificationEvents,
  buildNotificationMessage,
  buildDedupeKey,
} = require('../services/ticketNotificationService');

const systemConfigStore = require('../config/systemConfigStore');
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

describe('MODUL 1–6: PENGUJIAN INTEGRASI & END-TO-END (7 SKENARIO BISNIS)', () => {

  // =========================================================================
  // SKENARIO 1 — ALUR NORMAL TIKET
  // =========================================================================
  it('SKENARIO 1: Alur Normal Tiket (Direktur -> Kadiv -> Koordinator -> Staf -> Submit -> Verifikasi -> SLA -> Audit)', async () => {
    // 1. Kadiv membuat arahan untuk Koordinator
    const mockArahan = {
      id: 101,
      judul: 'Arahan Kalibrasi Alat Medis',
      divisiId: 1,
      dibuatOlehId: 2, // Kadiv
      pelaksanaId: 3, // Koordinator
      penanggungJawabId: 2,
      status: 'DIPROSES',
      kategori: 'ARAHAN_DIVISI',
    };

    // 2. Koordinator memecah arahan menjadi tiket operasional untuk Staf
    const mockTiketOperasional = {
      id: 201,
      parentTicketId: 101,
      judul: 'Pemeriksaan Kalibrasi Mesin USG Ruang Poli',
      divisiId: 1,
      dibuatOlehId: 3, // Koordinator
      pelaksanaId: 4, // Staf
      penanggungJawabId: 3, // Koordinator sebagai pemeriksa
      prioritas: 'SEDANG',
      status: 'DIPROSES',
      deadline: new Date(Date.now() + 24 * 3600 * 1000), // besok
      completedAt: null,
    };

    // 3. Notifikasi penugasan TASK_ASSIGNED dikirim ke Staf
    const plannedEvents = planTicketNotificationEvents({
      previous: null,
      current: mockTiketOperasional,
      actor: { id: 3, role: 'KOORDINATOR' },
    });
    assert.equal(plannedEvents.length, 1);
    assert.equal(plannedEvents[0].type, 'TASK_ASSIGNED');
    assert.equal(plannedEvents[0].recipientId, 4);

    // 4. Staf melakukan submission tugas untuk diperiksa
    const submissionTime = new Date();
    const updatedSubmitted = {
      ...mockTiketOperasional,
      status: 'MENUNGGU_VALIDASI',
      updatedAt: submissionTime,
      auditLogs: [
        {
          id: 1,
          action: 'STATUS_CHANGED',
          details: 'Perubahan status tiket dari DIPROSES menjadi MENUNGGU_VALIDASI. Catatan: Hasil kalibrasi normal',
          createdAt: submissionTime,
        },
      ],
    };

    // Notifikasi TASK_SUBMITTED dikirim ke Koordinator
    const submitEvents = planTicketNotificationEvents({
      previous: mockTiketOperasional,
      current: updatedSubmitted,
      actor: { id: 4, role: 'STAF' },
    });
    assert.equal(submitEvents.length, 1);
    assert.equal(submitEvents[0].type, 'TASK_SUBMITTED');
    assert.equal(submitEvents[0].recipientId, 3); // Koordinator pemeriksa

    // 5. Koordinator memverifikasi tugas menjadi SELESAI
    const verifyTime = new Date(submissionTime.getTime() + 1800 * 1000); // 30 menit kemudian
    const finalTicket = {
      ...updatedSubmitted,
      status: 'SELESAI',
      completedAt: verifyTime,
    };

    // Notifikasi TASK_VERIFIED dikirim ke Staf
    const verifyEvents = planTicketNotificationEvents({
      previous: updatedSubmitted,
      current: finalTicket,
      actor: { id: 3, role: 'KOORDINATOR' },
    });
    assert.equal(verifyEvents.length, 1);
    assert.equal(verifyEvents[0].type, 'TASK_VERIFIED');
    assert.equal(verifyEvents[0].recipientId, 4); // Staf pelaksana

    // 6. Validasi Laporan SLA menghitung berbasis submissionTime (tepat waktu)
    const originalFindMany = prisma.ticket.findMany;
    prisma.ticket.findMany = async () => [finalTicket];

    try {
      const slaData = await getSlaReportData({
        user: { id: 1, role: 'DIREKTUR' },
        query: { divisiId: '1' },
      });
      assert.equal(slaData.data.length, 1);
      assert.equal(slaData.data[0].id, 201);
      assert.equal(slaData.data[0].statusSLA, 'SESUAI_SLA');
    } finally {
      prisma.ticket.findMany = originalFindMany;
    }
  });

  // =========================================================================
  // SKENARIO 2 — ALUR REVISI
  // =========================================================================
  it('SKENARIO 2: Alur Revisi (Submit -> Revisi diminta -> Notifikasi -> Perbaikan -> Submit Ulang -> Verifikasi)', async () => {
    const tiketAwal = {
      id: 202,
      judul: 'Pembersihan AC Ruang OK',
      pelaksanaId: 4, // Staf
      penanggungJawabId: 3, // Koordinator
      status: 'MENUNGGU_VALIDASI',
      deadline: new Date(Date.now() + 12 * 3600 * 1000),
    };

    // 1. Koordinator meminta revisi (kembali ke DIPROSES)
    const tiketRevisi = {
      ...tiketAwal,
      status: 'DIPROSES',
      updatedAt: new Date(),
    };

    const revisiEvents = planTicketNotificationEvents({
      previous: tiketAwal,
      current: tiketRevisi,
      actor: { id: 3, role: 'KOORDINATOR' },
    });

    assert.equal(revisiEvents.length, 1);
    assert.equal(revisiEvents[0].type, 'TASK_REVISION_REQUIRED');
    assert.equal(revisiEvents[0].recipientId, 4); // Staf menerima notif revisi

    // Pesan notifikasi menyertakan konteks revisi
    const msg = buildNotificationMessage({
      type: revisiEvents[0].type,
      ticket: tiketRevisi,
      actor: { nama: 'Koordinator Fulan' },
    });
    assert.ok(msg.includes('REVISI'));

    // 2. Staf memperbaiki dan submit ulang
    const resubmitTime = new Date();
    const tiketResubmit = {
      ...tiketRevisi,
      status: 'MENUNGGU_VALIDASI',
      updatedAt: resubmitTime,
      auditLogs: [
        {
          id: 2,
          action: 'STATUS_CHANGED',
          details: 'Perubahan status tiket dari DIPROSES menjadi MENUNGGU_VALIDASI. Catatan: Filter AC sudah diganti baru',
          createdAt: resubmitTime,
        },
      ],
    };

    // Koordinator diverifikasi
    const tiketSelesai = {
      ...tiketResubmit,
      status: 'SELESAI',
      completedAt: new Date(resubmitTime.getTime() + 600 * 1000),
    };

    // SLA dihitung berbasis resubmitTime
    const originalFindMany = prisma.ticket.findMany;
    prisma.ticket.findMany = async () => [tiketSelesai];
    try {
      const slaData = await getSlaReportData({
        user: { id: 1, role: 'DIREKTUR' },
        query: { divisiId: '1' },
      });
      assert.equal(slaData.data.length, 1);
      assert.equal(slaData.data[0].statusSLA, 'SESUAI_SLA');
    } finally {
      prisma.ticket.findMany = originalFindMany;
    }
  });

  // =========================================================================
  // SKENARIO 3 — DEADLINE DAN OVERDUE
  // =========================================================================
  it('SKENARIO 3: Deadline dan Overdue (Pendeteksian Mendekati Deadline, Overdue, dan Pengecualian Tiket Validasi/Selesai)', async () => {
    const now = new Date();

    // 1. Tiket aktif mendekati deadline (5 jam lagi)
    const tiketMendekati = {
      id: 301,
      judul: 'Perawatan Genset',
      status: 'DIPROSES',
      pelaksanaId: 4,
      deadline: new Date(now.getTime() + 5 * 3600 * 1000),
    };
    const hasilMendekati = classifyDeadlineTicket(tiketMendekati, now, 24);
    assert.equal(hasilMendekati.action, 'DEADLINE_SOON');

    // 2. Tiket aktif sudah lewat deadline (2 jam yang lalu)
    const tiketOverdue = {
      id: 302,
      judul: 'Kalibrasi Timbangan',
      status: 'DIPROSES',
      pelaksanaId: 4,
      deadline: new Date(now.getTime() - 2 * 3600 * 1000),
    };
    const hasilOverdue = classifyDeadlineTicket(tiketOverdue, now, 24);
    assert.equal(hasilOverdue.action, 'OVERDUE');

    // 3. Tiket MENUNGGU_VALIDASI yang lewat deadline TIDAK dianggap overdue (IN_REVIEW)
    const tiketMenunggu = {
      id: 303,
      judul: 'Laporan Sanitasi',
      status: 'MENUNGGU_VALIDASI',
      pelaksanaId: 4,
      deadline: new Date(now.getTime() - 2 * 3600 * 1000),
    };
    const hasilMenunggu = classifyDeadlineTicket(tiketMenunggu, now, 24);
    assert.equal(hasilMenunggu.action, 'SKIP');
    assert.equal(hasilMenunggu.reason, 'IN_REVIEW');

    // 4. Tiket SELESAI tidak mendapatkan pengingat maupun overdue (INACTIVE)
    const tiketSelesai = {
      id: 304,
      judul: 'Penggantian Bohlam Poli',
      status: 'SELESAI',
      pelaksanaId: 4,
      deadline: new Date(now.getTime() - 2 * 3600 * 1000),
    };
    const hasilSelesai = classifyDeadlineTicket(tiketSelesai, now, 24);
    assert.equal(hasilSelesai.action, 'SKIP');
    assert.equal(hasilSelesai.reason, 'INACTIVE');
  });

  // =========================================================================
  // SKENARIO 4 — PERPINDAHAN PELAKSANA
  // =========================================================================
  it('SKENARIO 4: Perpindahan Pelaksana (Reassignment -> Staf Baru Dapat Notifikasi, Staf Lama Dikeluarkan)', async () => {
    const tiketAwal = {
      id: 401,
      judul: 'Perbaikan Jaringan LAN IGD',
      pelaksanaId: 4, // Staf A
      penanggungJawabId: 3,
      status: 'DIPROSES',
    };

    const tiketDialihkan = {
      ...tiketAwal,
      pelaksanaId: 5, // Dialihkan ke Staf B
      updatedAt: new Date(),
    };

    const events = planTicketNotificationEvents({
      previous: tiketAwal,
      current: tiketDialihkan,
      actor: { id: 3, role: 'KOORDINATOR' },
    });

    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'TASK_REASSIGNED');
    assert.equal(events[0].recipientId, 5); // Hanya dikirim ke Staf B (pelaksana baru)
    assert.notEqual(events[0].recipientId, 4); // Staf lama tidak menerima tugas aktif
  });

  // =========================================================================
  // SKENARIO 5 — ESKALASI
  // =========================================================================
  it('SKENARIO 5: Alur Eskalasi (Pelaporan Kendala -> HOLD_ESKALASI -> Kadiv Menerima Notifikasi)', async () => {
    const tiketOperasional = {
      id: 501,
      judul: 'Penggantian Kompresor Chiller RS',
      pelaksanaId: 4,
      penanggungJawabId: 2, // Kadiv yang dituju
      status: 'DIPROSES',
    };

    const tiketEskalasi = {
      ...tiketOperasional,
      status: 'HOLD_ESKALASI',
      updatedAt: new Date(),
    };

    const events = planTicketNotificationEvents(
      {
        previous: tiketOperasional,
        current: tiketEskalasi,
        actor: { id: 3, role: 'KOORDINATOR' },
      },
      { includeEscalation: true }
    );

    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'TASK_ESCALATED');
    assert.equal(events[0].recipientId, 2); // Kadiv menerima notifikasi eskalasi

    const msg = buildNotificationMessage({
      type: events[0].type,
      ticket: tiketEskalasi,
      actor: { nama: 'Koordinator Fulan' },
    });
    assert.ok(msg.includes('ESKALASI'));
  });

  // =========================================================================
  // SKENARIO 6 — ISOLASI DATA
  // =========================================================================
  it('SKENARIO 6: Isolasi Data (Kadiv Terisolasi pada Divisinya, Ditolak Lintas Divisi, Direktur Akses Seluruh Divisi)', async () => {
    // 1. Kadiv Divisi 1 mencoba memfilter divisi 2 via query params
    const originalFindMany = prisma.ticket.findMany;
    let capturedWhere = null;
    prisma.ticket.findMany = async (args) => {
      capturedWhere = args.where;
      return [];
    };

    try {
      // Kadiv Divisi 1 request
      const reqKadiv = {
        user: { id: 2, role: 'KADIV', divisiId: 1 },
        query: { divisiId: '2' }, // Mencoba manipulasi divisi
      };
      const resKadiv = createMockRes();
      await getTickets(reqKadiv, resKadiv);

      // Backend tetap memaksa divisiId Kadiv miliknya sendiri (1), mengabaikan query param '2'
      const hasKadivDivisiCondition = capturedWhere.OR?.some((cond) => cond.divisiId === 1);
      const hasSpoofedDivisiCondition = capturedWhere.OR?.some((cond) => cond.divisiId === 2);
      assert.equal(hasKadivDivisiCondition, true);
      assert.equal(hasSpoofedDivisiCondition, false);

      // 2. Kadiv mencoba mengakses detail tiket divisi lain -> Ditolak 403
      const originalFindUnique = prisma.ticket.findUnique;
      prisma.ticket.findUnique = async () => ({
        id: 601,
        divisiId: 2, // Tiket milik divisi 2
        pelaksanaId: 99,
        penanggungJawabId: 98,
      });

      const reqDetail = {
        user: { id: 2, role: 'KADIV', divisiId: 1 },
        params: { id: '601' },
      };
      const resDetail = createMockRes();
      await getTicketById(reqDetail, resDetail);
      assert.equal(resDetail.statusCode, 403);

      prisma.ticket.findUnique = originalFindUnique;

      // 3. Direktur membaca seluruh tiket lintas divisi
      const reqDirektur = {
        user: { id: 1, role: 'DIREKTUR', divisiId: null },
        query: {},
      };
      const resDirektur = createMockRes();
      await getTickets(reqDirektur, resDirektur);
      assert.deepEqual(capturedWhere, {}); // Bebas tanpa batasan divisi
    } finally {
      prisma.ticket.findMany = originalFindMany;
    }
  });

  // =========================================================================
  // SKENARIO 7 — KETAHANAN SISTEM
  // =========================================================================
  it('SKENARIO 7: Ketahanan Sistem (Telegram Gagal -> Transaksi Tiket Tetap Jalan -> FAILED di Log -> Retry Sukses)', async () => {
    let logCreated = null;
    let logUpdated = null;

    const mockDb = {
      user: {
        findUnique: async () => ({ id: 4, nama: 'Staf Uji', telegramChatId: '12345678', role: 'STAF' }),
      },
      notificationLog: {
        findUnique: async () => null,
        create: async ({ data }) => {
          logCreated = { id: 701, ...data };
          return logCreated;
        },
        update: async ({ data }) => {
          logUpdated = { ...logCreated, ...data };
          return logUpdated;
        },
      },
    };

    // 1. Simulasi Telegram down
    const failingSender = async () => {
      throw new Error('Telegram Gateway Timeout (504)');
    };

    const notifResult = await notifyTicketEvent(
      {
        ticketId: 701,
        recipientId: 4,
        type: 'TASK_ASSIGNED',
        message: 'Tugas Baru Uji',
        occurrenceToken: 'test-token-7',
      },
      {
        prisma: mockDb,
        sendTelegramMessage: failingSender,
      }
    );

    // Sistem tidak crash, result sent: false
    assert.equal(notifResult.sent, false);
    assert.equal(logUpdated.status, 'FAILED');
    assert.ok(logUpdated.errorMessage.includes('504'));

    // 2. Simulasi Retry setelah koneksi pulih
    const successSender = async () => ({ message_id: 9999 });
    const mockDbRetry = {
      notificationLog: {
        findMany: async () => [
          {
            id: 701,
            message: 'Tugas Baru Uji',
            telegramChatId: '12345678',
            attempts: 1,
            recipient: { id: 4, nama: 'Staf Uji', telegramChatId: '12345678' },
          },
        ],
        update: async ({ data }) => {
          logUpdated = { ...logUpdated, ...data };
          return logUpdated;
        },
      },
    };

    const retryResults = await retryFailedNotifications({
      prisma: mockDbRetry,
      sendTelegramMessage: successSender,
    });

    assert.equal(retryResults.length, 1);
    assert.equal(retryResults[0].sent, true);
    assert.equal(logUpdated.status, 'SENT');
  });

});
