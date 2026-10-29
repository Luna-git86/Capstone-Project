const prisma = require('../db');
const { sendTelegramMessage } = require('./telegramService');

const TIME_ZONE = process.env.SLA_TIME_ZONE || 'Asia/Makassar';
const REMINDER_HOURS = positiveNumber(process.env.SLA_REMINDER_HOURS, 24);

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatWita(value, options = {}) {
  return new Date(value).toLocaleString('id-ID', {
    timeZone: TIME_ZONE,
    dateStyle: 'long',
    timeStyle: 'short',
    ...options,
  });
}

async function deliverNotification({ ticket, recipient, type, message }) {
  if (!recipient?.id) {
    console.warn(`[SLA] Penerima ${type} untuk tiket #${ticket.id} tidak tersedia.`);
    return;
  }

  const chatId = recipient.telegramChatId ? String(recipient.telegramChatId) : '';
  const dedupeKey = `ticket:${ticket.id}:sla:${type}:recipient:${recipient.id}`;
  let log = await prisma.notificationLog.findUnique({ where: { dedupeKey } });

  // Jangan mengirim ulang notifikasi yang sudah terkirim atau sedang diproses.
  if (log?.status === 'SENT' || log?.status === 'PENDING') return;

  if (log) {
    log = await prisma.notificationLog.update({
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
      log = await prisma.notificationLog.create({
        data: {
          ticketId: ticket.id,
          recipientId: recipient.id,
          type: `SLA_${type}`,
          status: 'PENDING',
          message,
          telegramChatId: chatId || 'UNLINKED',
          dedupeKey,
          attempts: 1,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') return;
      throw error;
    }
  }

  try {
    if (!chatId) throw new Error('Telegram penerima belum terhubung.');
    await sendTelegramMessage(chatId, message);
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'SENT', sentAt: new Date(), errorMessage: null },
    });
    console.log(`[SLA] ${type} terkirim untuk tiket #${ticket.id} ke ${recipient.nama}.`);
  } catch (error) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        errorMessage: String(error.message || error).slice(0, 500),
      },
    });
    console.error(`[SLA] Gagal mengirim ${type} tiket #${ticket.id}:`, error.message);
  }
}

async function sendSlaAlert(ticket, type, message) {
  const recipients = [];
  if (ticket.pelaksana) recipients.push(ticket.pelaksana);

  // UAT meminta Koordinator terkait juga menerima peringatan overdue.
  if (type === 'OVERDUE' && ticket.divisiId) {
    const coordinators = await prisma.user.findMany({
      where: { role: 'KOORDINATOR', divisiId: ticket.divisiId },
      select: { id: true, nama: true, telegramChatId: true },
    });
    recipients.push(...coordinators);
  }

  if (!recipients.length) {
    console.warn(`[SLA] Tiket #${ticket.id} tidak memiliki penerima notifikasi.`);
    return;
  }

  const uniqueRecipients = [...new Map(recipients.map((user) => [user.id, user])).values()];
  for (const recipient of uniqueRecipients) {
    await deliverNotification({ ticket, recipient, type, message });
  }
}

async function checkSlaDeadlines() {
  const now = new Date();
  const reminderLimit = new Date(now.getTime() + REMINDER_HOURS * 60 * 60 * 1000);

  console.log(`[SLA] Waktu pemeriksaan: ${formatWita(now)} WITA`);
  console.log(`[SLA] Jendela pengingat: ${REMINDER_HOURS} jam.`);

  const tickets = await prisma.ticket.findMany({
    where: {
      deadline: { not: null },
      status: { notIn: ['SELESAI', 'DITOLAK'] },
    },
    include: {
      divisi: { select: { id: true, nama: true } },
      pelaksana: { select: { id: true, nama: true, telegramChatId: true } },
    },
    orderBy: { deadline: 'asc' },
  });

  console.log(`[SLA] Jumlah tiket belum selesai yang diperiksa: ${tickets.length}`);

  let approaching = 0;
  let overdue = 0;

  for (const ticket of tickets) {
    try {
      const deadline = new Date(ticket.deadline);
      if (Number.isNaN(deadline.getTime())) {
        console.warn(`[SLA] Tenggat tiket #${ticket.id} tidak valid.`);
        continue;
      }

      const details = [
        `Tiket: #${ticket.id} — ${ticket.judul}`,
        `Divisi: ${ticket.divisi?.nama || '-'}`,
        `Pelaksana: ${ticket.pelaksana?.nama || 'Belum ditetapkan'}`,
        `Tenggat: ${formatWita(deadline)} WITA`,
        `Urgensi: ${ticket.prioritas === 'HIGH' ? 'TINGGI / DARURAT' : ticket.prioritas === 'MEDIUM' ? 'SEDANG' : 'RENDAH'}`,
      ];

      if (deadline < now) {
        overdue++;
        console.log(`[SLA] Tiket #${ticket.id} terdeteksi OVERDUE.`);
        await sendSlaAlert(ticket, 'OVERDUE', [
          '🚨 PERINGATAN SLA — TIKET TERLAMBAT',
          '',
          ...details,
          'Tenggat telah terlewati dan tiket belum selesai. Mohon segera tindak lanjuti.',
        ].join('\n'));
      } else if (deadline <= reminderLimit) {
        approaching++;
        console.log(`[SLA] Tiket #${ticket.id} mendekati tenggat; masuk proses pengiriman pengingat.`);
        await sendSlaAlert(ticket, 'DEADLINE_SOON', [
          '⚠️ PENGINGAT SLA — TENGGAT MENDEKAT',
          '',
          ...details,
          `Tenggat akan tiba dalam ${REMINDER_HOURS} jam atau kurang.`,
          'Mohon selesaikan tugas sebelum tenggat.',
        ].join('\n'));
      }
    } catch (error) {
      console.error(`[SLA] Gagal memproses tiket #${ticket.id}:`, error.message);
    }
  }

  console.log(`[SLA] Ringkasan pemeriksaan: diperiksa=${tickets.length}, mendekati_tenggat=${approaching}, overdue=${overdue}.`);
  return { checked: tickets.length, approaching, overdue, checkedAt: now.toISOString() };
}

module.exports = { checkSlaDeadlines, sendSlaAlert };
