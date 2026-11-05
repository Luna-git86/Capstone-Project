const prisma = require('../db');
const { isNotificationTypeEnabled } = require('../config/notificationConfig');
const systemConfigStore = require('../config/systemConfigStore');
const { buildDedupeKey } = require('./ticketNotificationService');

const TELEGRAM_API = 'https://api.telegram.org';

async function sendTelegramMessage(chatId, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN belum dikonfigurasi.');
  if (!chatId) throw new Error('Telegram chat ID penerima belum tersedia.');

  const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message }),
    signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.description || 'Pengiriman pesan Telegram gagal.');
  }
  return result.result;
}

async function loadRecipient(db, recipientId) {
  if (!recipientId) return null;
  return db.user.findUnique({
    where: { id: recipientId },
    select: { id: true, nama: true, telegramChatId: true, role: true },
  });
}

async function notifyTicketEvent(
  { ticketId, recipientId, type, message, occurrenceToken },
  deps = {}
) {
  const db = deps.prisma || prisma;
  const sendMessage = deps.sendTelegramMessage || sendTelegramMessage;

  if (!ticketId || !recipientId || !type || !occurrenceToken) {
    return { skipped: true, reason: 'INVALID_EVENT' };
  }

  if (!isNotificationTypeEnabled(type)) {
    return { skipped: true, reason: 'DISABLED' };
  }

  const recipient = await loadRecipient(db, recipientId);
  if (!recipient?.id) {
    console.warn(`[Telegram] Notifikasi tiket #${ticketId} dilewati: penerima ${recipientId} tidak ditemukan.`);
    return { skipped: true, reason: 'RECIPIENT_NOT_FOUND' };
  }

  const chatId = recipient.telegramChatId ? String(recipient.telegramChatId) : '';
  const dedupeKey = buildDedupeKey({
    ticketId,
    type,
    recipientId: recipient.id,
    occurrenceToken,
  });

  let log = await db.notificationLog.findUnique({ where: { dedupeKey } });

  if (log?.status === 'SENT' || log?.status === 'PENDING') {
    return { duplicate: true };
  }

  if (log) {
    log = await db.notificationLog.update({
      where: { id: log.id },
      data: {
        status: 'PENDING',
        attempts: { increment: 1 },
        errorMessage: null,
        message,
        telegramChatId: chatId || 'UNLINKED',
      },
    });
  } else {
    try {
      log = await db.notificationLog.create({
        data: {
          ticketId,
          recipientId: recipient.id,
          type,
          status: 'PENDING',
          message,
          telegramChatId: chatId || 'UNLINKED',
          dedupeKey,
          attempts: 1,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') return { duplicate: true };
      throw error;
    }
  }

  try {
    if (!systemConfigStore.isTelegramEnabled()) {
      throw new Error('Koneksi Telegram dinonaktifkan sementara oleh administrator.');
    }
    if (!chatId) throw new Error('Telegram penerima belum terhubung.');
    await sendMessage(chatId, message);
    await db.notificationLog.update({
      where: { id: log.id },
      data: { status: 'SENT', sentAt: new Date(), errorMessage: null },
    });
    return { sent: true, chatId, recipientId: recipient.id };
  } catch (error) {
    await db.notificationLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        errorMessage: String(error.message || error).slice(0, 500),
      },
    });
    console.error(`[Telegram] Gagal mengirim ${type} tiket #${ticketId}:`, error.message);
    return { sent: false, error: error.message, recipientId: recipient.id };
  }
}

async function notifyDeadlineEvent({ ticket, recipient, type, message }, deps = {}) {
  if (!ticket?.id) {
    return { skipped: true, reason: 'NO_TICKET' };
  }
  if (!recipient?.id) {
    console.warn(`[Telegram] Pengingat tiket #${ticket.id} dilewati: pelaksana tidak ditemukan.`);
    return { skipped: true, reason: 'NO_ASSIGNEE' };
  }
  if (!ticket.deadline) {
    return { skipped: true, reason: 'NO_DEADLINE' };
  }

  return notifyTicketEvent(
    {
      ticketId: ticket.id,
      recipientId: recipient.id,
      type,
      message,
      occurrenceToken: new Date(ticket.deadline).toISOString(),
    },
    deps
  );
}

async function retryFailedNotifications(deps = {}) {
  if (!systemConfigStore.isTelegramEnabled()) {
    return [];
  }
  const db = deps.prisma || prisma;
  const sendMessage = deps.sendTelegramMessage || sendTelegramMessage;
  const maxAttempts = deps.maxAttempts || systemConfigStore.getMaxRetryAttempts();

  const failedLogs = await db.notificationLog.findMany({
    where: {
      status: 'FAILED',
      attempts: { lt: maxAttempts },
    },
    include: {
      recipient: { select: { id: true, nama: true, telegramChatId: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  const results = [];
  for (const log of failedLogs) {
    const chatId =
      log.recipient?.telegramChatId ||
      (log.telegramChatId && log.telegramChatId !== 'UNLINKED'
        ? log.telegramChatId
        : null);

    if (!chatId) {
      continue;
    }

    await db.notificationLog.update({
      where: { id: log.id },
      data: { attempts: { increment: 1 } },
    });

    try {
      await sendMessage(chatId, log.message);
      await db.notificationLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          errorMessage: null,
          telegramChatId: chatId,
        },
      });
      results.push({ id: log.id, sent: true });
    } catch (err) {
      await db.notificationLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          errorMessage: String(err.message || err).slice(0, 500),
        },
      });
      results.push({ id: log.id, sent: false, error: err.message });
    }
  }

  return results;
}

module.exports = {
  sendTelegramMessage,
  notifyTicketEvent,
  notifyDeadlineEvent,
  retryFailedNotifications,
};
