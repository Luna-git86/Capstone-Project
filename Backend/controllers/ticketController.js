// Backend/controllers/ticketController.js
const prisma = require('../db');

// Fungsi Membuat Tiket Baru
const createTicket = async (req, res) => {
  try {
    const { judul, deskripsi, prioritas, divisiId } = req.body;
    const pembuatId = Number(req.user.id);

    if (!judul || !deskripsi) {
      return res.status(400).json({
        message: 'Judul dan deskripsi tiket wajib diisi.',
      });
    }

    const validPrioritas = ['LOW', 'MEDIUM', 'HIGH'];
    const selectedPrioritas = prioritas || 'LOW';

    if (!validPrioritas.includes(selectedPrioritas)) {
      return res.status(400).json({
        message: 'Prioritas harus LOW, MEDIUM, atau HIGH.',
      });
    }

    const newTicket = await prisma.ticket.create({
      data: {
        judul,
        deskripsi,
        prioritas: selectedPrioritas,
        status: 'MENUNGGU_TRIASE',
        pembuatId,
        divisiId: divisiId ? Number(divisiId) : req.user.divisiId || null,
      },
    });

    return res.status(201).json({
      message: 'Tiket berhasil dibuat!',
      data: newTicket,
    });
  } catch (error) {
    console.error('Error createTicket:', error);
    return res.status(500).json({
      message: 'Gagal membuat tiket pada server.',
    });
  }
};

// Fungsi Mengambil Daftar Tiket
const getTickets = async (req, res) => {
  try {
    const { role, divisiId } = req.user;
    let filter = {};

    if (['KADIV', 'KOORDINATOR', 'STAF'].includes(role)) {
      if (!divisiId) {
        return res.status(200).json({ data: [] });
      }

      filter = { divisiId: Number(divisiId) };
    }

    const tickets = await prisma.ticket.findMany({
      where: filter,
      include: {
        pembuat: {
          select: {
            nama: true,
            role: true,
          },
        },
        divisi: {
          select: {
            nama: true,
          },
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

// Fungsi Memperbarui Status Tiket
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

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: { status },
    });

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

module.exports = { createTicket, getTickets, updateTicketStatus };