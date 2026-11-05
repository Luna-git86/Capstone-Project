// Backend/controllers/ticketOptionsController.js
const prisma = require('../db');

const getTicketOptions = async (req, res) => {
  try {
    const callerRole = req.user?.role;
    const callerDivisiId = req.user?.divisiId ? Number(req.user.divisiId) : null;

    // 1. Ambil seluruh daftar divisi agar pengguna dapat memilih Divisi Tujuan
    const divisi = await prisma.divisi.findMany({
      orderBy: { nama: 'asc' },
      select: {
        id: true,
        nama: true,
      },
    });

    const rawDivisiId = req.query.divisiId;
    let selectedDivisiId = null;

    if (rawDivisiId !== undefined && rawDivisiId !== '') {
      selectedDivisiId = Number(rawDivisiId);
      if (!Number.isInteger(selectedDivisiId) || selectedDivisiId <= 0) {
        return res.status(400).json({
          message: 'ID divisi tidak valid.',
        });
      }
    } else if (callerDivisiId && ['KADIV', 'KOORDINATOR'].includes(callerRole)) {
      selectedDivisiId = callerDivisiId;
    }

    // 2. Tentukan target role pelaksana sesuai aturan hierarki:
    // - DIREKTUR -> KADIV
    // - KADIV -> KOORDINATOR
    // - KOORDINATOR -> STAF
    // - Lainnya / Default -> STAF
    let allowedRoles = ['STAF'];
    if (callerRole === 'DIREKTUR') {
      allowedRoles = ['KADIV'];
    } else if (callerRole === 'KADIV') {
      allowedRoles = ['KOORDINATOR'];
    } else if (callerRole === 'KOORDINATOR') {
      allowedRoles = ['STAF'];
    }

    const wherePelaksana = {
      role: { in: allowedRoles },
    };

    if (selectedDivisiId) {
      wherePelaksana.divisiId = selectedDivisiId;
    }

    // 3. Ambil daftar user pelaksana yang berwenang
    const pelaksana = await prisma.user.findMany({
      where: wherePelaksana,
      orderBy: { nama: 'asc' },
      select: {
        id: true,
        nama: true,
        noHp: true,
        role: true,
        divisiId: true,
        divisi: {
          select: { id: true, nama: true },
        },
      },
    });

    return res.status(200).json({
      divisi,
      pelaksana,
      data: { divisi, pelaksana }, // Menjaga kompatibilitas penuh di semua halaman
    });
  } catch (error) {
    console.error('Error getTicketOptions:', error);

    return res.status(500).json({
      message: 'Gagal mengambil data divisi dan pelaksana.',
    });
  }
};

module.exports = { getTicketOptions };
