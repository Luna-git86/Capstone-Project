const cron = require('node-cron');
const { getCronExpression, getTimeZone } = require('../config/notificationConfig');
const { checkDeadlines } = require('../services/deadlineCheckService');
const { retryFailedNotifications } = require('../services/telegramService');

const TASK_NAME = 'ticket-deadline-check';

let scheduledTask = null;

function isTestEnvironment() {
  return process.env.NODE_ENV === 'test';
}

async function runCycle(runCheck) {
  try {
    await runCheck();
  } catch (error) {
    console.error('[Deadline Cron] Error siklus tidak menghentikan jadwal berikutnya:', error.message);
  }

  // Modul 5: Coba ulang notifikasi Telegram yang sempat gagal (attempts < 3)
  try {
    await retryFailedNotifications();
  } catch (retryError) {
    console.error('[Notification Retry] Error siklus retry gagal:', retryError.message);
  }
}

function startDeadlineScheduler(options = {}) {
  if (isTestEnvironment() && !options.force) {
    console.log('[Deadline Cron] Scheduler tidak dijalankan di environment test.');
    return null;
  }

  if (scheduledTask) {
    return scheduledTask;
  }

  const cronLib = options.cron || cron;
  const expression = options.expression || getCronExpression();
  const timezone = options.timezone || getTimeZone();
  const runCheck = options.checkDeadlines || checkDeadlines;

  if (typeof cronLib.validate === 'function' && !cronLib.validate(expression)) {
    console.error(`[Deadline Cron] Ekspresi cron tidak valid: ${expression}`);
    return null;
  }

  scheduledTask = cronLib.schedule(
    expression,
    async () => {
      await runCycle(runCheck);
    },
    {
      timezone,
      name: TASK_NAME,
      noOverlap: true,
    }
  );

  console.log(`[Deadline Cron] Scheduler aktif (${expression}, ${timezone}).`);
  return scheduledTask;
}

async function stopDeadlineScheduler() {
  if (!scheduledTask) {
    return false;
  }

  const task = scheduledTask;
  scheduledTask = null;

  if (typeof task.destroy === 'function') {
    await task.destroy();
  } else if (typeof task.stop === 'function') {
    await task.stop();
  }

  return true;
}

function isDeadlineSchedulerStarted() {
  return Boolean(scheduledTask);
}

module.exports = {
  TASK_NAME,
  startDeadlineScheduler,
  stopDeadlineScheduler,
  isDeadlineSchedulerStarted,
};
