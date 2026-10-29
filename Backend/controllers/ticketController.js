
const prisma = require('../db');
const { notifyTicketStatus, sendTelegramMessage } = require('../services/telegramService');

const createTicket = async (req, res) => {
  try {
    const role = req.user.role;

    // Koordinator dapat mengajukan tugas; penetapan pelaksana dilakukan oleh KADIV.
    if (!['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(role)) {
      return res.status(403).json({ message: 'Anda tidak memiliki izin membuat tugas.' });
    }

    const {
      judul,
      deskripsi,
      prioritas,
      divisiId,
      pelaksanaId,
      deadline,
    } = req.body;

    const pembuatId = Number(req.user.id);

    if (
      typeof judul !== 'string' ||
      !judul.trim() ||
      typeof deskripsi !== 'string' ||
      !deskripsi.trim()
    ) {
      return res.status(400).json({
        message: 'Judul dan deskripsi tugas wajib diisi.',
      });
    }

    const validPrioritas = ['LOW', 'MEDIUM', 'HIGH'];
    const selectedPrioritas = prioritas || 'LOW';

    if (!validPrioritas.includes(selectedPrioritas)) {
      return res.status(400).json({
        message: 'Prioritas harus LOW, MEDIUM, atau HIGH.',
      });
    }

    // Divisi wajib dipilih, kecuali KADIV menggunakan divisi akunnya.
    const rawDivisiId = divisiId || req.user.divisiId;
    const selectedDivisiId = Number(rawDivisiId);

    if (!Number.isInteger(selectedDivisiId) || selectedDivisiId <= 0) {
      return res.status(400).json({
        message: 'Silakan pilih divisi tujuan tugas.',
      });
    }

    // KADIV dan KOORDINATOR dibatasi pada divisinya sendiri.
    // Direktur dapat memilih divisi mana pun.
    if (
      ['KADIV', 'KOORDINATOR'].includes(role) &&
      (!req.user.divisiId || Number(req.user.divisiId) !== selectedDivisiId)
    ) {
      return res.status(403).json({ message: 'Anda hanya boleh membuat tugas untuk divisi sendiri.' });
    }

    const divisi = await prisma.divisi.findUnique({
      where: { id: selectedDivisiId },
    });

    if (!divisi) {
      return res.status(400).json({
        message: 'Divisi tidak ditemukan.',
      });
    }

    // Koordinator hanya mengajukan tugas. Penugasan staf harus dilakukan KADIV.
    let selectedPelaksanaId = null;
    if (role === 'KOORDINATOR' && pelaksanaId) {
      return res.status(403).json({ message: 'Koordinator tidak dapat menetapkan pelaksana. Tugas harus ditinjau Kepala Divisi.' });
    }

    if (
      pelaksanaId !== undefined &&
      pelaksanaId !== null &&
      pelaksanaId !== ''
    ) {
      selectedPelaksanaId = Number(pelaksanaId);

      if (
        !Number.isInteger(selectedPelaksanaId) ||
        selectedPelaksanaId <= 0
      ) {
        return res.status(400).json({
          message: 'Pelaksana tidak valid.',
        });
      }

      const pelaksana = await prisma.user.findUnique({
        where: { id: selectedPelaksanaId },
      });

      if (!pelaksana) {
        return res.status(400).json({
          message: 'Pengguna pelaksana tidak ditemukan.',
        });
      }

      if (
        pelaksana.divisiId !== selectedDivisiId ||
        pelaksana.role !== 'STAF'
      ) {
        return res.status(400).json({
          message: 'Pelaksana harus merupakan staf dari divisi yang dipilih.',
        });
      }
    }

    // Validasi deadline dari input type="date".
    let selectedDeadline = null;

    if (deadline !== undefined && deadline !== null && deadline !== '') {
      if (
        typeof deadline !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(deadline)
      ) {
        return res.status(400).json({
          message: 'Format deadline tidak valid.',
        });
      }

      const parsedDeadline = new Date(`${deadline}T00:00:00.000Z`);

      if (
        Number.isNaN(parsedDeadline.getTime()) ||
        parsedDeadline.toISOString().slice(0, 10) !== deadline
      ) {
        return res.status(400).json({
          message: 'Tanggal deadline tidak valid.',
        });
      }

      selectedDeadline = parsedDeadline;
    }

    const newTicket = await prisma.ticket.create({
      data: {
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        prioritas: selectedPrioritas,
        status: 'MENUNGGU_TRIASE',
        pembuatId,
        divisiId: selectedDivisiId,
        pelaksanaId: selectedPelaksanaId,
        deadline: selectedDeadline,
      },
      include: {
        pembuat: {
          select: { id: true, nama: true, role: true },
        },
        divisi: {
          select: { id: true, nama: true },
        },
        pelaksana: {
          select: { id: true, nama: true },
        },
      },
    });

    return res.status(201).json({
      message: 'Tugas berhasil dibuat!',
      data: newTicket,
    });
  } catch (error) {
    console.error('Error createTicket:', error);

    return res.status(500).json({
      message: 'Gagal membuat tugas pada server.',
    });
  }
};

const assignTicket = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const pelaksanaId = Number(req.body.pelaksanaId);
    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(pelaksanaId) || pelaksanaId <= 0) {
      return res.status(400).json({ message: 'ID tiket atau pelaksana tidak valid.' });
    }

    const { role, divisiId } = req.user;
    if (!['KADIV', 'DIREKTUR'].includes(role)) {
      return res.status(403).json({ message: 'Hanya Kepala Divisi atau Direktur yang dapat menetapkan pelaksana.' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { pembuat: { select: { id: true, nama: true } }, divisi: { select: { id: true, nama: true } } },
    });
    if (!ticket) return res.status(404).json({ message: 'Tiket tidak ditemukan.' });

    if (role === 'KADIV' && (!divisiId || Number(ticket.divisiId) !== Number(divisiId))) {
      return res.status(403).json({ message: 'Anda hanya dapat menetapkan tugas pada divisi sendiri.' });
    }
    if (['SELESAI', 'DITOLAK'].includes(ticket.status)) {
      return res.status(400).json({ message: 'Tiket yang sudah selesai atau ditolak tidak dapat didelegasikan.' });
    }

    const staff = await prisma.user.findUnique({
      where: { id: pelaksanaId },
      select: { id: true, nama: true, role: true, divisiId: true, telegramChatId: true },
    });
    if (!staff || staff.role !== 'STAF' || Number(staff.divisiId) !== Number(ticket.divisiId)) {
      return res.status(400).json({ message: 'Pelaksana harus merupakan staf dari divisi tiket.' });
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: { pelaksanaId, status: 'DIPROSES' },
      include: { pelaksana: { select: { id: true, nama: true, telegramChatId: true } }, divisi: { select: { id: true, nama: true } } },
    });

    const message = [
      '📋 PENUGASAN BARU — E-TICKETING RSIA QURRATA A’YUN',
      '',
      `Tiket: #${updated.id} — ${updated.judul}`,
      `Divisi: ${updated.divisi?.nama || '-'}`,
      `Urgensi: ${updated.prioritas === 'HIGH' ? 'DARURAT / TINGGI' : updated.prioritas === 'MEDIUM' ? 'SEDANG' : 'RENDAH'}`,
      `Tenggat: ${updated.deadline ? new Date(updated.deadline).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) + ' WITA' : 'Belum ditentukan'}`,
      'Silakan buka sistem E-Ticketing untuk menindaklanjuti tugas ini.',
    ].join('\\n');

    const dedupeKey = `ticket:${updated.id}:assigned:${staff.id}:${updated.updatedAt.getTime()}`;
    let log;
    try {
      log = await prisma.notificationLog.create({ data: {
        ticketId: updated.id, recipientId: staff.id, type: 'TASK_ASSIGNED',
        status: 'PENDING', message, telegramChatId: staff.telegramChatId || 'UNLINKED',
        dedupeKey, attempts: 1,
      } });
      if (!staff.telegramChatId) throw new Error('Telegram staf belum terhubung.');
      await sendTelegramMessage(String(staff.telegramChatId), message);
      await prisma.notificationLog.update({ where: { id: log.id }, data: { status: 'SENT', sentAt: new Date() } });
    } catch (notificationError) {
      if (log) await prisma.notificationLog.update({ where: { id: log.id }, data: { status: 'FAILED', errorMessage: String(notificationError.message).slice(0, 500) } });
      console.error('[Notifikasi tugas] Pengiriman gagal:', notificationError.message);
    }

    return res.status(200).json({ message: 'Tugas berhasil disetujui dan didelegasikan.', data: updated });
  } catch (error) {
    console.error('Error assignTicket:', error);
    return res.status(500).json({ message: 'Gagal menetapkan pelaksana tugas.' });
  }
};

const getTickets = async (req, res) => {
  try {
    const { role, divisiId } = req.user;
    let filter = {};

    // KADIV, KOORDINATOR, dan STAF hanya melihat tiket divisinya.
    if (['KADIV', 'KOORDINATOR', 'STAF'].includes(role)) {
      if (!divisiId) {
        return res.status(200).json({ data: [] });
      }

      filter = { divisiId: Number(divisiId) };
    }

    // ADMIN dan DIREKTUR dapat melihat seluruh tiket.
    const tickets = await prisma.ticket.findMany({
      where: filter,
      include: {
        pembuat: {
          select: { id: true, nama: true, role: true },
        },
        divisi: {
          select: { id: true, nama: true },
        },
        pelaksana: {
          select: {
            id: true,
            nama: true,
            noHp: true,
            telegramChatId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ data: tickets });
  } catch (error) {
    console.error('Error getTickets:', error);

    return res.status(500).json({
      message: 'Gagal mengambil daftar tiket.',
    });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: 'ID tiket tidak valid.',
      });
    }

    const validStatus = [
      'MENUNGGU_TRIASE',
      'DIPROSES',
      'SELESAI',
      'DITOLAK',
    ];

    if (!validStatus.includes(status)) {
      return res.status(400).json({
        message: 'Status tiket tidak valid.',
      });
    }

    const currentTicket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        pembuat: {
          select: {
            id: true,
            nama: true,
            telegramChatId: true,
          },
        },
      },
    });

    if (!currentTicket) {
      return res.status(404).json({
        message: 'Tiket tidak ditemukan.',
      });
    }

    // KADIV, KOORDINATOR, dan STAF hanya boleh mengubah
    // status tiket yang berada di divisinya sendiri.
    const { role, divisiId } = req.user;

    if (
      ['KADIV', 'KOORDINATOR', 'STAF'].includes(role) &&
      (
        !divisiId ||
        Number(currentTicket.divisiId) !== Number(divisiId)
      )
    ) {
      return res.status(403).json({
        message: 'Anda tidak memiliki akses ke tiket divisi ini.',
      });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        status,
        completedAt:
          status === 'SELESAI'
            ? currentTicket.completedAt || new Date()
            : null,
      },
    });

    // Kegagalan notifikasi tidak membatalkan perubahan status.
    if (currentTicket.status !== status) {
      try {
        await notifyTicketStatus({
          ticketId: updatedTicket.id,
          recipient: currentTicket.pembuat,
          ticketTitle: updatedTicket.judul,
          status,
          deadline: updatedTicket.deadline,
        });
      } catch (notificationError) {
        console.error(
          '[Telegram] Notifikasi status tiket gagal diproses:',
          notificationError.message
        );
      }
    }

    return res.status(200).json({
      message: `Status diperbarui menjadi ${status}!`,
      data: updatedTicket,
    });
  } catch (error) {
    console.error('Error updateTicketStatus:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        message: 'Tiket tidak ditemukan.',
      });
    }

    return res.status(500).json({
      message: 'Gagal memperbarui status tiket.',
    });
  }
};

module.exports = {
  createTicket,
  assignTicket,
  getTickets,
  updateTicketStatus,
};
