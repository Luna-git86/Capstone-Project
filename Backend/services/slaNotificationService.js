
const prisma = require('../db');
const { sendTelegramMessage } = require('./telegramService');

const TIME_ZONE = 'Asia/Makassar';

function getLocalDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

async function sendSlaAlert(ticket, type, message) {
  const recipient = ticket.pelaksana;
  if (!recipient) {
    console.warn(
      `[SLA] Tiket #${ticket.id} tidak memiliki pelaksana.`
    );
    return;
  }

  const chatId = recipient.telegramChatId
    ? String(recipient.telegramChatId)
    : '';

  const dedupeKey = `ticket:${ticket.id}:sla:${type}`;

  let log = await prisma.notificationLog.findUnique({
    where: { dedupeKey },
  });

  // Notifikasi yang sudah berhasil dikirim tidak dikirim ulang.
  if (log?.status === 'SENT' || log?.status === 'PENDING') {
    return;
  }

  if (log) {
    // Izinkan percobaan ulang jika pengiriman sebelumnya gagal.
    log = await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: 'PENDING',
        attempts: { increment: 1 },
        errorMessage: null,
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
    if (!chatId) {
      throw new Error(
        'Telegram staf pelaksana belum terhubung.'
      );
    }

    await sendTelegramMessage(chatId, message);

    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        errorMessage: null,
      },
    });

    console.log(
      `[SLA] Notifikasi ${type} terkirim untuk tiket #${ticket.id}.`
    );
  } catch (error) {
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILED',
        errorMessage: String(error.message).slice(0, 500),
      },
    });

    console.error(
      `[SLA] Gagal mengirim notifikasi tiket #${ticket.id}:`,
      error.message
    );
  }
}

async function checkSlaDeadlines() {
  const now = new Date();
  const today = getLocalDateString(now);

  const tickets = await prisma.ticket.findMany({
    where: {
      deadline: { not: null },
      status: { notIn: ['SELESAI', 'DITOLAK'] },
    },
    include: {
      pelaksana: {
        select: {
          id: true,
          nama: true,
          telegramChatId: true,
        },
      },
    },
  });

  console.log(
  `[SLA] Waktu pemeriksaan: ${now.toLocaleString('id-ID', {
    timeZone: TIME_ZONE,
  })}`
);
console.log(`[SLA] Tanggal WITA: ${today}`);
console.log(`[SLA] Jumlah tiket yang diperiksa: ${tickets.length}`);

  for (const ticket of tickets) {
    try {
      const deadlineDate = new Date(ticket.deadline)
        .toISOString()
        .slice(0, 10);

      const title = ticket.judul;
      const deadlineText = new Date(ticket.deadline)
        .toLocaleString('id-ID', {
          timeZone: TIME_ZONE,
          dateStyle: 'long',
          timeStyle: 'short',
        });

      if (deadlineDate === today) {
        await sendSlaAlert(
          ticket,
          'DEADLINE_TODAY',
          [
            '⚠️ PERINGATAN SLA — HARI DEADLINE',
            '',
            `Tiket: #${ticket.id} - ${title}`,
            `Pelaksana: ${ticket.pelaksana?.nama || '-'}`,
            `Deadline: ${deadlineText} WITA`,
            'Mohon selesaikan tiket sesuai batas waktu.',
          ].join('\n')
        );
      }

      if (new Date(ticket.deadline) < now) {
        await sendSlaAlert(
          ticket,
          'OVERDUE',
          [
            '🚨 PERINGATAN SLA — TIKET TERLAMBAT',
            '',
            `Tiket: #${ticket.id} - ${title}`,
            `Pelaksana: ${ticket.pelaksana?.nama || '-'}`,
            `Deadline: ${deadlineText} WITA`,
            'Deadline telah terlewati. Mohon segera tindak lanjuti tiket.',
          ].join('\n')
        );
      }
    } catch (error) {
      console.error(
        `[SLA] Gagal memproses tiket #${ticket.id}:`,
        error.message
      );
    }
  }
}

module.exports = { checkSlaDeadlines };
