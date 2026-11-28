const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  EVENT_TASK_ASSIGNED,
  EVENT_TASK_REASSIGNED,
  EVENT_TASK_SUBMITTED,
  EVENT_TASK_REVISION_REQUIRED,
  EVENT_TASK_VERIFIED,
  planTicketNotificationEvents,
  buildNotificationMessage,
  dispatchTicketNotifications,
} = require('../services/ticketNotificationService');

const NOW = new Date('2026-11-02T10:00:00.000Z');

function baseTicket(overrides = {}) {
  return {
    id: 7,
    judul: 'Perbaikan fasilitas ruangan',
    prioritas: 'HIGH',
    status: 'DIPROSES',
    deadline: NOW,
    pelaksanaId: 50,
    penanggungJawabId: 20,
    catatanRevisi: null,
    lokasi: 'IGD',
    deskripsi: 'Perbaikan dengan data nonmedis',
    laporanPenyelesaian: 'Sudah dikerjakan',
    fotoBukti: 'data:image/png;base64,xxx',
    updatedAt: NOW,
    ...overrides,
  };
}

describe('planTicketNotificationEvents', () => {
  it('mengirim TASK_ASSIGNED hanya kepada staf yang ditugaskan', () => {
    const events = planTicketNotificationEvents({
      previous: null,
      current: baseTicket(),
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, EVENT_TASK_ASSIGNED);
    assert.equal(events[0].recipientId, 50);
  });

  it('reassignment hanya menotifikasi pelaksana baru', () => {
    const events = planTicketNotificationEvents({
      previous: baseTicket({ pelaksanaId: 50, status: 'DIPROSES' }),
      current: baseTicket({ pelaksanaId: 77, status: 'DIPROSES' }),
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, EVENT_TASK_REASSIGNED);
    assert.equal(events[0].recipientId, 77);
    assert.notEqual(events[0].recipientId, 50);
  });

  it('submit pemeriksaan menotifikasi penanggung jawab, bukan pelaksana', () => {
    const events = planTicketNotificationEvents({
      previous: baseTicket({ status: 'DIPROSES' }),
      current: baseTicket({
        status: 'MENUNGGU_VALIDASI',
        updatedAt: new Date('2026-11-02T11:00:00.000Z'),
      }),
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].type, EVENT_TASK_SUBMITTED);
    assert.equal(events[0].recipientId, 20);
  });

  it('revisi menotifikasi pelaksana', () => {
    const events = planTicketNotificationEvents({
      previous: baseTicket({ status: 'MENUNGGU_VALIDASI' }),
      current: baseTicket({
        status: 'DIPROSES',
        catatanRevisi: 'Perbaiki foto bukti',
        updatedAt: new Date('2026-11-02T12:00:00.000Z'),
      }),
    });
    assert.equal(events[0].type, EVENT_TASK_REVISION_REQUIRED);
    assert.equal(events[0].recipientId, 50);
  });

  it('verifikasi menotifikasi pelaksana', () => {
    const events = planTicketNotificationEvents({
      previous: baseTicket({ status: 'MENUNGGU_VALIDASI' }),
      current: baseTicket({
        status: 'SELESAI',
        updatedAt: new Date('2026-11-02T13:00:00.000Z'),
      }),
    });
    assert.equal(events[0].type, EVENT_TASK_VERIFIED);
    assert.equal(events[0].recipientId, 50);
  });

  it('perubahan status yang sama tidak merencanakan event berulang', () => {
    const ticket = baseTicket({ status: 'DIPROSES' });
    const events = planTicketNotificationEvents({
      previous: ticket,
      current: { ...ticket },
    });
    assert.deepEqual(events, []);
  });

  it('HOLD_ESKALASI tidak memicu event Modul 2', () => {
    const events = planTicketNotificationEvents({
      previous: baseTicket({ status: 'DIPROSES' }),
      current: baseTicket({ status: 'HOLD_ESKALASI' }),
    });
    assert.deepEqual(events, []);
  });
});

describe('buildNotificationMessage', () => {
  it('tidak memuat data pasien, RME, lokasi, atau bukti', () => {
    const message = buildNotificationMessage({
      type: EVENT_TASK_ASSIGNED,
      ticket: baseTicket(),
    });
    assert.match(message, /\[NOTIFIKASI TUGAS BARU\]/);
    assert.match(message, /#T-007/);
    assert.match(message, /Perbaikan fasilitas ruangan/);
    assert.match(message, /HIGH/);
    assert.doesNotMatch(message, /pasien|RME|rekam medis|diagnosis|IGD|data:image|Sudah dikerjakan/i);
  });

  it('menyertakan catatan revisi hanya pada event revisi', () => {
    const ticket = baseTicket({ catatanRevisi: 'Lengkapi dokumentasi' });
    const revision = buildNotificationMessage({
      type: EVENT_TASK_REVISION_REQUIRED,
      ticket,
    });
    const assigned = buildNotificationMessage({
      type: EVENT_TASK_ASSIGNED,
      ticket,
    });
    assert.match(revision, /Lengkapi dokumentasi/);
    assert.doesNotMatch(assigned, /Lengkapi dokumentasi/);
  });
});

describe('dispatchTicketNotifications', () => {
  it('kegagalan satu penerima tidak menghentikan penerima lain', async () => {
    const sent = [];
    const results = await dispatchTicketNotifications(
      {
        previous: baseTicket({ pelaksanaId: 50, status: 'DIPROSES' }),
        current: baseTicket({
          pelaksanaId: 77,
          status: 'MENUNGGU_VALIDASI',
          updatedAt: new Date('2026-11-02T14:00:00.000Z'),
        }),
      },
      {
        notifyTicketEvent: async (payload) => {
          if (payload.recipientId === 77) {
            throw new Error('Telegram timeout');
          }
          sent.push(payload.recipientId);
          return { sent: true };
        },
      }
    );

    assert.equal(results.length, 2);
    assert.equal(results[0].result.sent, false);
    assert.deepEqual(sent, [20]);
    assert.equal(results[1].type, EVENT_TASK_SUBMITTED);
  });
});
