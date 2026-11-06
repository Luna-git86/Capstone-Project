// Backend/controllers/adminConfigController.js
const prisma = require('../db');
const systemConfigStore = require('../config/systemConfigStore');
const { stopDeadlineScheduler, startDeadlineScheduler } = require('../jobs/deadlineScheduler');

const TELEGRAM_API = 'https://api.telegram.org';

// 1. Ambil Konfigurasi Sistem Saat Ini
const getSystemConfig = async (req, res) => {
  try {
    const config = systemConfigStore.getConfig();
    const token = process.env.TELEGRAM_BOT_TOKEN;

    return res.status(200).json({
      success: true,
      config,
      metadata: {
        telegramConfigured: Boolean(token),
        tokenMasked: token ? `${token.slice(0, 4)}...${token.slice(-4)}` : null,
        environment: process.env.NODE_ENV || 'development',
      },
    });
  } catch (error) {
    console.error('[AdminConfig] Error getSystemConfig:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat konfigurasi sistem.',
      error: error.message,
    });
  }
};

// 2. Perbarui Konfigurasi Sistem & Catat ke AuditLog
const updateSystemConfig = async (req, res) => {
  try {
    const adminUser = req.user;
    if (!adminUser || !adminUser.id) {
      return res.status(401).json({ success: false, message: 'Autentikasi admin diperlukan.' });
    }

    const oldConfig = systemConfigStore.getConfig();

    // Mutasi konfigurasi melalui config store yang tervalidasi
    const updatedConfig = systemConfigStore.updateConfig(req.body);

    // Muat ulang scheduler otomatis jika jadwal cron atau timezone berubah
    if (
      updatedConfig.cronSchedule !== oldConfig.cronSchedule ||
      updatedConfig.timeZone !== oldConfig.timeZone
    ) {
      try {
        await stopDeadlineScheduler();
        startDeadlineScheduler();
      } catch (schedErr) {
        console.warn('[AdminConfig] Gagal memuat ulang scheduler:', schedErr.message);
      }
    }

    // Jika koneksi Telegram diaktifkan kembali (OFF -> ON), picu pengiriman ulang pesan yang sempat gagal (UAT-5.2)
    if (updatedConfig.telegramEnabled === true && oldConfig.telegramEnabled === false) {
      try {
        const { retryFailedNotifications } = require('../services/telegramService');
        setTimeout(async () => {
          try {
            await retryFailedNotifications();
            console.log('[AdminConfig] Auto-retry notifikasi tertunda berhasil dipicu.');
          } catch (retryErr) {
            console.warn('[AdminConfig] Gagal retry notifikasi saat Telegram ON:', retryErr.message);
          }
        }, 500);
      } catch (_) {}
    }

    // Catat perubahan ke AuditLog sesuai schema Prisma
    try {
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_SYSTEM_CONFIG',
          entityType: 'SystemConfig',
          entityId: 1,
          userId: adminUser.id,
          details: JSON.stringify({
            updatedBy: adminUser.nama || adminUser.email || `Admin #${adminUser.id}`,
            oldConfig,
            updatedConfig,
            timestamp: new Date().toISOString(),
          }),
        },
      });
    } catch (auditError) {
      console.warn('[AdminConfig] Gagal mencatat AuditLog:', auditError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Konfigurasi sistem berhasil diperbarui.',
      config: updatedConfig,
    });
  } catch (error) {
    console.error('[AdminConfig] Error updateSystemConfig:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Gagal memperbarui konfigurasi.',
    });
  }
};

// 3. Uji Koneksi Bot Telegram (Health Check)
const getTelegramBotStatus = async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(200).json({
      success: true,
      configured: false,
      status: 'NOT_CONFIGURED',
      message: 'TELEGRAM_BOT_TOKEN belum diatur dalam file environment.',
    });
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/getMe`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    const data = await response.json();
    if (response.ok && data.ok) {
      return res.status(200).json({
        success: true,
        configured: true,
        status: 'CONNECTED',
        bot: {
          id: data.result.id,
          isBot: data.result.is_bot,
          firstName: data.result.first_name,
          username: data.result.username,
          canJoinGroups: data.result.can_join_groups,
        },
        message: 'Bot Telegram terhubung dengan baik.',
      });
    } else {
      return res.status(200).json({
        success: true,
        configured: true,
        status: 'ERROR',
        message: data.description || 'Token Telegram tidak valid atau ditolak oleh Telegram API.',
      });
    }
  } catch (error) {
    return res.status(200).json({
      success: true,
      configured: true,
      status: 'UNREACHABLE',
      message: `Tidak dapat menghubungi server Telegram: ${error.message}`,
    });
  }
};

// 4. Ringkasan Status Penerima Notifikasi (User Telegram Linking)
const getRecipientsSummary = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        telegramChatId: true,
        divisi: { select: { id: true, nama: true } },
      },
      orderBy: [{ role: 'asc' }, { nama: 'asc' }],
    });

    const summaryByRole = {
      DIREKTUR: { total: 0, linked: 0 },
      KADIV: { total: 0, linked: 0 },
      KOORDINATOR: { total: 0, linked: 0 },
      STAF: { total: 0, linked: 0 },
      ADMIN: { total: 0, linked: 0 },
    };

    let totalLinked = 0;

    const userList = users.map((u) => {
      const isLinked = Boolean(u.telegramChatId && u.telegramChatId !== 'UNLINKED');
      if (summaryByRole[u.role]) {
        summaryByRole[u.role].total++;
        if (isLinked) summaryByRole[u.role].linked++;
      }
      if (isLinked) totalLinked++;

      return {
        id: u.id,
        nama: u.nama,
        email: u.email,
        role: u.role,
        divisi: u.divisi?.nama || 'LINTAS_DIVISI',
        isLinked,
      };
    });

    return res.status(200).json({
      success: true,
      totalUsers: users.length,
      totalLinked,
      totalUnlinked: users.length - totalLinked,
      summaryByRole,
      users: userList,
    });
  } catch (error) {
    console.error('[AdminConfig] Error getRecipientsSummary:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat ringkasan penerima Telegram.',
      error: error.message,
    });
  }
};

// 5. Riwayat Audit Log Perubahan Konfigurasi
const getConfigAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'SystemConfig',
      },
      include: {
        user: { select: { id: true, nama: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('[AdminConfig] Error getConfigAuditLogs:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat log audit konfigurasi.',
      error: error.message,
    });
  }
};

module.exports = {
  getSystemConfig,
  updateSystemConfig,
  getTelegramBotStatus,
  getRecipientsSummary,
  getConfigAuditLogs,
};
