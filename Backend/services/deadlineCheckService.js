const { getReminderHours, getTimeZone } = require('../config/notificationConfig');
const {
  buildDedupeKey,
  buildNotificationMessage,
} = require('./ticketNotificationService');

const INACTIVE_STATUSES = new Set(['SELESAI', 'DITOLAK']);
const REVIEW_STATUSES = new Set(['MENUNGGU_VALIDASI']);
const EVENT_DEADLINE_SOON = 'DEADLINE_SOON';
const EVENT_OVERDUE = 'OVERDUE';

function getAssignee(ticket) {
  return ticket?.pelaksana || null;
}

function classifyDeadlineTicket(ticket, now, reminderHours) {
  if (!ticket?.deadline) {
    return { action: 'SKIP', reason: 'NO_DEADLINE' };
  }

  const deadline = new Date(ticket.deadline);
  if (Number.isNaN(deadline.getTime())) {
    return { action: 'SKIP', reason: 'INVALID_DEADLINE' };
  }

  if (INACTIVE_STATUSES.has(ticket.status)) {
    return { action: 'SKIP', reason: 'INACTIVE' };
  }

  if (REVIEW_STATUSES.has(ticket.status)) {
    return { action: 'SKIP', reason: 'IN_REVIEW' };
  }

  const assignee = getAssignee(ticket);
  if (!ticket.pelaksanaId && !assignee?.id) {
    return { action: 'SKIP', reason: 'NO_ASSIGNEE' };
  }

  const hours = Number(reminderHours);
  const reminderLimit = new Date(now.getTime() + hours * 60 * 60 * 1000);

  if (deadline.getTime() < now.getTime()) {
    return { action: EVENT_OVERDUE, deadline };
  }

  if (deadline.getTime() <= reminderLimit.getTime()) {
    return { action: EVENT_DEADLINE_SOON, deadline };
  }

  return { action: 'SKIP', reason: 'NOT_DUE', deadline };
}

function buildDeadlineDedupeKey({ ticketId, type, deadline, recipientId }) {
  return buildDedupeKey({
    ticketId,
    type,
    recipientId,
    occurrenceToken: new Date(deadline).toISOString(),
  });
}

function buildDeadlineMessage(ticket, type, timeZone) {
  return buildNotificationMessage({ type, ticket, timeZone });
}

function emptySkipCounts() {
  return {
    NO_DEADLINE: 0,
    INVALID_DEADLINE: 0,
    INACTIVE: 0,
    IN_REVIEW: 0,
    NO_ASSIGNEE: 0,
    NOT_DUE: 0,
  };
}

async function checkDeadlines(options = {}) {
  const startedAt = new Date();
  const now = options.now || startedAt;
  const reminderHours = options.reminderHours ?? getReminderHours();
  const timeZone = options.timeZone || getTimeZone();
  const prisma = options.prisma || require('../db');
  const notifyDeadlineEvent =
    options.notifyDeadlineEvent ||
    require('./telegramService').notifyDeadlineEvent;

  const skipCounts = emptySkipCounts();
  const summary = {
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    checked: 0,
    approaching: 0,
    overdue: 0,
    sent: 0,
    failed: 0,
    skipped: skipCounts,
  };

  console.log(
    `[Deadline Cron] Mulai pemeriksaan ${startedAt.toISOString()} | jendela ${reminderHours} jam | zona ${timeZone}`
  );

  try {
    const [tickets, noDeadlineCount] = await Promise.all([
      prisma.ticket.findMany({
        where: { deadline: { not: null } },
        select: {
          id: true,
          judul: true,
          prioritas: true,
          status: true,
          deadline: true,
          pelaksanaId: true,
          pelaksana: {
            select: { id: true, nama: true, telegramChatId: true },
          },
        },
        orderBy: { deadline: 'asc' },
      }),
      prisma.ticket.count({ where: { deadline: null } }),
    ]);

    skipCounts.NO_DEADLINE = noDeadlineCount;
    summary.checked = tickets.length;

    for (const ticket of tickets) {
      try {
        const classification = classifyDeadlineTicket(ticket, now, reminderHours);

        if (classification.action === 'SKIP') {
          skipCounts[classification.reason] = (skipCounts[classification.reason] || 0) + 1;
          continue;
        }

        if (classification.action === EVENT_DEADLINE_SOON) {
          summary.approaching += 1;
        } else if (classification.action === EVENT_OVERDUE) {
          summary.overdue += 1;
        }

        const recipient = getAssignee(ticket);
        const result = await notifyDeadlineEvent({
          ticket,
          recipient,
          type: classification.action,
          message: buildDeadlineMessage(ticket, classification.action, timeZone),
        });

        if (result?.duplicate || result?.skipped) {
          continue;
        }
        if (result?.sent) {
          summary.sent += 1;
        } else {
          summary.failed += 1;
        }
      } catch (error) {
        summary.failed += 1;
        console.error(
          `[Deadline Cron] Gagal memproses tiket #${ticket.id}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error('[Deadline Cron] Siklus pemeriksaan gagal:', error.message);
    throw error;
  } finally {
    summary.finishedAt = new Date().toISOString();
    console.log(
      `[Deadline Cron] Selesai ${summary.finishedAt} | diperiksa=${summary.checked} mendekati=${summary.approaching} overdue=${summary.overdue} terkirim=${summary.sent} gagal=${summary.failed} dilewati=${JSON.stringify(summary.skipped)}`
    );
  }

  return summary;
}

module.exports = {
  INACTIVE_STATUSES,
  REVIEW_STATUSES,
  EVENT_DEADLINE_SOON,
  EVENT_OVERDUE,
  classifyDeadlineTicket,
  buildDeadlineDedupeKey,
  buildDeadlineMessage,
  checkDeadlines,
};
