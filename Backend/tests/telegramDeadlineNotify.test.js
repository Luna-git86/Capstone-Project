const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { notifyDeadlineEvent, notifyTicketEvent } = require('../services/telegramService');
const { buildDeadlineDedupeKey } = require('../services/deadlineCheckService');
const { buildDedupeKey } = require('../services/ticketNotificationService');

function createLogStore(users) {
  const byKey = new Map();
  const userMap = new Map(users.map((user) => [user.id, { ...user }]));
  let nextId = 1;
  return {
    byKey,
    userMap,
    user: {
      findUnique: async ({ where }) => userMap.get(where.id) || null,
    },
    notificationLog: {
      findUnique: async ({ where }) => byKey.get(where.dedupeKey) || null,
      create: async ({ data }) => {
        if (byKey.has(data.dedupeKey)) {
          const error = new Error('Unique constraint');
          error.code = 'P2002';
          throw error;
        }
        const row = { id: nextId++, ...data };
        byKey.set(data.dedupeKey, row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = [...byKey.values()].find((item) => item.id === where.id);
        if (data.attempts?.increment) {
          row.attempts = (row.attempts || 0) + data.attempts.increment;
          delete data.attempts;
        }
        Object.assign(row, data);
        return row;
      },
    },
  };
}

describe('notifyDeadlineEvent', () => {
  const ticket = {
    id: 10,
    judul: 'Ganti lampu',
    prioritas: 'MEDIUM',
    deadline: new Date('2026-11-03T02:00:00.000Z'),
  };
  const pelaksana = { id: 50, nama: 'Staf', telegramChatId: '555' };

  it('tidak mengirim dua kali untuk event dan periode yang sama', async () => {
    const db = createLogStore([pelaksana]);
    let sends = 0;
    const sendTelegramMessage = async () => {
      sends += 1;
    };

    const first = await notifyDeadlineEvent(
      {
        ticket,
        recipient: pelaksana,
        type: 'OVERDUE',
        message: 'overdue',
      },
      { prisma: db, sendTelegramMessage }
    );
    const second = await notifyDeadlineEvent(
      {
        ticket,
        recipient: pelaksana,
        type: 'OVERDUE',
        message: 'overdue',
      },
      { prisma: db, sendTelegramMessage }
    );

    assert.equal(first.sent, true);
    assert.equal(second.duplicate, true);
    assert.equal(sends, 1);

    const key = buildDeadlineDedupeKey({
      ticketId: ticket.id,
      type: 'OVERDUE',
      deadline: ticket.deadline,
      recipientId: pelaksana.id,
    });
    assert.equal(db.byKey.get(key).status, 'SENT');
  });

  it('mencatat kegagalan Telegram tanpa melempar error ke pemanggil', async () => {
    const db = createLogStore([pelaksana]);
    const result = await notifyDeadlineEvent(
      {
        ticket,
        recipient: pelaksana,
        type: 'DEADLINE_SOON',
        message: 'soon',
      },
      {
        prisma: db,
        sendTelegramMessage: async () => {
          throw new Error('bot down');
        },
      }
    );

    assert.equal(result.sent, false);
    assert.match(result.error, /bot down/);
    const row = [...db.byKey.values()][0];
    assert.equal(row.status, 'FAILED');
    assert.equal(row.recipientId, pelaksana.id);
  });

  it('menggunakan Chat ID terbaru dari database', async () => {
    const db = createLogStore([pelaksana]);
    const chatIds = [];
    db.userMap.set(50, { id: 50, nama: 'Staf', telegramChatId: '999000' });

    await notifyTicketEvent(
      {
        ticketId: 10,
        recipientId: 50,
        type: 'TASK_ASSIGNED',
        message: 'tugas baru',
        occurrenceToken: 'from:none:to:50',
      },
      {
        prisma: db,
        sendTelegramMessage: async (chatId) => {
          chatIds.push(chatId);
        },
      }
    );

    assert.deepEqual(chatIds, ['999000']);
    const key = buildDedupeKey({
      ticketId: 10,
      type: 'TASK_ASSIGNED',
      recipientId: 50,
      occurrenceToken: 'from:none:to:50',
    });
    assert.equal(db.byKey.get(key).telegramChatId, '999000');
    assert.equal(db.byKey.get(key).status, 'SENT');
  });
});
