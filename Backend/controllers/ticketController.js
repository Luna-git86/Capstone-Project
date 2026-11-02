// Backend/controllers/ticketController.js
const prisma = require('../db');
const { notifyTicketStatus } = require('../services/telegramService');

// 1. Buat Tiket Masalah Baru ATAU Buat Tugas (Termasuk dari Tiket Masalah yang Sudah Ada)
const createTicket = async (req, res) => {
  try {
    const role = req.user.role;
    const pembuatId = Number(req.user.id);

    if (role === 'ADMIN') {
      return res.status(403).json({
        message: 'Admin hanya memiliki akses untuk memantau tugas dan mengelola akun.',
      });
    }

    const {
      ticketId, // Jika Koordinator/Kadiv/Direktur membuat tugas berdasarkan tiket yang sudah ada
      judul,
      lokasi,
      deskripsi,
      prioritas,
      divisiId,
      pelaksanaId,
      deadline,
      catatanRevisi,
      tipe,
    } = req.body;

    const isAtasan = ['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(role);
    const isBuatTugas = tipe === 'BUAT_TUGAS';

    if (isBuatTugas && !isAtasan) {
      return res.status(403).json({
        message: 'Hanya Koordinator, Kepala Divisi, dan Direktur yang dapat membuat tugas.',
      });
    }

    // JIKA MEMBUAT TUGAS BERDASARKAN TIKET LAPORAN MASALAH YANG SUDAH ADA
    if (ticketId) {
      if (!isAtasan) {
        return res.status(403).json({
          message: 'Hanya Koordinator, Kepala Divisi, dan Direktur yang dapat menindaklanjuti tiket menjadi tugas.',
        });
      }

      const existingTicket = await prisma.ticket.findUnique({
        where: { id: Number(ticketId) },
        include: {
          pembuat: { select: { id: true, nama: true, telegramChatId: true } },
        },
      });

      if (!existingTicket) {
        return res.status(404).json({ message: 'Tiket laporan masalah tidak ditemukan.' });
      }

      let parsedDeadline = existingTicket.deadline;
      if (deadline) {
        const d = new Date(deadline);
        if (!Number.isNaN(d.getTime())) {
          parsedDeadline = d;
        }
      }

      if (!parsedDeadline) {
        return res.status(400).json({
          message: 'Batas waktu (tanggal dan jam) wajib diisi saat membuat tugas.',
        });
      }

      const updatedTicket = await prisma.ticket.update({
        where: { id: Number(ticketId) },
        data: {
          judul: judul ? judul.trim() : existingTicket.judul,
          lokasi: lokasi !== undefined ? String(lokasi).trim() : existingTicket.lokasi,
          deskripsi: deskripsi ? deskripsi.trim() : existingTicket.deskripsi,
          prioritas: prioritas || existingTicket.prioritas,
          divisiId: divisiId ? Number(divisiId) : existingTicket.divisiId,
          pelaksanaId: pelaksanaId ? Number(pelaksanaId) : existingTicket.pelaksanaId,
          penanggungJawabId: pembuatId,
          deadline: parsedDeadline,
          status: 'DIPROSES',
          catatanRevisi:
            catatanRevisi !== undefined ? catatanRevisi : existingTicket.catatanRevisi,
        },
        include: {
          pembuat: { select: { id: true, nama: true, noHp: true, role: true } },
          penanggungJawab: { select: { id: true, nama: true, noHp: true, role: true } },
          divisi: { select: { id: true, nama: true } },
          pelaksana: {
            select: { id: true, nama: true, noHp: true, role: true, telegramChatId: true },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'CONVERT_TICKET_TO_TASK',
          entityType: 'Ticket',
          entityId: updatedTicket.id,
          userId: pembuatId,
          details: `${role} membuat tugas dari tiket #T-${String(updatedTicket.id).padStart(3, '0')} untuk ${updatedTicket.pelaksana?.nama || '-'}`,
        },
      });

      try {
        await notifyTicketStatus({
          ticketId: updatedTicket.id,
          recipient: existingTicket.pembuat,
          ticketTitle: updatedTicket.judul,
          status: 'DIPROSES',
          deadline: updatedTicket.deadline,
        });
      } catch (e) {
        console.error('[Telegram] Gagal mengirim notifikasi:', e.message);
      }

      return res.status(200).json({
        message: `Tiket #T-${String(updatedTicket.id).padStart(3, '0')} berhasil dijadikan tugas untuk ${updatedTicket.pelaksana?.nama || 'Staf'}!`,
        data: updatedTicket,
      });
    }

    // JIKA MEMBUAT TIKET MASALAH BARU ATAU TUGAS BARU DARI NOL
    if (!judul || !judul.trim() || !deskripsi || !deskripsi.trim()) {
      return res.status(400).json({
        message: 'Judul dan deskripsi wajib diisi.',
      });
    }

    // Ambil user dari DB jika divisiId tidak dikirim
    const dbUser = await prisma.user.findUnique({ where: { id: pembuatId } });
    const rawDivisiId = divisiId || dbUser?.divisiId;

    if (!rawDivisiId) {
      return res.status(400).json({
        message: 'Silakan pilih Divisi / Bagian Tujuan.',
      });
    }

    const selectedDivisiId = Number(rawDivisiId);

    let selectedDeadline = null;
    if (isBuatTugas && (!deadline || String(deadline).trim() === '')) {
      return res.status(400).json({
        message: 'Batas waktu (tanggal dan jam) wajib diisi saat membuat tugas.',
      });
    }

    if (deadline) {
      const parsed = new Date(deadline);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Format batas waktu tidak valid.' });
      }
      selectedDeadline = parsed;
    }

    let selectedPelaksanaId = null;
    let penanggungJawabId = null;

    if (isAtasan && pelaksanaId) {
      selectedPelaksanaId = Number(pelaksanaId);
      penanggungJawabId = pembuatId;
    } else if (isBuatTugas) {
      penanggungJawabId = pembuatId;
    }

    const validPrioritas = ['LOW', 'MEDIUM', 'HIGH'];
    const selectedPrioritas =
      prioritas && validPrioritas.includes(prioritas) ? prioritas : 'MEDIUM';

    const initialStatus = selectedPelaksanaId ? 'DIPROSES' : 'MENUNGGU_TRIASE';

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
          select: { id: true, nama: true, noHp: true, role: true, telegramChatId: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: isBuatTugas ? 'CREATE_TASK' : 'REPORT_ISSUE',
        entityType: 'Ticket',
        entityId: newTicket.id,
        userId: pembuatId,
        details: `${role} membuat ${isBuatTugas ? 'tugas' : 'tiket masalah'} #T-${String(newTicket.id).padStart(3, '0')} (${newTicket.judul})`,
      },
    });

    return res.status(201).json({
      message:
        initialStatus === 'DIPROSES'
          ? 'Tugas berhasil diterbitkan dan ditugaskan ke staf!'
          : 'Tiket laporan masalah berhasil diajukan!',
      data: newTicket,
    });
  } catch (error) {
    console.error('Error createTicket:', error);
    return res.status(500).json({
      message: 'Gagal menyimpan data pada server.',
    });
  }
};

// 2. Ambil Daftar Tugas (Memastikan Data Selalu Muncul di Semua Role)
const getTickets = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const role = req.user.role;

    // Ambil data user langsung dari database agar tidak gagal jika token JWT tidak menyimpan divisiId
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, divisiId: true },
    });

    const userDivisiId = currentUser?.divisiId || req.user.divisiId || null;
    let filter = {};

    if (['ADMIN', 'DIREKTUR'].includes(role)) {
      // Admin dan Direktur melihat seluruh tiket tanpa terkecuali
      filter = {};
    } else if (['KADIV', 'KOORDINATOR'].includes(role)) {
      // Kadiv dan Koordinator melihat:
      // 1. Semua tiket di divisinya
      // 2. Semua tiket yang berstatus MENUNGGU_TRIASE (agar bisa langsung dibuatkan tugas)
      // 3. Tiket yang mereka buat atau awasi sendiri
      const orConditions = [
        { status: 'MENUNGGU_TRIASE' },
        { pembuatId: userId },
        { penanggungJawabId: userId },
        { pelaksanaId: userId },
      ];
      if (userDivisiId) {
        orConditions.push({ divisiId: Number(userDivisiId) });
      }
      filter = { OR: orConditions };
    } else {
      // Role STAF melihat:
      // 1. Tugas yang ditugaskan kepadanya (pelaksanaId)
      // 2. Tiket masalah yang ia laporkan sendiri (pembuatId)
      // 3. Tiket di divisinya (jika memiliki divisiId)
      const orConditions = [
        { pembuatId: userId },
        { pelaksanaId: userId },
      ];
      if (userDivisiId) {
        orConditions.push({ divisiId: Number(userDivisiId) });
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

// 3. Buat Tugas dari Tiket Masalah / Disposisi oleh Koordinator, Kadiv, Direktur
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
        message: 'Batas waktu (tanggal dan jam) wajib diisi saat membuat tugas.',
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
          select: { id: true, nama: true, noHp: true, role: true, telegramChatId: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'ASSIGN_TASK_WITH_DEADLINE',
        entityType: 'Ticket',
        entityId: updatedTicket.id,
        userId: Number(req.user.id),
        details: `${req.user.role} membuat tugas dari tiket #T-${String(updatedTicket.id).padStart(3, '0')} untuk ${updatedTicket.pelaksana?.nama || '-'}`,
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

// 4. Pelaporan Penyelesaian (+ Foto Bukti) & Evaluasi Atasan
const updateTicketStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, catatanRevisi, laporanPenyelesaian, fotoBukti } = req.body;
    const role = req.user.role;

    if (role === 'ADMIN') {
      return res.status(403).json({
        message: 'Admin hanya dapat memantau tugas dan tidak dapat mengubah status.',
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

    if (status === 'SELESAI' && !['DIREKTUR', 'KADIV', 'KOORDINATOR'].includes(role)) {
      return res.status(403).json({
        message: 'Penyelesaian tugas harus melalui pelaporan bukti foto dan disetujui oleh Koordinator/Kadiv/Direktur.',
      });
    }

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
          ? 'Laporan penyelesaian dan foto bukti berhasil dikirim untuk dievaluasi!'
          : status === 'SELESAI'
          ? 'Evaluasi disetujui! Tugas dinyatakan Selesai.'
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