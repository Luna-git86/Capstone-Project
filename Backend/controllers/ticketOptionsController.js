// Backend/controllers/ticketOptionsController.js
const prisma = require('../db');

const getTicketOptions = async (req, res) => {
  try {
    // 1. Ambil seluruh daftar divisi agar pelaporan & disposisi lintas divisi tidak terblokir
    const divisi = await prisma.divisi.findMany({
      orderBy: { nama: 'asc' },
      select: {
        id: true,
        nama: true,
      },
    });

    const rawDivisiId = req.query.divisiId;
    let wherePelaksana = { role: 'STAF' };

    // 2. Jika parameter ?divisiId= dikirim dari Frontend, saring staf sesuai divisi tersebut
    if (rawDivisiId !== undefined && rawDivisiId !== '') {
      const divisiId = Number(rawDivisiId);

      if (!Number.isInteger(divisiId) || divisiId <= 0) {
        return res.status(400).json({
          message: 'ID divisi tidak valid.',
        });
      }

      const targetDivisi = await prisma.divisi.findUnique({
        where: { id: divisiId },
      });

      if (!targetDivisi) {
        return res.status(404).json({
          message: 'Divisi tidak ditemukan.',
        });
      }

      wherePelaksana = {
        divisiId,
        role: 'STAF',
      };
    }

    // 3. Ambil daftar staf pelaksana beserta noHp untuk integrasi WhatsApp
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