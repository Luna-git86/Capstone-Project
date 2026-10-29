const prisma = require('../db');

async function getNotificationLogs(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.pageSize || '25', 10)));
    const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
    const validStatuses = ['PENDING', 'SENT', 'FAILED'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Filter status log tidak valid.' });
    }

    const where = status ? { status } : {};
    const [total, logs] = await Promise.all([
      prisma.notificationLog.count({ where }),
      prisma.notificationLog.findMany({
        where,
        include: {
          ticket: { select: { id: true, judul: true, prioritas: true, status: true } },
          recipient: { select: { id: true, nama: true, role: true, divisiId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.status(200).json({
      data: logs.map((log) => ({
        id: log.id,
        ticketId: log.ticketId,
        ticketTitle: log.ticket?.judul || '-',
        recipientId: log.recipientId,
        recipientName: log.recipient?.nama || '-',
        recipientRole: log.recipient?.role || '-',
        type: log.type,
        status: log.status,
        message: log.message,
        attempts: log.attempts,
        errorMessage: log.errorMessage,
        sentAt: log.sentAt,
        createdAt: log.createdAt,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error('Error getNotificationLogs:', error);
    return res.status(500).json({ message: 'Gagal mengambil log notifikasi.' });
  }
}

module.exports = { getNotificationLogs };
