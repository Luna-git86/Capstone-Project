// Backend/config/notificationConfig.js
const systemConfigStore = require('./systemConfigStore');

const DEFAULT_CRON_SCHEDULE = '*/15 * * * *';
const DEFAULT_REMINDER_HOURS = 24;
const DEFAULT_TIME_ZONE = 'Asia/Makassar';

function getReminderHours() {
  return systemConfigStore.getReminderHours();
}

function getTimeZone() {
  return systemConfigStore.getTimeZone();
}

function getCronExpression() {
  return systemConfigStore.getCronExpression();
}

const DEFAULT_ENABLED_TYPES = {
  DIRECTIVE_ASSIGNED: true,
  TASK_ASSIGNED: true,
  TASK_REASSIGNED: true,
  TASK_SUBMITTED: true,
  TASK_REVISION_REQUIRED: true,
  TASK_VERIFIED: true,
  TASK_ESCALATED: true,
  REPORT_SUBMITTED: true,
  REPORT_REJECTED: true,
  REPORT_RESUBMITTED: true,
  DEADLINE_SOON: true,
  OVERDUE: true,
};

function isNotificationTypeEnabled(type) {
  // Jika ada env eksplisit yang menonaktifkan, hormati env
  const envKey = `NOTIFY_${String(type || '').toUpperCase()}_ENABLED`;
  const raw = process.env[envKey];
  if (raw === '0' || String(raw).toLowerCase() === 'false') return false;

  return systemConfigStore.isNotificationTypeEnabled(type);
}

module.exports = {
  DEFAULT_CRON_SCHEDULE,
  DEFAULT_REMINDER_HOURS,
  DEFAULT_TIME_ZONE,
  DEFAULT_ENABLED_TYPES,
  getReminderHours,
  getTimeZone,
  getCronExpression,
  isNotificationTypeEnabled,
};
