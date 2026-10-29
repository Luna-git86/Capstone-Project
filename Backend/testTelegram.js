
require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const prisma = require('./db');

async function testTelegram() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        telegramChatId: {
          not: null,
        },
        // Jika ingin memastikan akun Administrator,
        // sesuaikan filter dengan struktur role di database.
      },
      select: {
        id: true,
        nama: true,
        telegramChatId: true,
      },
    });

    if (!user) {
      console.error(
        'Tidak ditemukan pengguna yang Telegram-nya sudah terhubung.'
      );
      return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN belum diatur di .env.');
      return;
    }

    const bot = new TelegramBot(botToken);

    const message =
      `🧪 TES NOTIFIKASI TELEGRAM\n\n` +
      `Halo ${user.nama}, pesan tes dari E-Ticketing RSIA Qurrata A’yun berhasil dikirim.\n\n` +
      `Jika pesan ini diterima, koneksi pengiriman Telegram berfungsi.`;

    await bot.sendMessage(user.telegramChatId, message);

    console.log(
      `Pesan tes berhasil dikirim ke pengguna: ${user.nama}`
    );
  } catch (error) {
    console.error('Tes Telegram gagal:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testTelegram();
