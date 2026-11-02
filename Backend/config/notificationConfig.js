function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const DEFAULT_CRON_SCHEDULE = '*/15 * * * *';
const DEFAULT_REMINDER_HOURS = 24;
const DEFAULT_TIME_ZONE = 'Asia/Makassar';

function getReminderHours() {
  return positiveNumber(process.env.SLA_REMINDER_HOURS, DEFAULT_REMINDER_HOURS);
}

function getTimeZone() {
  return process.env.SLA_TIME_ZONE || DEFAULT_TIME_ZONE;
}

function getCronExpression() {
  return process.env.SLA_CRON_SCHEDULE || DEFAULT_CRON_SCHEDULE;
}

const DEFAULT_ENABLED_TYPES = {
  DIRECTIVE_ASSIGNED: true,
  TASK_ASSIGNED: true,
  TASK_REASSIGNED: true,
  TASK_SUBMITTED: true,
  TASK_REVISION_REQUIRED: true,
  TASK_VERIFIED: true,
  TASK_ESCALATED: true,
  DEADLINE_SOON: true,
  OVERDUE: true,
};

function isNotificationTypeEnabled(type) {
  const envKey = `NOTIFY_${String(type || '').toUpperCase()}_ENABLED`;
  const raw = process.env[envKey];
  if (raw === '0' || String(raw).toLowerCase() === 'false') return false;
  if (raw === '1' || String(raw).toLowerCase() === 'true') return true;
  return DEFAULT_ENABLED_TYPES[type] !== false;
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
