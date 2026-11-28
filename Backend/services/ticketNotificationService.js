const { getTimeZone } = require('../config/notificationConfig');

const EVENT_DIRECTIVE_ASSIGNED = 'DIRECTIVE_ASSIGNED';
const EVENT_TASK_ASSIGNED = 'TASK_ASSIGNED';
const EVENT_TASK_REASSIGNED = 'TASK_REASSIGNED';
const EVENT_TASK_SUBMITTED = 'TASK_SUBMITTED';
const EVENT_TASK_REVISION_REQUIRED = 'TASK_REVISION_REQUIRED';
const EVENT_TASK_VERIFIED = 'TASK_VERIFIED';
const EVENT_TASK_ESCALATED = 'TASK_ESCALATED';
const EVENT_REPORT_SUBMITTED = 'REPORT_SUBMITTED';
const EVENT_REPORT_REJECTED = 'REPORT_REJECTED';
const EVENT_REPORT_RESUBMITTED = 'REPORT_RESUBMITTED';

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

  // Laporan Masalah Baru (MENUNGGU_TRIASE tanpa pelaksana)
  if (!previous && current.status === 'MENUNGGU_TRIASE' && Array.isArray(options.koordinatorIds)) {
    for (const koorId of options.koordinatorIds) {
      events.push({
        type: EVENT_REPORT_SUBMITTED,
        recipientId: koorId,
        occurrenceToken: `report:created:${current.id}`,
      });
    }
  }

  // Laporan Masalah Ditolak (Kembalikan ke Pelapor / pembuatId)
  if (
    current.status === 'DITOLAK' &&
    previous?.status === 'MENUNGGU_TRIASE' &&
    current.pembuatId
  ) {
    events.push({
      type: EVENT_REPORT_REJECTED,
      recipientId: current.pembuatId,
      occurrenceToken: workflowOccurrenceToken(previous, current),
    });
  }

  // Revisi Laporan Dikirim Ulang (Dari DITOLAK ke MENUNGGU_TRIASE)
  if (
    current.status === 'MENUNGGU_TRIASE' &&
    previous?.status === 'DITOLAK' &&
    Array.isArray(options.koordinatorIds)
  ) {
    for (const koorId of options.koordinatorIds) {
      events.push({
        type: EVENT_REPORT_RESUBMITTED,
        recipientId: koorId,
        occurrenceToken: workflowOccurrenceToken(previous, current),
      });
    }
  }

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


function formatJenisAwam(type) {
  const map = {
    [EVENT_DIRECTIVE_ASSIGNED]: 'Arahan Pimpinan',
    [EVENT_TASK_ASSIGNED]: 'Penugasan Tugas Baru',
    [EVENT_TASK_REASSIGNED]: 'Pengalihan Tugas',
    [EVENT_TASK_SUBMITTED]: 'Pengajuan Tugas Selesai',
    [EVENT_TASK_REVISION_REQUIRED]: 'Permintaan Perbaikan Tugas',
    [EVENT_TASK_VERIFIED]: 'Tugas Disahkan Selesai',
    [EVENT_TASK_ESCALATED]: 'Eskalasi Kendala Tugas',
    [EVENT_REPORT_SUBMITTED]: 'Laporan Masalah Baru',
    [EVENT_REPORT_REJECTED]: 'Laporan Masalah Dikembalikan',
    [EVENT_REPORT_RESUBMITTED]: 'Pengajuan Ulang Laporan Masalah',
    DEADLINE_SOON: 'Pengingat Mendekati Batas Waktu',
    OVERDUE: 'Peringatan Melewati Batas Waktu',
  };
  return map[type] || String(type || '-').replace(/_/g, ' ');
}

function formatStatusAwam(status) {
  const map = {
    MENUNGGU_TRIASE: 'Menunggu Peninjauan',
    DIPROSES: 'Sedang Dikerjakan',
    MENUNGGU_VALIDASI: 'Menunggu Pemeriksaan',
    HOLD_ESKALASI: 'Tertahan (Butuh Tindak Lanjut)',
    SELESAI: 'Selesai',
    DITOLAK: 'Dikembalikan / Ditolak',
    BARU: 'Baru',
  };
  return map[status] || String(status || '-').replace(/_/g, ' ');
}

function formatPrioritasAwam(prioritas) {
  const map = {
    LOW: 'Rendah (LOW)',
    MEDIUM: 'Sedang (MEDIUM)',
    HIGH: 'Tinggi (HIGH)',
  };
  return map[prioritas] || prioritas || '-';
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
    [EVENT_REPORT_SUBMITTED]: '[LAPORAN MASALAH BARU]',
    [EVENT_REPORT_REJECTED]: '[LAPORAN MASALAH DITOLAK]',
    [EVENT_REPORT_RESUBMITTED]: '[REVISI LAPORAN MASALAH]',
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
    [EVENT_REPORT_SUBMITTED]: 'Terdapat laporan masalah baru. Silakan buka aplikasi pada Menu Laporan untuk meninjau dan menugaskan staf.',
    [EVENT_REPORT_REJECTED]: 'Laporan Anda dikembalikan/ditolak oleh atasan. Silakan buka aplikasi pada menu Laporan Saya untuk melihat catatan evaluasi dan melakukan revisi.',
    [EVENT_REPORT_RESUBMITTED]: 'Pelapor telah memperbarui laporan masalah yang sebelumnya ditolak. Silakan buka Menu Laporan untuk meninjau kembali.',
    DEADLINE_SOON: 'Segera selesaikan tugas sebelum melewati deadline.',
    OVERDUE: 'Tugas telah melewati batas waktu penyelesaian.',
  };

  const jenisText = formatJenisAwam(type);
  const statusText = formatStatusAwam(ticket.status);
  const prioritasText = formatPrioritasAwam(ticket.prioritas);

  const lines = [
    headings[type] || `[NOTIFIKASI ${type}]`,
    '',
    `Jenis: ${jenisText}`,
    `ID Tiket: ${formatTicketCode(ticket.id)}`,
    `Judul: ${ticket.judul}`,
    `Prioritas: ${prioritasText}`,
    `Deadline: ${formatDeadline(ticket.deadline, timeZone)}`,
    `Status: ${statusText}`,
  ];

  if ((type === EVENT_TASK_REVISION_REQUIRED || type === EVENT_REPORT_REJECTED) && ticket.catatanRevisi) {
    lines.push(`Catatan revisi: ${ticket.catatanRevisi}`);
  }

  if (actor?.nama) {
    lines.push(`Dari: ${actor.nama}`);
  }

  lines.push('', footers[type] || 'Silakan buka aplikasi untuk melihat detail tugas.');
  return lines.join('\n');
}

async function dispatchTicketNotifications({ previous, current, actor }, deps = {}) {
  let koordinatorIds = deps.koordinatorIds;
  if (!koordinatorIds && current?.divisiId && (
    (!previous && current.status === 'MENUNGGU_TRIASE') ||
    (previous?.status === 'DITOLAK' && current.status === 'MENUNGGU_TRIASE')
  )) {
    try {
      const db = deps.db || require('../db');
      const koorList = await db.user.findMany({
        where: { divisiId: current.divisiId, role: 'KOORDINATOR' },
        select: { id: true },
      });
      koordinatorIds = koorList.map((k) => k.id);
      if (koordinatorIds.length === 0) {
        const kadivList = await db.user.findMany({
          where: { divisiId: current.divisiId, role: 'KADIV' },
          select: { id: true },
        });
        koordinatorIds = kadivList.map((k) => k.id);
      }
    } catch (e) {
      // ignore
    }
  }

  const effectiveDeps = koordinatorIds ? { ...deps, koordinatorIds } : deps;
  const planned = planTicketNotificationEvents({ previous, current, actor }, effectiveDeps);
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
  EVENT_REPORT_SUBMITTED,
  EVENT_REPORT_REJECTED,
  EVENT_REPORT_RESUBMITTED,
  formatTicketCode,
  buildDedupeKey,
  planTicketNotificationEvents,
  buildNotificationMessage,
  dispatchTicketNotifications,
};
