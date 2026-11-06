// Backend/tests/notificationLog.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  notifyTicketEvent,
  notifyDeadlineEvent,
  retryFailedNotifications,
} = require('../services/telegramService');

const {
  getNotificationLogs,
  retrySingleNotification,
  retryAllFailedNotifications,
  MAX_RETRY_ATTEMPTS,
} = require('../controllers/notificationLogController');

const {
  buildNotificationMessage,
  EVENT_TASK_ASSIGNED,
  EVENT_DIRECTIVE_ASSIGNED,
} = require('../services/ticketNotificationService');

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

describe('MODUL 5 – NOTIFICATION LOG TEST SUITE (18 Skenario UAT)', () => {

  // Skenario 1: Notifikasi berhasil dikirim -> status SENT dan sentAt terisi
  it('1. Notifikasi berhasil dikirim -> status SENT dan sentAt terisi', async () => {
    let capturedCreate = null;
    let capturedUpdate = null;

    const mockDb = {
      user: {
        findUnique: async () => ({ id: 10, nama: 'Budi', telegramChatId: '123456', role: 'STAF' }),
      },
      notificationLog: {
        findUnique: async () => null,
        create: async ({ data }) => {
          capturedCreate = data;
          return { id: 1, ...data };
        },
        update: async ({ data }) => {
          capturedUpdate = data;
          return { id: 1, ...data };
        },
      },
    };

    const mockSend = async (chatId, msg) => ({ message_id: 99 });

    const result = await notifyTicketEvent(
      {
        ticketId: 101,
        recipientId: 10,
        type: 'TASK_ASSIGNED',
        message: 'Tugas Baru #T-101',
        occurrenceToken: 'occ-1',
      },
      { prisma: mockDb, sendTelegramMessage: mockSend }
    );

    assert.equal(result.sent, true);
    assert.equal(capturedCreate.status, 'PENDING');
    assert.equal(capturedUpdate.status, 'SENT');
    assert.ok(capturedUpdate.sentAt instanceof Date);
    assert.equal(capturedUpdate.errorMessage, null);
  });

  // Skenario 2: Notifikasi gagal dikirim -> status FAILED dan errorMessage tersimpan
  it('2. Notifikasi gagal dikirim -> status FAILED dan errorMessage tersimpan', async () => {
    let capturedUpdate = null;

    const mockDb = {
      user: {
        findUnique: async () => ({ id: 10, nama: 'Budi', telegramChatId: '123456', role: 'STAF' }),
      },
      notificationLog: {
        findUnique: async () => null,
        create: async ({ data }) => ({ id: 2, ...data }),
        update: async ({ data }) => {
          capturedUpdate = data;
          return { id: 2, ...data };
        },
      },
    };

    const mockSend = async () => {
      throw new Error('Telegram bot blocked by user');
    };

    const result = await notifyTicketEvent(
      {
        ticketId: 102,
        recipientId: 10,
        type: 'TASK_ASSIGNED',
        message: 'Tugas Baru #T-102',
        occurrenceToken: 'occ-2',
      },
      { prisma: mockDb, sendTelegramMessage: mockSend }
    );

    assert.equal(result.sent, false);
    assert.equal(capturedUpdate.status, 'FAILED');
    assert.match(capturedUpdate.errorMessage, /Telegram bot blocked by user/);
  });

  // Skenario 3: Telegram API mengalami timeout -> dicatat sebagai kegagalan tanpa menghentikan thread
  it('3. Telegram API timeout dicatat sebagai kegagalan tanpa melempar unhandled error', async () => {
    let capturedUpdate = null;

    const mockDb = {
      user: {
        findUnique: async () => ({ id: 10, nama: 'Budi', telegramChatId: '123456', role: 'STAF' }),
      },
      notificationLog: {
        findUnique: async () => null,
        create: async ({ data }) => ({ id: 3, ...data }),
        update: async ({ data }) => {
          capturedUpdate = data;
          return { id: 3, ...data };
        },
      },
    };

    const mockSend = async () => {
      const err = new Error('The operation was aborted due to timeout');
      err.name = 'TimeoutError';
      throw err;
    };

    const result = await notifyTicketEvent(
      {
        ticketId: 103,
        recipientId: 10,
        type: 'TASK_ASSIGNED',
        message: 'Tugas #T-103',
        occurrenceToken: 'occ-3',
      },
      { prisma: mockDb, sendTelegramMessage: mockSend }
    );

    assert.equal(result.sent, false);
    assert.equal(capturedUpdate.status, 'FAILED');
    assert.match(capturedUpdate.errorMessage, /timeout/);
  });

  // Skenario 4: Telegram API mengembalikan error deskriptif -> pesan tersimpan
  it('4. Telegram API error deskriptif (misal chat not found) tersimpan di errorMessage', async () => {
    let capturedUpdate = null;

    const mockDb = {
      user: {
        findUnique: async () => ({ id: 11, nama: 'Siti', telegramChatId: '999999', role: 'STAF' }),
      },
      notificationLog: {
        findUnique: async () => null,
        create: async ({ data }) => ({ id: 4, ...data }),
        update: async ({ data }) => {
          capturedUpdate = data;
          return { id: 4, ...data };
        },
      },
    };

    const mockSend = async () => {
      throw new Error('Bad Request: chat not found');
    };

    const result = await notifyTicketEvent(
      {
        ticketId: 104,
        recipientId: 11,
        type: 'TASK_ASSIGNED',
        message: 'Tugas #T-104',
        occurrenceToken: 'occ-4',
      },
      { prisma: mockDb, sendTelegramMessage: mockSend }
    );

    assert.equal(result.sent, false);
    assert.equal(capturedUpdate.status, 'FAILED');
    assert.match(capturedUpdate.errorMessage, /chat not found/);
  });

  // Skenario 5: Retry berhasil setelah percobaan pertama gagal -> status beralih menjadi SENT
  it('5. Retry berhasil setelah percobaan pertama gagal -> status SENT dan attempts bertambah', async () => {
    let updatedLog = null;

    const mockDb = {
      notificationLog: {
        findMany: async () => [
          {
            id: 50,
            status: 'FAILED',
            attempts: 1,
            message: 'Tugas #T-105',
            telegramChatId: '555123',
            recipient: { id: 12, nama: 'Ahmad', telegramChatId: '555123' },
          },
        ],
        update: async ({ where, data }) => {
          updatedLog = { id: where.id, ...data };
          return updatedLog;
        },
      },
    };

    const mockSend = async (chatId, msg) => ({ message_id: 105 });

    const results = await retryFailedNotifications({
      prisma: mockDb,
      sendTelegramMessage: mockSend,
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].sent, true);
    assert.equal(updatedLog.status, 'SENT');
    assert.ok(updatedLog.sentAt instanceof Date);
    assert.equal(updatedLog.errorMessage, null);
  });

  // Skenario 6: Retry mencapai batas maksimal (3 kali) -> tidak diproses oleh scheduler
  it('6. Notifikasi yang mencapai batas maksimal percobaan (attempts >= 3) tidak dicoba lagi', async () => {
    let capturedFindArgs = null;

    const mockDb = {
      notificationLog: {
        findMany: async (args) => {
          capturedFindArgs = args;
          return []; // Query DB menyaring attempts < 3
        },
      },
    };

    const results = await retryFailedNotifications({
      prisma: mockDb,
      sendTelegramMessage: async () => {},
      maxAttempts: MAX_RETRY_ATTEMPTS,
    });

    assert.equal(results.length, 0);
    assert.equal(capturedFindArgs.where.attempts.lt, 3);
  });

  // Skenario 7: Notifikasi yang sudah berhasil (SENT) tidak dikirim ulang oleh retry
  it('7. Notifikasi berstatus SENT ditolak untuk dikirim ulang pada endpoint retry', async () => {
    const originalFindUnique = prisma.notificationLog.findUnique;
    prisma.notificationLog.findUnique = async () => ({
      id: 77,
      status: 'SENT',
      recipient: { id: 1, nama: 'User' },
    });

    const req = { params: { id: 77 } };
    const res = createMockRes();

    try {
      await retrySingleNotification(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /sudah berhasil terkirim sebelumnya/);
    } finally {
      prisma.notificationLog.findUnique = originalFindUnique;
    }
  });

  // Skenario 8: Event yang sama dengan dedupeKey identik tidak menghasilkan notifikasi ganda
  it('8. Event dengan dedupeKey yang sudah SENT langsung di-skip (duplicate: true)', async () => {
    const mockDb = {
      user: {
        findUnique: async () => ({ id: 10, nama: 'Budi', telegramChatId: '123456', role: 'STAF' }),
      },
      notificationLog: {
        findUnique: async () => ({
          id: 88,
          status: 'SENT',
          dedupeKey: 'ticket:108:TASK_ASSIGNED:occ-8:10',
        }),
      },
    };

    let sendCalled = false;
    const mockSend = async () => { sendCalled = true; };

    const result = await notifyTicketEvent(
      {
        ticketId: 108,
        recipientId: 10,
        type: 'TASK_ASSIGNED',
        message: 'Tugas #T-108',
        occurrenceToken: 'occ-8',
      },
      { prisma: mockDb, sendTelegramMessage: mockSend }
    );

    assert.equal(result.duplicate, true);
    assert.equal(sendCalled, false);
  });

  // Skenario 9: Dua proses paralel yang mencoba membuat notifikasi dengan dedupeKey sama ditangani aman
  it('9. Error P2002 (Unique constraint violation) ditangani secara aman sebagai duplikasi', async () => {
    const mockDb = {
      user: {
        findUnique: async () => ({ id: 10, nama: 'Budi', telegramChatId: '123456', role: 'STAF' }),
      },
      notificationLog: {
        findUnique: async () => null, // Simulasi race condition: findUnique null pada milidetik yang sama
        create: async () => {
          const err = new Error('Unique constraint failed on dedupeKey');
          err.code = 'P2002';
          throw err;
        },
      },
    };

    const result = await notifyTicketEvent(
      {
        ticketId: 109,
        recipientId: 10,
        type: 'TASK_ASSIGNED',
        message: 'Tugas #T-109',
        occurrenceToken: 'occ-9',
      },
      { prisma: mockDb, sendTelegramMessage: async () => {} }
    );

    assert.equal(result.duplicate, true);
  });

  // Skenario 10: Notifikasi berstatus PENDING saat backend restart tidak menimbulkan duplikasi
  it('10. Log dengan status PENDING tidak dikirim ganda', async () => {
    const mockDb = {
      user: {
        findUnique: async () => ({ id: 10, nama: 'Budi', telegramChatId: '123456', role: 'STAF' }),
      },
      notificationLog: {
        findUnique: async () => ({
          id: 110,
          status: 'PENDING',
          dedupeKey: 'ticket:110:TASK_ASSIGNED:occ-10:10',
        }),
      },
    };

    const result = await notifyTicketEvent(
      {
        ticketId: 110,
        recipientId: 10,
        type: 'TASK_ASSIGNED',
        message: 'Tugas #T-110',
        occurrenceToken: 'occ-10',
      },
      { prisma: mockDb, sendTelegramMessage: async () => {} }
    );

    assert.equal(result.duplicate, true);
  });

  // Skenario 11: Kegagalan satu notifikasi tidak menghentikan notifikasi lainnya
  it('11. Kegagalan notifikasi satu penerima tidak memutus antrean notifikasi lainnya', async () => {
    let secondSent = false;

    const mockDb = {
      notificationLog: {
        findMany: async () => [
          {
            id: 111,
            status: 'FAILED',
            attempts: 1,
            message: 'Tugas 1',
            telegramChatId: '111',
            recipient: { id: 1, telegramChatId: '111' },
          },
          {
            id: 112,
            status: 'FAILED',
            attempts: 1,
            message: 'Tugas 2',
            telegramChatId: '222',
            recipient: { id: 2, telegramChatId: '222' },
          },
        ],
        update: async ({ where, data }) => {
          if (where.id === 112 && data.status === 'SENT') secondSent = true;
          return { id: where.id, ...data };
        },
      },
    };

    const mockSend = async (chatId) => {
      if (chatId === '111') throw new Error('Telegram fail');
      return { ok: true };
    };

    const results = await retryFailedNotifications({
      prisma: mockDb,
      sendTelegramMessage: mockSend,
    });

    assert.equal(results.length, 2);
    assert.equal(results[0].sent, false);
    assert.equal(results[1].sent, true);
    assert.equal(secondSent, true);
  });

  // Skenario 12: Reminder deadline Modul 1 tercatat secara akurat
  it('12. notifyDeadlineEvent mencatat log DEADLINE_SOON dengan occurrenceToken batas waktu', async () => {
    let capturedLog = null;

    const deadlineDate = new Date('2026-11-10T12:00:00Z');

    const mockDb = {
      user: {
        findUnique: async () => ({ id: 15, nama: 'Dedi', telegramChatId: '777888', role: 'STAF' }),
      },
      notificationLog: {
        findUnique: async () => null,
        create: async ({ data }) => {
          capturedLog = data;
          return { id: 120, ...data };
        },
        update: async ({ data }) => ({ id: 120, ...data }),
      },
    };

    const result = await notifyDeadlineEvent(
      {
        ticket: { id: 120, deadline: deadlineDate },
        recipient: { id: 15 },
        type: 'DEADLINE_SOON',
        message: 'Pengingat: Tugas mendekati deadline!',
      },
      { prisma: mockDb, sendTelegramMessage: async () => ({ ok: true }) }
    );

    assert.equal(result.sent, true);
    assert.equal(capturedLog.type, 'DEADLINE_SOON');
    assert.ok(capturedLog.dedupeKey.includes(deadlineDate.toISOString()));
  });

  // Skenario 13: Event Modul 2 (misal TASK_ASSIGNED) tercatat secara akurat
  it('13. Event Modul 2 tercatat lengkap pada NotificationLog', async () => {
    let capturedLog = null;

    const mockDb = {
      user: {
        findUnique: async () => ({ id: 16, nama: 'Rian', telegramChatId: '888999', role: 'STAF' }),
      },
      notificationLog: {
        findUnique: async () => null,
        create: async ({ data }) => {
          capturedLog = data;
          return { id: 130, ...data };
        },
        update: async ({ data }) => ({ id: 130, ...data }),
      },
    };

    await notifyTicketEvent(
      {
        ticketId: 130,
        recipientId: 16,
        type: EVENT_TASK_ASSIGNED,
        message: 'Tugas Baru Telah Ditugaskan',
        occurrenceToken: 'assign:1',
      },
      { prisma: mockDb, sendTelegramMessage: async () => ({ ok: true }) }
    );

    assert.equal(capturedLog.ticketId, 130);
    assert.equal(capturedLog.type, EVENT_TASK_ASSIGNED);
    assert.equal(capturedLog.recipientId, 16);
  });

  // Skenario 14: Penerima notifikasi tervalidasi sesuai role
  it('14. DIRECTIVE_ASSIGNED diterbitkan ke Koordinator yang sah', () => {
    const msg = buildNotificationMessage({
      type: EVENT_DIRECTIVE_ASSIGNED,
      ticket: { id: 140, judul: 'Optimalisasi Rawat Inap', prioritas: 'HIGH' },
      actor: { role: 'KADIV', nama: 'Kadiv Medis' },
    });

    assert.match(msg, /NOTIFIKASI ARAHAN DIVISI/);
    assert.match(msg, /Optimalisasi Rawat Inap/);
    assert.match(msg, /Kepala Divisi telah menerbitkan arahan/);
  });

  // Skenario 15: Pengguna non-admin ditolak (HTTP 403) saat mengakses log notifikasi
  it('15. Pengguna non-admin (Kadiv/Koordinator/Staf) ditolak 403 oleh route middleware', () => {
    const { checkRole } = require('../middlewares/authMiddleware');
    const middleware = checkRole(['ADMIN']);

    const req = { user: { id: 5, role: 'KADIV' } };
    const res = createMockRes();
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /Akses Ditolak/);
    assert.equal(nextCalled, false);
  });

  // Skenario 16: Pengguna non-admin ditolak saat mencoba memicu retry
  it('16. Staf ditolak 403 saat mencoba memicu retry manual', () => {
    const { checkRole } = require('../middlewares/authMiddleware');
    const middleware = checkRole(['ADMIN']);

    const req = { user: { id: 20, role: 'STAF' } };
    const res = createMockRes();
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });

  // Skenario 17: Pengaturan admin (isNotificationTypeEnabled: false) ditaati oleh sistem
  it('17. Notifikasi dilewati jika tipe notifikasi dinonaktifkan di konfigurasi', async () => {
    const originalEnv = process.env.NOTIFY_TASK_ASSIGNED_ENABLED;
    process.env.NOTIFY_TASK_ASSIGNED_ENABLED = 'false';

    try {
      const result = await notifyTicketEvent(
        {
          ticketId: 170,
          recipientId: 10,
          type: 'TASK_ASSIGNED',
          message: 'Tugas',
          occurrenceToken: 'occ-17',
        },
        { prisma: {}, sendTelegramMessage: async () => {} }
      );

      assert.equal(result.skipped, true);
      assert.equal(result.reason, 'DISABLED');
    } finally {
      if (originalEnv !== undefined) {
        process.env.NOTIFY_TASK_ASSIGNED_ENABLED = originalEnv;
      } else {
        delete process.env.NOTIFY_TASK_ASSIGNED_ENABLED;
      }
    }
  });

  // Skenario 18: Pesan notifikasi dan log terverifikasi bebas dari informasi medis/pasien
  it('18. Pesan notifikasi bebas dari informasi medis atau data pasien (Zero RME)', () => {
    const msg = buildNotificationMessage({
      type: EVENT_TASK_ASSIGNED,
      ticket: {
        id: 180,
        judul: 'Pembersihan Filter AC Poli Anak',
        prioritas: 'MEDIUM',
        deadline: new Date().toISOString(),
      },
      actor: { role: 'KOORDINATOR', nama: 'Koor Sarpras' },
    });

    assert.equal(msg.includes('pasien'), false);
    assert.equal(msg.includes('rekam_medis'), false);
    assert.equal(msg.includes('diagnosa'), false);
    assert.match(msg, /Pembersihan Filter AC Poli Anak/);
  });

});
