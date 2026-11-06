const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyDeadlineTicket,
  checkDeadlines,
  EVENT_DEADLINE_SOON,
  EVENT_OVERDUE,
} = require('../services/deadlineCheckService');

const NOW = new Date('2026-11-02T10:00:00.000Z');
const HOURS = 24;

function hoursFromNow(hours) {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000);
}

function ticket(overrides = {}) {
  return {
    id: 1,
    judul: 'Perbaikan AC',
    prioritas: 'HIGH',
    status: 'DIPROSES',
    deadline: hoursFromNow(2),
    pelaksanaId: 50,
    pelaksana: { id: 50, nama: 'Staf IT', telegramChatId: '111' },
    pembuat: { id: 9, nama: 'Pembuat', telegramChatId: '999' },
    ...overrides,
  };
}

describe('classifyDeadlineTicket', () => {
  it('mendeteksi tiket aktif yang mendekati deadline', () => {
    const result = classifyDeadlineTicket(ticket(), NOW, HOURS);
    assert.equal(result.action, EVENT_DEADLINE_SOON);
  });

  it('mendeteksi tiket aktif yang melewati deadline sebagai overdue', () => {
    const result = classifyDeadlineTicket(
      ticket({ deadline: hoursFromNow(-1) }),
      NOW,
      HOURS
    );
    assert.equal(result.action, EVENT_OVERDUE);
  });

  it('tidak menandai tiket selesai sebagai overdue', () => {
    const result = classifyDeadlineTicket(
      ticket({ status: 'SELESAI', deadline: hoursFromNow(-2) }),
      NOW,
      HOURS
    );
    assert.deepEqual(result, { action: 'SKIP', reason: 'INACTIVE' });
  });

  it('tidak memproses tiket ditolak', () => {
    const result = classifyDeadlineTicket(
      ticket({ status: 'DITOLAK', deadline: hoursFromNow(-2) }),
      NOW,
      HOURS
    );
    assert.equal(result.reason, 'INACTIVE');
  });

  it('tidak menandai tiket menunggu validasi sebagai overdue', () => {
    const result = classifyDeadlineTicket(
      ticket({ status: 'MENUNGGU_VALIDASI', deadline: hoursFromNow(-3) }),
      NOW,
      HOURS
    );
    assert.deepEqual(result, { action: 'SKIP', reason: 'IN_REVIEW' });
  });

  it('melewati tiket tanpa deadline', () => {
    const result = classifyDeadlineTicket(ticket({ deadline: null }), NOW, HOURS);
    assert.deepEqual(result, { action: 'SKIP', reason: 'NO_DEADLINE' });
  });

  it('melewati tiket tanpa pelaksana', () => {
    const result = classifyDeadlineTicket(
      ticket({ pelaksanaId: null, pelaksana: null, deadline: hoursFromNow(-1) }),
      NOW,
      HOURS
    );
    assert.equal(result.reason, 'NO_ASSIGNEE');
  });

  it('tetap memeriksa HOLD_ESKALASI yang overdue', () => {
    const result = classifyDeadlineTicket(
      ticket({ status: 'HOLD_ESKALASI', deadline: hoursFromNow(-1) }),
      NOW,
      HOURS
    );
    assert.equal(result.action, EVENT_OVERDUE);
  });
});

describe('checkDeadlines', () => {
  it('memproses banyak tiket dengan deadline berbeda dan mengirim ke pelaksana', async () => {
    const tickets = [
      ticket({ id: 1, deadline: hoursFromNow(2) }),
      ticket({ id: 2, deadline: hoursFromNow(-4), prioritas: 'MEDIUM' }),
      ticket({ id: 3, status: 'SELESAI', deadline: hoursFromNow(-4) }),
      ticket({ id: 4, status: 'DITOLAK', deadline: hoursFromNow(-1) }),
      ticket({ id: 5, status: 'MENUNGGU_VALIDASI', deadline: hoursFromNow(-1) }),
      ticket({ id: 6, deadline: hoursFromNow(48) }),
      ticket({
        id: 7,
        pelaksanaId: null,
        pelaksana: null,
        deadline: hoursFromNow(-1),
      }),
    ];

    const sent = [];
    const prisma = {
      ticket: {
        findMany: async () => tickets,
        count: async () => 3,
      },
    };

    const summary = await checkDeadlines({
      prisma,
      now: NOW,
      reminderHours: HOURS,
      notifyDeadlineEvent: async (payload) => {
        sent.push(payload);
        return { sent: true };
      },
    });

    assert.equal(summary.checked, 7);
    assert.equal(summary.approaching, 1);
    assert.equal(summary.overdue, 1);
    assert.equal(summary.sent, 2);
    assert.equal(summary.skipped.NO_DEADLINE, 3);
    assert.equal(summary.skipped.INACTIVE, 2);
    assert.equal(summary.skipped.IN_REVIEW, 1);
    assert.equal(summary.skipped.NO_ASSIGNEE, 1);
    assert.equal(summary.skipped.NOT_DUE, 1);

    assert.equal(sent.length, 2);
    assert.equal(sent[0].recipient.id, 50);
    assert.notEqual(sent[0].recipient.id, 9);
    assert.equal(sent[0].type, EVENT_DEADLINE_SOON);
    assert.equal(sent[1].type, EVENT_OVERDUE);
    assert.match(sent[0].message, /\[PENGINGAT DEADLINE\]/);
    assert.match(sent[0].message, /#T-001/);
    assert.match(sent[0].message, /Perbaikan AC/);
    assert.match(sent[0].message, /HIGH/);
    assert.doesNotMatch(sent[0].message, /pasien|RME|lokasi|foto/i);
  });

  it('melanjutkan tiket lain jika pengiriman Telegram gagal', async () => {
    const tickets = [
      ticket({ id: 1, deadline: hoursFromNow(-1) }),
      ticket({ id: 2, deadline: hoursFromNow(-2) }),
    ];
    const sent = [];
    const prisma = {
      ticket: {
        findMany: async () => tickets,
        count: async () => 0,
      },
    };

    const summary = await checkDeadlines({
      prisma,
      now: NOW,
      reminderHours: HOURS,
      notifyDeadlineEvent: async (payload) => {
        if (payload.ticket.id === 1) {
          throw new Error('Telegram timeout');
        }
        sent.push(payload.ticket.id);
        return { sent: true };
      },
    });

    assert.deepEqual(sent, [2]);
    assert.equal(summary.failed, 1);
    assert.equal(summary.sent, 1);
    assert.equal(summary.overdue, 2);
  });
});
