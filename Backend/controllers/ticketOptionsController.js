const prisma = require('../db');

const getTicketOptions = async (req, res) => {
  try {
    const role = req.user.role;
    const userDivisiId = req.user.divisiId
      ? Number(req.user.divisiId)
      : null;

    // Ambil daftar divisi.
    // KADIV hanya boleh melihat divisinya sendiri.
    const divisi = await prisma.divisi.findMany({
      where:
        role === 'KADIV'
          ? { id: userDivisiId || -1 }
          : {},
      orderBy: { nama: 'asc' },
      select: {
        id: true,
        nama: true,
      },
    });

    const rawDivisiId = req.query.divisiId;
    let pelaksana = [];

    // Ambil staf ketika divisi dipilih.
    if (rawDivisiId !== undefined && rawDivisiId !== '') {
      const divisiId = Number(rawDivisiId);

      if (!Number.isInteger(divisiId) || divisiId <= 0) {
        return res.status(400).json({
          message: 'ID divisi tidak valid.',
        });
      }

      // Batasi KADIV pada divisinya sendiri.
      if (
        role === 'KADIV' &&
        divisiId !== userDivisiId
      ) {
        return res.status(403).json({
          message: 'Anda hanya dapat memilih staf dari divisi sendiri.',
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

      pelaksana = await prisma.user.findMany({
        where: {
          divisiId,
          role: 'STAF',
        },
        orderBy: { nama: 'asc' },
        select: {
          id: true,
          nama: true,
          role: true,
          divisiId: true,
        },
      });
    }

    return res.status(200).json({
      divisi,
      pelaksana,
    });
  } catch (error) {
    console.error('Error getTicketOptions:', error);

    return res.status(500).json({
      message: 'Gagal mengambil data divisi dan pelaksana.',
    });
  }
};

module.exports = { getTicketOptions };