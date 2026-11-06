// Backend/config/systemConfigStore.js
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'system-config.json');

const DEFAULT_CONFIG = {
  telegramEnabled: process.env.TELEGRAM_ENABLED !== 'false',
  maxRetryAttempts: 3,
  reminderHoursBeforeDeadline: Number(process.env.SLA_REMINDER_HOURS) || 24,
  timeZone: process.env.SLA_TIME_ZONE || 'Asia/Makassar',
  cronSchedule: process.env.SLA_CRON_SCHEDULE || '*/15 * * * *',
  enabledNotificationTypes: {
    DIRECTIVE_ASSIGNED: true,
    TASK_ASSIGNED: true,
    TASK_REASSIGNED: true,
    TASK_SUBMITTED: true,
    TASK_REVISION_REQUIRED: true,
    TASK_VERIFIED: true,
    TASK_ESCALATED: true,
    DEADLINE_SOON: true,
    OVERDUE: true,
  },
  slaHours: {
    RENDAH: 72,
    SEDANG: 48,
    TINGGI: 24,
    URGENT: 8,
  },
};

let currentConfig = { ...DEFAULT_CONFIG };

function loadConfigFromDisk() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      currentConfig = {
        ...DEFAULT_CONFIG,
        ...parsed,
        enabledNotificationTypes: {
          ...DEFAULT_CONFIG.enabledNotificationTypes,
          ...(parsed.enabledNotificationTypes || {}),
        },
        slaHours: {
          ...DEFAULT_CONFIG.slaHours,
          ...(parsed.slaHours || {}),
        },
      };
    }
  } catch (err) {
    console.warn('[SystemConfig] Gagal membaca konfigurasi dari file, menggunakan default:', err.message);
  }
}

function saveConfigToDisk() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2), 'utf8');
  } catch (err) {
    console.warn('[SystemConfig] Gagal menyimpan konfigurasi ke file:', err.message);
  }
}

// Inisialisasi saat modul dimuat
loadConfigFromDisk();

function getConfig() {
  return JSON.parse(JSON.stringify(currentConfig));
}

function updateConfig(newValues) {
  if (!newValues || typeof newValues !== 'object') {
    throw new Error('Payload konfigurasi tidak valid.');
  }

  const updated = { ...currentConfig };

  if (typeof newValues.telegramEnabled === 'boolean') {
    updated.telegramEnabled = newValues.telegramEnabled;
  }

  if (newValues.maxRetryAttempts !== undefined) {
    const attempts = Number(newValues.maxRetryAttempts);
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 10) {
      throw new Error('Maksimum percobaan retry harus berupa bilangan bulat antara 1 dan 10.');
    }
    updated.maxRetryAttempts = attempts;
  }

  if (newValues.reminderHoursBeforeDeadline !== undefined) {
    const hours = Number(newValues.reminderHoursBeforeDeadline);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
      throw new Error('Pengingat deadline harus berupa angka positif antara 1 dan 168 jam.');
    }
    updated.reminderHoursBeforeDeadline = hours;
  }

  if (typeof newValues.timeZone === 'string' && newValues.timeZone.trim()) {
    updated.timeZone = newValues.timeZone.trim();
  }

  if (typeof newValues.cronSchedule === 'string' && newValues.cronSchedule.trim()) {
    updated.cronSchedule = newValues.cronSchedule.trim();
  }

  if (newValues.enabledNotificationTypes && typeof newValues.enabledNotificationTypes === 'object') {
    const validKeys = Object.keys(DEFAULT_CONFIG.enabledNotificationTypes);
    const nextTypes = { ...updated.enabledNotificationTypes };
    for (const [key, val] of Object.entries(newValues.enabledNotificationTypes)) {
      if (validKeys.includes(key)) {
        nextTypes[key] = Boolean(val);
      }
    }
    updated.enabledNotificationTypes = nextTypes;
  }

  if (newValues.slaHours && typeof newValues.slaHours === 'object') {
    const validPriorities = ['RENDAH', 'SEDANG', 'TINGGI', 'URGENT'];
    const nextSla = { ...updated.slaHours };
    for (const [key, val] of Object.entries(newValues.slaHours)) {
      if (validPriorities.includes(key)) {
        const h = Number(val);
        if (!Number.isFinite(h) || h <= 0) {
          throw new Error(`Target SLA untuk prioritas ${key} harus berupa angka positif.`);
        }
        nextSla[key] = h;
      }
    }
    updated.slaHours = nextSla;
  }

  currentConfig = updated;
  saveConfigToDisk();

  return getConfig();
}

function isTelegramEnabled() {
  return Boolean(currentConfig.telegramEnabled);
}

function isNotificationTypeEnabled(type) {
  if (!type) return false;
  return currentConfig.enabledNotificationTypes[type] !== false;
}

function getMaxRetryAttempts() {
  return currentConfig.maxRetryAttempts || 3;
}

function getReminderHours() {
  return currentConfig.reminderHoursBeforeDeadline || 24;
}

function getTimeZone() {
  return currentConfig.timeZone || 'Asia/Makassar';
}

function getCronExpression() {
  return currentConfig.cronSchedule || '*/15 * * * *';
}

function getSlaHours() {
  return { ...currentConfig.slaHours };
}

// Untuk keperluan testing
function _resetConfig() {
  currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch (_) {}
}

module.exports = {
  getConfig,
  updateConfig,
  isTelegramEnabled,
  isNotificationTypeEnabled,
  getMaxRetryAttempts,
  getReminderHours,
  getTimeZone,
  getCronExpression,
  getSlaHours,
  _resetConfig,
};
