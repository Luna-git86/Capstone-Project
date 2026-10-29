// Backend/services/telegramBot.js

const TelegramBot = require('node-telegram-bot-api');
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

    // Token yang dibuat server harus terdiri dari 64 karakter heksadesimal.
    if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
      await bot.sendMessage(
        chatId,
        'Tautan penghubung tidak valid. Silakan buat tautan baru dari aplikasi.'
      );
      return;
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

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

        const existingChat = await tx.user.findUnique({
          where: { telegramChatId: chatId },
          select: { id: true },
        });

        if (existingChat) {
          throw new Error('CHAT_ALREADY_LINKED');
        }

        // Klaim token secara atomik agar tidak dapat dipakai dua kali.
        const claimed = await tx.telegramLinkToken.updateMany({
          where: {
            id: linkToken.id,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { usedAt: new Date() },
        });

        if (claimed.count !== 1) {
          throw new Error('TOKEN_USED');
        }

        // Hubungkan chat hanya jika akun belum terhubung.
        const updated = await tx.user.updateMany({
          where: {
            id: linkToken.userId,
            telegramChatId: null,
          },
          data: { telegramChatId: chatId },
        });

        if (updated.count !== 1) {
          throw new Error('USER_ALREADY_LINKED');
        }

        return { nama: linkToken.user.nama };
      });

      await bot.sendMessage(
        chatId,
        `Berhasil! Telegram kamu sudah terhubung dengan akun E-Ticketing RSIA Qurrata A’yun atas nama ${result.nama}.\n\nKamu dapat menerima notifikasi terkait tiket melalui bot ini.`
      );
    } catch (error) {
      // Catat kode kesalahan saja, jangan mencatat token rahasia.
      const code = error.message;

      const messages = {
        TOKEN_INVALID: 'Token tidak valid. Silakan buat tautan penghubung baru.',
        TOKEN_USED: 'Token ini sudah digunakan. Silakan buat tautan baru jika akun belum terhubung.',
        TOKEN_EXPIRED: 'Tautan penghubung sudah kedaluwarsa. Silakan buat tautan baru.',
        USER_NOT_FOUND: 'Akun pengguna tidak ditemukan.',
        USER_ALREADY_LINKED: 'Akun pengguna sudah terhubung dengan Telegram.',
        CHAT_ALREADY_LINKED: 'Akun Telegram ini sudah terhubung dengan pengguna lain.',
      };

      if (messages[code]) {
        await bot.sendMessage(chatId, messages[code]);
      } else {
        console.error('[Telegram] Gagal menghubungkan akun:', error);
        await bot.sendMessage(
          chatId,
          'Terjadi kesalahan saat menghubungkan akun. Silakan coba kembali.'
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