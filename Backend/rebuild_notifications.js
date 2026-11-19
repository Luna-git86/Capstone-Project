const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

const {
  EVENT_TASK_ASSIGNED,
  EVENT_TASK_SUBMITTED,
  EVENT_TASK_VERIFIED,
  EVENT_REPORT_SUBMITTED,
  buildNotificationMessage,
} = require('./services/ticketNotificationService');

async function rebuild() {
  console.log('--- MENGHAPUS HISTORI NOTIFIKASI LAMA ---');
  const deleted = await prisma.notificationLog.deleteMany({});
  console.log(`Berhasil menghapus ${deleted.count} notifikasi lama.`);

  console.log('--- MEMBACA DAFTAR TIKET YANG MASIH ADA ---');
  const tickets = await prisma.ticket.findMany({
    include: {
      pembuat: true,
      pelaksana: true,
      penanggungJawab: true,
      divisi: true,
    },
    orderBy: { id: 'asc' },
  });

  console.log(`Ditemukan ${tickets.length} tiket saat ini.`);

  const newLogs = [];

  for (const t of tickets) {
    if (t.jenisTiket === 'LAPORAN') {
      // Tiket Laporan Masalah (misal #T-044, #T-045)
      // Penerima adalah Koordinator Pelayanan Medis
      const koordinator = await prisma.user.findFirst({
        where: { divisiId: t.divisiId, role: 'KOORDINATOR' },
      });
      const recipientId = koordinator ? koordinator.id : (t.penanggungJawabId || 9);

      const message = buildNotificationMessage({
        type: EVENT_REPORT_SUBMITTED,
        ticket: t,
        actor: t.pembuat,
      });

      newLogs.push({
        ticketId: t.id,
        recipientId: recipientId,
        type: EVENT_REPORT_SUBMITTED,
        status: 'SENT',
        message,
        dedupeKey: `ticket:${t.id}:REPORT_SUBMITTED:init:${recipientId}`,
        attempts: 1,
        sentAt: new Date(),
      });
    } else if (t.jenisTiket === 'TUGAS') {
      // Tiket Tugas Operasional
      if (t.status === 'SELESAI') {
        // Tugas selesai (misal #T-041)
        // Notifikasi pengesahan penyelesaian tugas ke staf pelaksana
        if (t.pelaksanaId) {
          const message = buildNotificationMessage({
            type: EVENT_TASK_VERIFIED,
            ticket: t,
            actor: t.pembuat || t.penanggungJawab,
          });

          newLogs.push({
            ticketId: t.id,
            recipientId: t.pelaksanaId,
            type: EVENT_TASK_VERIFIED,
            status: 'SENT',
            message,
            dedupeKey: `ticket:${t.id}:TASK_VERIFIED:init:${t.pelaksanaId}`,
            attempts: 1,
            sentAt: new Date(),
          });
        }
      } else if (t.status === 'MENUNGGU_VALIDASI') {
        // Tugas menunggu validasi hasil pengerjaan (misal #T-042, #T-043)
        // 1. Notifikasi ke Koordinator bahwa pekerjaan telah dikirim oleh staf
        const recipientKoor = t.penanggungJawabId || t.pembuatId || 9;
        const msgSubmitted = buildNotificationMessage({
          type: EVENT_TASK_SUBMITTED,
          ticket: t,
          actor: t.pelaksana,
        });

        newLogs.push({
          ticketId: t.id,
          recipientId: recipientKoor,
          type: EVENT_TASK_SUBMITTED,
          status: 'SENT',
          message: msgSubmitted,
          dedupeKey: `ticket:${t.id}:TASK_SUBMITTED:init:${recipientKoor}`,
          attempts: 1,
          sentAt: new Date(),
        });

        // 2. Notifikasi penugasan untuk staf pelaksana
        if (t.pelaksanaId) {
          const msgAssigned = buildNotificationMessage({
            type: EVENT_TASK_ASSIGNED,
            ticket: t,
            actor: t.pembuat,
          });

          newLogs.push({
            ticketId: t.id,
            recipientId: t.pelaksanaId,
            type: EVENT_TASK_ASSIGNED,
            status: 'SENT',
            message: msgAssigned,
            dedupeKey: `ticket:${t.id}:TASK_ASSIGNED:init:${t.pelaksanaId}`,
            attempts: 1,
            sentAt: new Date(),
          });
        }
      } else if (t.status === 'DIPROSES') {
        // Tugas sedang dikerjakan
        if (t.pelaksanaId) {
          const message = buildNotificationMessage({
            type: EVENT_TASK_ASSIGNED,
            ticket: t,
            actor: t.pembuat,
          });

          newLogs.push({
            ticketId: t.id,
            recipientId: t.pelaksanaId,
            type: EVENT_TASK_ASSIGNED,
            status: 'SENT',
            message,
            dedupeKey: `ticket:${t.id}:TASK_ASSIGNED:init:${t.pelaksanaId}`,
            attempts: 1,
            sentAt: new Date(),
          });
        }
      }
    }
  }

  console.log(`Membuat ${newLogs.length} notifikasi baru yang relevan...`);
  for (const log of newLogs) {
    const created = await prisma.notificationLog.create({ data: log });
    console.log(`[OK] ID ${created.id}: Tiket #${log.ticketId} (${log.type}) -> Penerima ID ${log.recipientId}`);
  }

  console.log('--- REBUILD NOTIFIKASI SELESAI ---');
  await prisma.$disconnect();
}

rebuild().catch((err) => {
  console.error('Error rebuild notifications:', err);
  process.exit(1);
});
