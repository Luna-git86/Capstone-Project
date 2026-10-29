
const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot =
  TelegramBotModule.default || TelegramBotModule;
const crypto = require('crypto');
const prisma = require('../db');

let botInstance = null;

function startTelegramBot() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN belum diatur.');
    return null;
  }

  if (botInstance) {
    return botInstance;
  }

  const bot = new TelegramBot(botToken, { polling: true });
  botInstance = bot;

  // Perbaikan regex: membaca /start dan token yang mengikutinya.
  bot.onText(/^\/start(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = String(msg.chat.id);
    const rawToken = match?.[1]?.trim();

    if (!rawToken) {
      await bot.sendMessage(
        chatId,
        'Halo! Untuk menghubungkan akun Telegram, buka tautan penghubung dari aplikasi E-Ticketing RSIA Qurrata A’yun.'
      );
      return;
    }

    // Token harus berupa 64 karakter heksadesimal.
    if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
      console.warn('[Telegram Link] Format token tidak valid.', {
        tokenLength: rawToken.length,
      });

      await bot.sendMessage(
        chatId,
        'Tautan penghubung tidak valid. Silakan buat tautan baru dari aplikasi.'
      );
      return;
    }

    // Hash token harus sama dengan hash yang disimpan server.
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    console.log('[Telegram Link Debug] Token diterima.', {
      tokenLength: rawToken.length,
      tokenFormatValid: true,
    });

    try {
      const result = await prisma.$transaction(async (tx) => {
        const linkToken = await tx.telegramLinkToken.findUnique({
          where: { tokenHash },
          include: {
            user: {
              select: {
                id: true,
                nama: true,
                telegramChatId: true,
              },
            },
          },
        });

        // Diagnostik tanpa menampilkan token atau hash rahasia.
        console.log('[Telegram Link Debug] Hasil pencarian.', {
          tokenFound: Boolean(linkToken),
          tokenUsed: Boolean(linkToken?.usedAt),
          tokenExpired: linkToken
            ? linkToken.expiresAt <= new Date()
            : null,
        });

        if (!linkToken) {
          throw new Error('TOKEN_INVALID');
        }

        if (linkToken.usedAt) {
          throw new Error('TOKEN_USED');
        }

        if (linkToken.expiresAt <= new Date()) {
          throw new Error('TOKEN_EXPIRED');
        }

        if (!linkToken.user) {
          throw new Error('USER_NOT_FOUND');
        }

        if (linkToken.user.telegramChatId) {
          throw new Error('USER_ALREADY_LINKED');
        }

        // Pastikan chat Telegram belum terhubung ke akun lain.
        const existingChat = await tx.user.findUnique({
          where: { telegramChatId: chatId },
          select: { id: true },
        });

        if (existingChat) {
          throw new Error('CHAT_ALREADY_LINKED');
        }

        // Klaim token secara atomik dan hanya sekali.
        const claimed = await tx.telegramLinkToken.updateMany({
          where: {
            id: linkToken.id,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: {
            usedAt: new Date(),
          },
        });

        if (claimed.count !== 1) {
          throw new Error('TOKEN_USED');
        }

        // Hubungkan chat jika pengguna masih belum terhubung.
        const updated = await tx.user.updateMany({
          where: {
            id: linkToken.userId,
            telegramChatId: null,
          },
          data: {
            telegramChatId: chatId,
          },
        });

        if (updated.count !== 1) {
          throw new Error('USER_ALREADY_LINKED');
        }

        return {
          nama: linkToken.user.nama,
        };
      });

      await bot.sendMessage(
        chatId,
        `Berhasil! Telegram kamu sudah terhubung dengan akun E-Ticketing RSIA Qurrata A’yun atas nama ${result.nama}.\n\nKamu dapat menerima notifikasi terkait tiket melalui bot ini.`
      );

      console.log('[Telegram Link] Akun berhasil dihubungkan.');
    } catch (error) {
      const code = error.message;

      const messages = {
        TOKEN_INVALID:
          'Token tidak valid. Silakan buat tautan penghubung baru.',
        TOKEN_USED:
          'Token ini sudah digunakan. Silakan buat tautan baru jika akun belum terhubung.',
        TOKEN_EXPIRED:
          'Tautan penghubung sudah kedaluwarsa. Silakan buat tautan baru.',
        USER_NOT_FOUND:
          'Akun pengguna tidak ditemukan.',
        USER_ALREADY_LINKED:
          'Akun pengguna sudah terhubung dengan Telegram.',
        CHAT_ALREADY_LINKED:
          'Akun Telegram ini sudah terhubung dengan pengguna lain.',
      };

      if (messages[code]) {
        console.warn(`[Telegram Link] ${code}`);
        await bot.sendMessage(chatId, messages[code]);
      } else {
        // Error database atau kesalahan lain.
        console.error(
          '[Telegram] Gagal menghubungkan akun:',
          error.message
        );

        await bot.sendMessage(
          chatId,
          'Terjadi kesalahan saat menghubungkan akun. Periksa koneksi database atau coba kembali.'
        );
      }
    }
  });

  bot.on('polling_error', (error) => {
    console.error('[Telegram] Polling error:', error.message);
  });

  console.log('[Telegram] Bot berhasil dimulai.');

  return bot;
}

module.exports = { startTelegramBot };
