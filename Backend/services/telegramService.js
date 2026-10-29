const prisma = require('../db');

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

async function notifyTicketStatus({ ticketId, recipient, ticketTitle, status, deadline }) {
  if (!recipient?.id) {
    console.warn(`[Telegram] Notifikasi tiket #${ticketId} dilewati: pembuat tiket tidak ditemukan.`);
    return { skipped: true };
  }

  const chatId = recipient.telegramChatId ? String(recipient.telegramChatId) : '';
  const dedupeKey = `ticket:${ticketId}:status:${status}:${Date.now()}`;
  const deadlineText = deadline ? new Date(deadline).toLocaleString('id-ID') : 'Belum ditentukan';
  const message = [
    '🔔 Pembaruan Tiket E-Ticketing RSIA Qurrata A’yun',
    '',
    `Tiket: #${ticketId} - ${ticketTitle}`,
    `Status terbaru: ${status.replaceAll('_', ' ')}`,
    `Deadline: ${deadlineText}`,
  ].join('\n');

  let log;
  try {
    log = await prisma.notificationLog.create({
      data: {
        ticketId,
        recipientId: recipient.id,
        type: `STATUS_${status}`,
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

  try {
    if (!chatId) throw new Error('Akun pembuat tiket belum menghubungkan Telegram.');
    await sendTelegramMessage(chatId, message);
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'SENT', sentAt: new Date(), errorMessage: null },
    });
    return { sent: true };
  } catch (error) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', errorMessage: String(error.message).slice(0, 500) },
    });
    console.error(`[Telegram] Gagal mengirim notifikasi tiket #${ticketId}:`, error.message);
    return { sent: false, error: error.message };
  }
}

module.exports = { sendTelegramMessage, notifyTicketStatus };
