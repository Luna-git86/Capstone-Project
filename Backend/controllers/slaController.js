const prisma = require('../db');

const PERIODE_VALID = [30,  90, 180, 365];
const PRIORITAS_VALID = ['SEMUA', 'LOW', 'MEDIUM', 'HIGH'];

function classifyTicket(ticket, now) {
  if (ticket.status === 'DITOLAK') return 'DITOLAK';
  if (!ticket.deadline) return 'TANPA_DEADLINE';

  if (ticket.status === 'SELESAI') {
    if (!ticket.completedAt) return 'WAKTU_SELESAI_TIDAK_TERCATAT';
    return ticket.completedAt <= ticket.deadline ? 'SESUAI_SLA' : 'TERLAMBAT';
  }

  return ticket.deadline < now ? 'TERLAMBAT' : 'DALAM_SLA';
}

const getLaporanSLA = async (req, res) => {
  try {
    const periode = Number(req.query.periode || 30);
    const prioritas = String(req.query.prioritas || 'SEMUA').toUpperCase();

    if (!PERIODE_VALID.includes(periode)) {
      return res.status(400).json({ message: 'Periode harus 30, 90, 180, atau 365 hari.' });
    }
    if (!PRIORITAS_VALID.includes(prioritas)) {
      return res.status(400).json({ message: 'Filter prioritas tidak valid.' });
    }

    const sejak = new Date();
    sejak.setDate(sejak.getDate() - periode);
    const where = { createdAt: { gte: sejak } };
    if (prioritas !== 'SEMUA') where.prioritas = prioritas;

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        divisi: { select: { nama: true } },
        pembuat: { select: { nama: true } },
        pelaksana: { select: { nama: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const data = tickets.map((ticket) => ({
      id: ticket.id,
      judul: ticket.judul,
      prioritas: ticket.prioritas,
      status: ticket.status,
      deadline: ticket.deadline,
      createdAt: ticket.createdAt,
      completedAt: ticket.completedAt || null,
      divisi: ticket.divisi?.nama || '-',
      pembuat: ticket.pembuat?.nama || '-',
      pelaksana: ticket.pelaksana?.nama || '-',
      statusSLA: classifyTicket(ticket, now),
    }));

    const selesaiTerukur = data.filter((t) => ['SESUAI_SLA', 'TERLAMBAT'].includes(t.statusSLA) && t.status === 'SELESAI');
    const sesuaiSLA = data.filter((t) => t.statusSLA === 'SESUAI_SLA').length;
    const terlambatSelesai = selesaiTerukur.filter((t) => t.statusSLA === 'TERLAMBAT').length;
    const totalSelesaiTerukur = sesuaiSLA + terlambatSelesai;
    const durasiJam = selesaiTerukur.map((t) => (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000);
    const statusCounts = data.reduce((acc, ticket) => {
      acc[ticket.statusSLA] = (acc[ticket.statusSLA] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      periode,
      prioritas,
      ringkasan: {
        totalTiket: data.length,
        sesuaiSLA,
        terlambat: statusCounts.TERLAMBAT || 0,
        terlambatSelesai,
        belumSelesai: data.filter((t) => !['SELESAI', 'DITOLAK'].includes(t.status)).length,
        dalamSLA: statusCounts.DALAM_SLA || 0,
        tanpaDeadline: statusCounts.TANPA_DEADLINE || 0,
        waktuSelesaiTidakTercatat: statusCounts.WAKTU_SELESAI_TIDAK_TERCATAT || 0,
        totalSelesaiTerukur,
        persentaseSLA: totalSelesaiTerukur ? Number(((sesuaiSLA / totalSelesaiTerukur) * 100).toFixed(1)) : null,
        rataRataJam: durasiJam.length ? Number((durasiJam.reduce((sum, value) => sum + value, 0) / durasiJam.length).toFixed(1)) : null,
      },
      data,
    });
  } catch (error) {
    console.error('Error getLaporanSLA:', error);
    return res.status(500).json({ message: 'Gagal mengambil laporan SLA.' });
  }
};

module.exports = { getLaporanSLA };
