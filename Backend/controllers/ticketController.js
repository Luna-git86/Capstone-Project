
const prisma = require('../db');
const { notifyTicketStatus } = require('../services/telegramService');

const createTicket = async (req, res) => {
  try {
    const role = req.user.role;

    // Hanya DIREKTUR dan KADIV yang boleh membuat tugas.
    if (!['DIREKTUR', 'KADIV'].includes(role)) {
      return res.status(403).json({
        message: 'Hanya Direktur dan Kepala Divisi yang boleh membuat tugas.',
      });
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

    // KADIV hanya dapat membuat tugas untuk divisinya sendiri.
    // DIREKTUR dapat memilih divisi mana pun.
    if (
      role === 'KADIV' &&
      (
        !req.user.divisiId ||
        Number(req.user.divisiId) !== selectedDivisiId
      )
    ) {
      return res.status(403).json({
        message: 'KADIV hanya boleh membuat tugas untuk divisinya sendiri.',
      });
    }

    const divisi = await prisma.divisi.findUnique({
      where: { id: selectedDivisiId },
    });

    if (!divisi) {
      return res.status(400).json({
        message: 'Divisi tidak ditemukan.',
      });
    }

    // Validasi pelaksana jika pengguna dipilih.
    let selectedPelaksanaId = null;

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
  getTickets,
  updateTicketStatus,
};
