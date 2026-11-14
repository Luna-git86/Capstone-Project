// Backend/controllers/notificationLogController.js
const prisma = require('../db');
const { sendTelegramMessage } = require('../services/telegramService');
const systemConfigStore = require('../config/systemConfigStore');

const getEffectiveMaxRetryAttempts = () => systemConfigStore.getMaxRetryAttempts();

// 1. Ambil Riwayat Notification Log dengan KPI & Filter Lengkap
const getNotificationLogs = async (req, res) => {
  try {
    const {
      status,
      type,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const where = {};

    // Filter Status
    if (status && ['SENT', 'FAILED', 'PENDING'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    // Filter Jenis Notifikasi
    if (type && type !== 'SEMUA' && type !== 'ALL') {
      where.type = type;
    }

    // Filter Rentang Tanggal
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    // Filter Pencarian (ID Tiket atau Nama Penerima)
    if (search && search.trim() !== '') {
      const q = search.trim();
      const parsedId = Number(q.replace(/\D/g, ''));
      where.OR = [
        ...(parsedId ? [{ ticketId: parsedId }] : []),
        { message: { contains: q, mode: 'insensitive' } },
        { recipient: { nama: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [logs, totalFiltered, totalAll, totalSent, totalFailed, totalPending] =
      await Promise.all([
        prisma.notificationLog.findMany({
          where,
          include: {
            recipient: {
              select: {
                id: true,
                nama: true,
                role: true,
                telegramChatId: true,
                divisi: { select: { id: true, nama: true } },
              },
            },
            ticket: {
              select: {
                id: true,
                judul: true,
                status: true,
                prioritas: true,
                divisi: { select: { id: true, nama: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.notificationLog.count({ where }),
        prisma.notificationLog.count(),
        prisma.notificationLog.count({ where: { status: 'SENT' } }),
        prisma.notificationLog.count({ where: { status: 'FAILED' } }),
        prisma.notificationLog.count({ where: { status: 'PENDING' } }),
      ]);

    return res.status(200).json({
      summary: {
        total: totalAll,
        sent: totalSent,
        failed: totalFailed,
        pending: totalPending,
      },
      pagination: {
        totalData: totalFiltered,
        page: Number(page) || 1,
        limit: take,
        totalPages: Math.ceil(totalFiltered / take) || 1,
      },
      data: logs,
    });
  } catch (error) {
    console.error('Error getNotificationLogs:', error);
    return res.status(500).json({
      message: 'Gagal memuat log notifikasi.',
      error: error.message,
    });
  }
};

// 2. Retry Pengiriman Satu Notifikasi Spesifik
const retrySingleNotification = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || !Number.isInteger(id)) {
      return res.status(400).json({ message: 'ID notifikasi tidak valid.' });
    }

    const log = await prisma.notificationLog.findUnique({
      where: { id },
      include: {
        recipient: { select: { id: true, nama: true, telegramChatId: true } },
      },
    });

    if (!log) {
      return res.status(404).json({ message: 'Log notifikasi tidak ditemukan.' });
    }

    if (log.status === 'SENT') {
      return res.status(400).json({
        message: 'Notifikasi ini sudah berhasil terkirim sebelumnya dan tidak perlu dikirim ulang.',
      });
    }

    const chatId = log.recipient?.telegramChatId || log.telegramChatId;
    if (!chatId || chatId === 'UNLINKED') {
      return res.status(400).json({
        message: `Penerima (${log.recipient?.nama || 'Pegawai'}) belum menghubungkan akun Telegram.`,
      });
    }

    // Set status ke PENDING dan catat percobaan
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: 'PENDING',
        attempts: { increment: 1 },
        errorMessage: null,
      },
    });

    try {
      await sendTelegramMessage(chatId, log.message);
      const updated = await prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          errorMessage: null,
          telegramChatId: chatId,
        },
      });

      return res.status(200).json({
        message: `Notifikasi #${log.id} berhasil dikirim ulang ke ${log.recipient?.nama || 'penerima'}!`,
        data: updated,
      });
    } catch (sendError) {
      const failedLog = await prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          errorMessage: String(sendError.message || sendError).slice(0, 500),
          telegramChatId: chatId,
        },
      });

      return res.status(502).json({
        message: `Pengiriman ulang gagal: ${sendError.message}`,
        data: failedLog,
      });
    }
  } catch (error) {
    console.error('Error retrySingleNotification:', error);
    return res.status(500).json({
      message: 'Terjadi kesalahan sistem saat mencoba mengirim ulang notifikasi.',
      error: error.message,
    });
  }
};

// 3. Retry Massal Seluruh Notifikasi yang Gagal
const retryAllFailedNotifications = async (req, res) => {
  try {
    const failedLogs = await prisma.notificationLog.findMany({
      where: {
        status: 'FAILED',
        attempts: { lt: getEffectiveMaxRetryAttempts() },
      },
      include: {
        recipient: { select: { id: true, nama: true, telegramChatId: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 20, // Batasi batch per eksekusi untuk mencegah rate limit Telegram
    });

    if (failedLogs.length === 0) {
      return res.status(200).json({
        message: 'Tidak ada notifikasi gagal yang memenuhi syarat untuk dikirim ulang.',
        processed: 0,
        succeeded: 0,
        failed: 0,
      });
    }

    let succeeded = 0;
    let failed = 0;

    for (const log of failedLogs) {
      const chatId = log.recipient?.telegramChatId || log.telegramChatId;
      if (!chatId || chatId === 'UNLINKED') {
        failed++;
        continue;
      }

      await prisma.notificationLog.update({
        where: { id: log.id },
        data: { attempts: { increment: 1 } },
      });

      try {
        await sendTelegramMessage(chatId, log.message);
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            errorMessage: null,
            telegramChatId: chatId,
          },
        });
        succeeded++;
      } catch (err) {
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: 'FAILED',
            errorMessage: String(err.message || err).slice(0, 500),
          },
        });
        failed++;
      }
    }

    return res.status(200).json({
      message: `Proses retry selesai. ${succeeded} berhasil, ${failed} gagal dari total ${failedLogs.length} notifikasi.`,
      processed: failedLogs.length,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error('Error retryAllFailedNotifications:', error);
    return res.status(500).json({
      message: 'Gagal menjalankan retry massal.',
      error: error.message,
    });
  }
};

// 4. Ambil Notifikasi Masuk Khusus Akun yang Sedang Login (Real-time & Dynamic)
const getMyNotifications = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const userRole = req.user?.role;
    if (!userId) {
      return res.status(401).json({ message: 'Sesi pengguna tidak valid.' });
    }

    let where = { recipientId: userId };

    // Jika ADMIN dan belum memiliki notifikasi personal, ambil log notifikasi sistem terkini
    if (userRole === 'ADMIN') {
      const personalCount = await prisma.notificationLog.count({ where: { recipientId: userId } });
      if (personalCount === 0) {
        where = {};
      }
    }

    const logs = await prisma.notificationLog.findMany({
      where,
      include: {
        ticket: {
          select: {
            id: true,
            judul: true,
            status: true,
            prioritas: true,
            lokasi: true,
            jenisTiket: true,
            divisi: { select: { id: true, nama: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });

    const formatted = logs.map((item) => ({
      id: item.id,
      ticketId: item.ticketId,
      ticketTitle: item.ticket?.judul || `Tiket #T-${String(item.ticketId).padStart(3, '0')}`,
      ticketStatus: item.ticket?.status || 'UPDATE',
      ticketPrioritas: item.ticket?.prioritas || 'MEDIUM',
      jenisTiket: item.ticket?.jenisTiket || 'TUGAS',
      divisiNama: item.ticket?.divisi?.nama || 'RSIA',
      type: item.type,
      message: item.message,
      status: item.status,
      createdAt: item.createdAt,
    }));

    return res.status(200).json({
      data: formatted,
      total: formatted.length,
    });
  } catch (error) {
    console.error('Error getMyNotifications:', error);
    return res.status(500).json({
      message: 'Gagal memuat notifikasi akun Anda.',
      error: error.message,
    });
  }
};

module.exports = {
  getNotificationLogs,
  getMyNotifications,
  retrySingleNotification,
  retryAllFailedNotifications,
  get MAX_RETRY_ATTEMPTS() {
    return getEffectiveMaxRetryAttempts();
  },
};
