
const TELEGRAM_API = 'https://api.telegram.org';

async function sendTelegramMessage(chatId, message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN belum dikonfigurasi.');
  }

  if (!chatId) {
    throw new Error('Telegram chat ID penerima belum tersedia.');
  }

  const response = await fetch(
    `${TELEGRAM_API}/bot${token}/sendMessage`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
      signal: AbortSignal.timeout(10000),
    }
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description || 'Pengiriman pesan Telegram gagal.'
    );
  }

  return result.result;
}

module.exports = { sendTelegramMessage };
