
const cron = require('node-cron');
const { checkSlaDeadlines } = require('../services/slaNotificationService');

let isRunning = false;

function startSlaCronJob() {
  console.log('[SLA Cron] Penjadwalan pemeriksaan SLA dimulai.');

  // Periksa setiap 15 menit menggunakan zona waktu WITA.
  cron.schedule(
    '*/15 * * * *',
    async () => {
      if (isRunning) {
        console.warn('[SLA Cron] Pemeriksaan sebelumnya masih berjalan.');
        return;
      }

      isRunning = true;

      try {
        console.log('[SLA Cron] Memeriksa deadline tiket...');
        await checkSlaDeadlines();
      } catch (error) {
        console.error('[SLA Cron] Pemeriksaan gagal:', error);
      } finally {
        isRunning = false;
      }
    },
    { timezone: 'Asia/Makassar' }
  );
}

module.exports = { startSlaCronJob };
