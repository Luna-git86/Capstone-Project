// Backend/controllers/ticketController.js
const prisma = require('../db');
const { notifyTicketStatus } = require('../services/telegramService');

// 1. Pengajuan Laporan Masalah (Semua Pegawai Operasional) & Pembuatan Tugas (Koordinator s/d Direktur)
const createTicket = async (req, res) => {
  try {
    const role = req.user.role;
    const pembuatId = Number(req.user.id);

    // Admin hanya boleh memantau tugas dan mengonfigurasi akun
    if (role === 'ADMIN') {
      return res.status(403).json({
        message: 'Admin hanya memiliki akses untuk melihat tugas dan mengelola akun.',
      });
    }

    const {
      judul,
      lokasi,
      deskripsi,
      prioritas,
      divisiId,
      pelaksanaId,
      deadline,
      tipe, // 'LAPORAN_MASALAH' atau 'BUAT_TUGAS'
    } = req.body;

    if (!judul || !judul.trim() || !deskripsi || !deskripsi.trim()) {
      return res.status(400).json({
        message: 'Judul dan deskripsi wajib diisi.',
      });
    }

    if (!divisiId) {
      return res.status(400).json({
        message: 'Silakan pilih Divisi / Bagian Tujuan.',
      });
    }

    const selectedDivisiId = Number(divisiId);
    const divisi = await prisma.divisi.findUnique({
      where: { id: selectedDivisiId },
    });

    if (!divisi) {
      return res.status(400).json({ message: 'Divisi tujuan tidak ditemukan.' });
    }

    const isAtasan = ['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(role);
    const isBuatTugas = tipe === 'BUAT_TUGAS';

    // Jika melalui menu Buat Tugas, wajib memiliki role Koordinator, Kadiv, atau Direktur
    if (isBuatTugas && !isAtasan) {
      return res.status(403).json({
        message: 'Hanya Koordinator, Kepala Divisi, dan Direktur yang berwenang membuat tugas.',
      });
    }

    // Saat membuat tugas langsung, batas waktu (tanggal & jam) wajib diisi
    let selectedDeadline = null;
    if (isBuatTugas && (!deadline || String(deadline).trim() === '')) {
      return res.status(400).json({
        message: 'Batas waktu (tanggal dan jam) wajib diisi saat membuat tugas.',
      });
    }

    if (deadline !== undefined && deadline !== null && deadline !== '') {
      const parsedDeadline = new Date(deadline);
      if (Number.isNaN(parsedDeadline.getTime())) {
        return res.status(400).json({ message: 'Format tanggal dan jam batas waktu tidak valid.' });
      }
      selectedDeadline = parsedDeadline;
    }

    let selectedPelaksanaId = null;
    let penanggungJawabId = null;

    if (isBuatTugas) {
      penanggungJawabId = pembuatId;
      if (pelaksanaId !== undefined && pelaksanaId !== null && pelaksanaId !== '') {
        selectedPelaksanaId = Number(pelaksanaId);
        const pelaksana = await prisma.user.findUnique({
          where: { id: selectedPelaksanaId },
        });
        if (!pelaksana) {
          return res.status(400).json({ message: 'Staf pelaksana tidak ditemukan.' });
        }
      }
    }

    const validPrioritas = ['LOW', 'MEDIUM', 'HIGH'];
    const selectedPrioritas =
      prioritas && validPrioritas.includes(prioritas) ? prioritas : 'MEDIUM';

    // Laporan masalah berstatus MENUNGGU_TRIASE, sedangkan pembuatan tugas yang menunjuk staf langsung DIPROSES
    const initialStatus =
      isBuatTugas && selectedPelaksanaId ? 'DIPROSES' : 'MENUNGGU_TRIASE';

    const newTicket = await prisma.ticket.create({
      data: {
        judul: judul.trim(),
        lokasi: lokasi ? String(lokasi).trim() : null,
        deskripsi: deskripsi.trim(),
        prioritas: selectedPrioritas,
        status: initialStatus,
        pembuatId,
        penanggungJawabId,
        divisiId: selectedDivisiId,
        pelaksanaId: selectedPelaksanaId,
        deadline: selectedDeadline,
      },
      include: {
        pembuat: { select: { id: true, nama: true, noHp: true, role: true } },
        penanggungJawab: { select: { id: true, nama: true, noHp: true, role: true } },
        divisi: { select: { id: true, nama: true } },
        pelaksana: {
          select: { id: true, nama: true, noHp: true, telegramChatId: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: isBuatTugas ? 'CREATE_TASK' : 'REPORT_ISSUE',
        entityType: 'Ticket',
        entityId: newTicket.id,
        userId: pembuatId,
        details: `${role} ${isBuatTugas ? 'membuat tugas' : 'melaporkan masalah'} #T-${String(newTicket.id).padStart(3, '0')} (${newTicket.judul}) ke Divisi ${newTicket.divisi?.nama}`,
      },
    });

    return res.status(201).json({
      message: isBuatTugas
        ? 'Tugas berhasil dibuat dan ditugaskan!'
        : `Tiket laporan masalah berhasil diajukan ke bagian ${newTicket.divisi?.nama} untuk segera dibuatkan tugas!`,
      data: newTicket,
    });
  } catch (error) {
    console.error('Error createTicket:', error);
    return res.status(500).json({
      message: 'Gagal menyimpan data pada server.',
    });
  }
};

// 2. Ambil Daftar Tiket & Tugas
const getTickets = async (req, res) => {
  try {
    const { role, divisiId, id: userId } = req.user;
    let filter = {};

    if (['KADIV', 'KOORDINATOR', 'STAF'].includes(role)) {
      const orConditions = [
        { pembuatId: Number(userId) },
        { pelaksanaId: Number(userId) },
      ];
      if (divisiId) {
        orConditions.push({ divisiId: Number(divisiId) });
      }
      filter = { OR: orConditions };
    }

    const tickets = await prisma.ticket.findMany({
      where: filter,
      include: {
        pembuat: {
          select: { id: true, nama: true, noHp: true, role: true },
        },
        penanggungJawab: {
          select: { id: true, nama: true, noHp: true, role: true },
        },
        divisi: {
          select: { id: true, nama: true },
        },
        pelaksana: {
          select: {
            id: true,
            nama: true,
            noHp: true,
            role: true,
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
      message: 'Gagal mengambil daftar tugas.',
    });
  }
};

// 3. Mengubah Laporan Masalah Menjadi Tugas (Oleh Koordinator / Kadiv / Direktur)
const triageTicket = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { prioritas, divisiId, pelaksanaId, deadline, status, catatanRevisi } = req.body;

    const currentTicket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        pembuat: { select: { id: true, nama: true, telegramChatId: true } },
      },
    });

    if (!currentTicket) {
      return res.status(404).json({ message: 'Tiket tidak ditemukan.' });
    }

    let selectedDeadline = currentTicket.deadline;
    if (deadline !== undefined && deadline !== null && deadline !== '') {
      const parsed = new Date(deadline);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Format batas waktu (tanggal & jam) tidak valid.' });
      }
      selectedDeadline = parsed;
    }

    if (!selectedDeadline) {
      return res.status(400).json({
        message: 'Silakan tetapkan batas waktu (tanggal dan jam) pengerjaan tugas.',
      });
    }

    const nextStatus = status || (pelaksanaId ? 'DIPROSES' : currentTicket.status);

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        prioritas: prioritas || currentTicket.prioritas,
        divisiId: divisiId ? Number(divisiId) : currentTicket.divisiId,
        pelaksanaId: pelaksanaId ? Number(pelaksanaId) : currentTicket.pelaksanaId,
        penanggungJawabId: Number(req.user.id),
        deadline: selectedDeadline,
        status: nextStatus,
        catatanRevisi:
          catatanRevisi !== undefined ? catatanRevisi : currentTicket.catatanRevisi,
        completedAt:
          nextStatus === 'SELESAI'
            ? currentTicket.completedAt || new Date()
            : null,
      },
      include: {
        pembuat: { select: { id: true, nama: true, noHp: true, role: true } },
        penanggungJawab: { select: { id: true, nama: true, noHp: true, role: true } },
        divisi: { select: { id: true, nama: true } },
        pelaksana: {
          select: { id: true, nama: true, noHp: true, telegramChatId: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'ASSIGN_TASK_WITH_DEADLINE',
        entityType: 'Ticket',
        entityId: updatedTicket.id,
        userId: Number(req.user.id),
        details: `${req.user.role} membuatkan tugas dari tiket #T-${String(updatedTicket.id).padStart(3, '0')} untuk ${updatedTicket.pelaksana?.nama || '-'} dengan batas waktu ${selectedDeadline.toISOString()}`,
      },
    });

    if (currentTicket.status !== nextStatus) {
      try {
        await notifyTicketStatus({
          ticketId: updatedTicket.id,
          recipient: currentTicket.pembuat,
          ticketTitle: updatedTicket.judul,
          status: nextStatus,
          deadline: updatedTicket.deadline,
        });
      } catch (notificationError) {
        console.error('[Telegram] Notifikasi gagal:', notificationError.message);
      }
    }

    return res.status(200).json({
      message: 'Tiket berhasil dibuatkan tugas beserta batas waktu pengerjaan!',
      data: updatedTicket,
    });
  } catch (error) {
    console.error('Error triageTicket:', error);
    return res.status(500).json({ message: 'Gagal menyimpan penugasan.' });
  }
};

// 4. Pelaporan Penyelesaian Tugas (+ Foto Bukti) oleh Staf & Evaluasi oleh Atasan
const updateTicketStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, catatanRevisi, laporanPenyelesaian, fotoBukti } = req.body;
    const role = req.user.role;

    if (role === 'ADMIN') {
      return res.status(403).json({
        message: 'Admin hanya dapat melihat tugas dan tidak dapat mengubah status.',
      });
    }

    const validStatus = [
      'MENUNGGU_TRIASE',
      'DIPROSES',
      'MENUNGGU_VALIDASI',
      'HOLD_ESKALASI',
      'SELESAI',
      'DITOLAK',
    ];

    if (!validStatus.includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid.' });
    }

    // Hanya Atasan (Koordinator, Kadiv, Direktur) yang boleh mengesahkan status menjadi SELESAI (Evaluasi Lulus)
    if (status === 'SELESAI' && !['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(role)) {
      return res.status(403).json({
        message: 'Penyelesaian tugas harus melalui pelaporan bukti foto dan dievaluasi oleh Koordinator/Kadiv/Direktur.',
      });
    }

    // Saat staf mengirim laporan selesai (MENUNGGU_VALIDASI), wajib menyertakan foto bukti
    const currentTicket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        pembuat: {
          select: { id: true, nama: true, telegramChatId: true },
        },
      },
    });

    if (!currentTicket) {
      return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
    }

    if (status === 'MENUNGGU_VALIDASI' && !fotoBukti && !currentTicket.fotoBukti) {
      return res.status(400).json({
        message: 'Wajib mengunggah foto bukti penyelesaian tugas untuk dievaluasi atasan.',
      });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        status,
        laporanPenyelesaian:
          laporanPenyelesaian !== undefined
            ? laporanPenyelesaian
            : currentTicket.laporanPenyelesaian,
        fotoBukti:
          fotoBukti !== undefined ? fotoBukti : currentTicket.fotoBukti,
        catatanRevisi:
          catatanRevisi !== undefined ? catatanRevisi : currentTicket.catatanRevisi,
        completedAt:
          status === 'SELESAI'
            ? currentTicket.completedAt || new Date()
            : status === 'DIPROSES'
            ? null
            : currentTicket.completedAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        action:
          status === 'MENUNGGU_VALIDASI'
            ? 'SUBMIT_COMPLETION_REPORT'
            : status === 'SELESAI'
            ? 'APPROVE_EVALUATION'
            : 'UPDATE_STATUS',
        entityType: 'Ticket',
        entityId: updatedTicket.id,
        userId: Number(req.user.id),
        details: `${role} mengubah status tiket #T-${String(updatedTicket.id).padStart(3, '0')} menjadi ${status}`,
      },
    });

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
        console.error('[Telegram] Notifikasi gagal:', notificationError.message);
      }
    }

    return res.status(200).json({
      message:
        status === 'MENUNGGU_VALIDASI'
          ? 'Laporan penyelesaian dan foto bukti berhasil dikirim untuk dievaluasi atasan!'
          : status === 'SELESAI'
          ? 'Evaluasi disetujui! Tugas resmi dinyatakan Selesai.'
          : `Status tugas diperbarui menjadi ${status.replace('_', ' ')}!`,
      data: updatedTicket,
    });
  } catch (error) {
    console.error('Error updateTicketStatus:', error);
    return res.status(500).json({
      message: 'Gagal memperbarui status tugas.',
    });
  }
};

// 5. Ambil Daftar Staf untuk Pilihan Pelaksana
const getAssignableStaff = async (req, res) => {
  try {
    const staffList = await prisma.user.findMany({
      where: { role: 'STAF' },
      select: {
        id: true,
        nama: true,
        noHp: true,
        role: true,
        divisiId: true,
        divisi: { select: { id: true, nama: true } },
      },
      orderBy: { nama: 'asc' },
    });
    return res.status(200).json({ data: staffList });
  } catch (error) {
    return res.status(500).json({ message: 'Gagal mengambil daftar staf.' });
  }
};

// 6. Dokumen Panduan SOP
const getSops = async (req, res) => {
  try {
    const sops = await prisma.dokumenSop.findMany({
      include: {
        divisi: { select: { id: true, nama: true } },
        pengaju: { select: { id: true, nama: true, role: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.status(200).json({ data: sops });
  } catch (error) {
    return res.status(500).json({ message: 'Gagal memuat dokumen SOP.' });
  }
};

const createOrUpdateSop = async (req, res) => {
  try {
    const { nomorSop, judul, revisi, deskripsi, fileUrl, divisiId } = req.body;
    if (!nomorSop || !judul) {
      return res.status(400).json({ message: 'Nomor SOP dan Judul wajib diisi.' });
    }

    const sop = await prisma.dokumenSop.upsert({
      where: { nomorSop: nomorSop.trim() },
      update: {
        judul: judul.trim(),
        revisi: revisi || 'Revisi Terbaru',
        deskripsi: deskripsi || null,
        fileUrl: fileUrl || null,
        divisiId: divisiId ? Number(divisiId) : null,
      },
      create: {
        nomorSop: nomorSop.trim(),
        judul: judul.trim(),
        revisi: revisi || 'Revisi 1',
        deskripsi: deskripsi || null,
        fileUrl: fileUrl || null,
        divisiId: divisiId ? Number(divisiId) : null,
        pengajuId: Number(req.user.id),
      },
    });

    return res.status(201).json({
      message: `Panduan SOP (${sop.revisi}) berhasil disimpan!`,
      data: sop,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Gagal menyimpan dokumen SOP.' });
  }
};

module.exports = {
  createTicket,
  getTickets,
  triageTicket,
  updateTicketStatus,
  getAssignableStaff,
  getSops,
  createOrUpdateSop,
};