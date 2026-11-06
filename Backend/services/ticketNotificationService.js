const { getTimeZone } = require('../config/notificationConfig');

const EVENT_DIRECTIVE_ASSIGNED = 'DIRECTIVE_ASSIGNED';
const EVENT_TASK_ASSIGNED = 'TASK_ASSIGNED';
const EVENT_TASK_REASSIGNED = 'TASK_REASSIGNED';
const EVENT_TASK_SUBMITTED = 'TASK_SUBMITTED';
const EVENT_TASK_REVISION_REQUIRED = 'TASK_REVISION_REQUIRED';
const EVENT_TASK_VERIFIED = 'TASK_VERIFIED';
const EVENT_TASK_ESCALATED = 'TASK_ESCALATED';

function formatTicketCode(id) {
  return `#T-${String(id).padStart(3, '0')}`;
}

function formatDeadline(value, timeZone) {
  if (!value) return 'Belum ditentukan';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Belum ditentukan';
  return date.toLocaleString('id-ID', {
    timeZone: timeZone || getTimeZone(),
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function buildDedupeKey({ ticketId, type, recipientId, occurrenceToken }) {
  return `ticket:${ticketId}:${type}:${occurrenceToken}:${recipientId}`;
}

function workflowOccurrenceToken(previous, current) {
  const from = previous?.status || 'none';
  const at = current?.updatedAt ? new Date(current.updatedAt).toISOString() : 'unknown';
  return `from:${from}:at:${at}`;
}

function planTicketNotificationEvents({ previous, current, actor }, options = {}) {
  const events = [];
  if (!current?.id) return events;

  const prevAssignee = previous?.pelaksanaId ?? null;
  const nextAssignee = current.pelaksanaId ?? null;

  if (nextAssignee && nextAssignee !== prevAssignee) {
    events.push({
      type: prevAssignee
        ? EVENT_TASK_REASSIGNED
        : (['KADIV', 'DIREKTUR'].includes(actor?.role) ? EVENT_DIRECTIVE_ASSIGNED : EVENT_TASK_ASSIGNED),
      recipientId: nextAssignee,
      occurrenceToken: `from:${prevAssignee || 'none'}:to:${nextAssignee}`,
    });
  }

  if (!previous || previous.status === current.status) {
    return events;
  }

  if (current.status === 'MENUNGGU_VALIDASI' && current.penanggungJawabId) {
    events.push({
      type: EVENT_TASK_SUBMITTED,
      recipientId: current.penanggungJawabId,
      occurrenceToken: workflowOccurrenceToken(previous, current),
    });
  }

  if (
    current.status === 'DIPROSES' &&
    previous.status === 'MENUNGGU_VALIDASI' &&
    nextAssignee
  ) {
    events.push({
      type: EVENT_TASK_REVISION_REQUIRED,
      recipientId: nextAssignee,
      occurrenceToken: workflowOccurrenceToken(previous, current),
    });
  }

  if (
    options.includeEscalation &&
    current.status === 'HOLD_ESKALASI' &&
    current.penanggungJawabId
  ) {
    events.push({
      type: EVENT_TASK_ESCALATED,
      recipientId: current.penanggungJawabId,
      occurrenceToken: workflowOccurrenceToken(previous, current),
    });
  }

  if (current.status === 'SELESAI' && nextAssignee) {
    events.push({
      type: EVENT_TASK_VERIFIED,
      recipientId: nextAssignee,
      occurrenceToken: workflowOccurrenceToken(previous, current),
    });
  }

  return events;
}

function buildNotificationMessage({ type, ticket, actor, timeZone }) {
  const headings = {
    [EVENT_DIRECTIVE_ASSIGNED]: actor?.role === 'DIREKTUR' ? '[NOTIFIKASI ARAHAN DIREKSI]' : '[NOTIFIKASI ARAHAN DIVISI]',
    [EVENT_TASK_ASSIGNED]: '[NOTIFIKASI TUGAS BARU]',
    [EVENT_TASK_REASSIGNED]: '[NOTIFIKASI PENUGASAN ULANG]',
    [EVENT_TASK_SUBMITTED]: '[NOTIFIKASI PEKERJAAN DIKIRIM]',
    [EVENT_TASK_REVISION_REQUIRED]: '[NOTIFIKASI REVISI TUGAS]',
    [EVENT_TASK_VERIFIED]: '[NOTIFIKASI TUGAS TERVERIFIKASI]',
    [EVENT_TASK_ESCALATED]: '[NOTIFIKASI ESKALASI TUGAS]',
    DEADLINE_SOON: '[PENGINGAT DEADLINE]',
    OVERDUE: '[NOTIFIKASI OVERDUE]',
  };

  const footers = {
    [EVENT_DIRECTIVE_ASSIGNED]: actor?.role === 'DIREKTUR'
      ? 'Direktur telah menerbitkan arahan direksi. Silakan tindak lanjuti bersama unit kerja Anda.'
      : 'Kepala Divisi telah menerbitkan arahan. Silakan buat tiket operasional untuk Staf.',
    [EVENT_TASK_ASSIGNED]: 'Silakan buka aplikasi untuk melihat detail dan mengerjakan tugas.',
    [EVENT_TASK_REASSIGNED]: 'Tugas ini dialihkan kepada Anda. Silakan buka aplikasi untuk mengerjakannya.',
    [EVENT_TASK_SUBMITTED]: 'Pekerjaan telah dikirim untuk pemeriksaan. Silakan buka aplikasi untuk meninjau.',
    [EVENT_TASK_REVISION_REQUIRED]: 'Pekerjaan perlu diperbaiki. Silakan buka aplikasi untuk melihat detail revisi.',
    [EVENT_TASK_VERIFIED]: 'Pekerjaan telah diverifikasi dan tugas dinyatakan selesai.',
    [EVENT_TASK_ESCALATED]: 'Tugas mengalami kendala/eskalasi dan memerlukan tindak lanjut pimpinan.',
    DEADLINE_SOON: 'Segera selesaikan tugas sebelum melewati deadline.',
    OVERDUE: 'Tugas telah melewati batas waktu penyelesaian.',
  };

  const lines = [
    headings[type] || `[NOTIFIKASI ${type}]`,
    '',
    `Jenis: ${type}`,
    `ID Tiket: ${formatTicketCode(ticket.id)}`,
    `Judul: ${ticket.judul}`,
    `Prioritas: ${ticket.prioritas || '-'}`,
    `Deadline: ${formatDeadline(ticket.deadline, timeZone)}`,
    `Status: ${ticket.status || '-'}`,
  ];

  if (type === EVENT_TASK_REVISION_REQUIRED && ticket.catatanRevisi) {
    lines.push(`Catatan revisi: ${ticket.catatanRevisi}`);
  }

  if (actor?.nama) {
    lines.push(`Dari: ${actor.nama}`);
  }

  lines.push('', footers[type] || 'Silakan buka aplikasi untuk melihat detail tugas.');
  return lines.join('\n');
}

async function dispatchTicketNotifications({ previous, current, actor }, deps = {}) {
  const planned = planTicketNotificationEvents({ previous, current, actor }, deps);
  const notifyTicketEvent =
    deps.notifyTicketEvent || require('./telegramService').notifyTicketEvent;
  const timeZone = deps.timeZone || getTimeZone();
  const results = [];

  for (const event of planned) {
    try {
      const result = await notifyTicketEvent(
        {
          ticketId: current.id,
          recipientId: event.recipientId,
          type: event.type,
          message: buildNotificationMessage({
            type: event.type,
            ticket: current,
            actor,
            timeZone,
          }),
          occurrenceToken: event.occurrenceToken,
        },
        deps
      );
      results.push({ ...event, result });
    } catch (error) {
      console.error(
        `[Notifikasi] Gagal memproses ${event.type} tiket #${current.id} penerima ${event.recipientId}:`,
        error.message
      );
      results.push({
        ...event,
        result: { sent: false, error: error.message },
      });
    }
  }

  return results;
}

module.exports = {
  EVENT_DIRECTIVE_ASSIGNED,
  EVENT_TASK_ASSIGNED,
  EVENT_TASK_REASSIGNED,
  EVENT_TASK_SUBMITTED,
  EVENT_TASK_REVISION_REQUIRED,
  EVENT_TASK_VERIFIED,
  EVENT_TASK_ESCALATED,
  formatTicketCode,
  buildDedupeKey,
  planTicketNotificationEvents,
  buildNotificationMessage,
  dispatchTicketNotifications,
};
