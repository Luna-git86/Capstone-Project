// Backend/controllers/ticketController.js
const prisma = require('../db');
const { dispatchTicketNotifications } = require('../services/ticketNotificationService');

// 1. Pengajuan Laporan Masalah (Semua Pegawai Operasional) & Pembuatan Tugas (Koordinator s/d Direktur)
const createTicket = async (req, res) => {
  try {
    const role = req.user.role;
    const pembuatId = Number(req.user.id);
    const userDivisiId = req.user.divisiId ? Number(req.user.divisiId) : null;

    // Admin hanya boleh memantau tugas dan mengonfigurasi akun
    if (role === 'ADMIN') {
      return res.status(403).json({
        message: 'Admin hanya memiliki akses untuk melihat tugas dan mengelola akun.',
      });
    }

    // Jika membuat tugas berdasarkan tiket laporan masalah yang sudah ada
    if (req.body.ticketId) {
      req.params = { id: req.body.ticketId };
      return triageTicket(req, res);
    }

    const {
      judul,
      lokasi,
      deskripsi,
      prioritas,
      jenisTiket, // 'LAPORAN' atau 'TUGAS'
      divisiId,
      pelaksanaId,
      deadline,
      fotoInstruksi, // Menangkap foto instruksi / foto awal laporan masalah dari Frontend
      tipe, // 'LAPORAN_MASALAH' atau 'BUAT_TUGAS'
      parentTicketId, // Hubungan relasi arahan induk (Kadiv -> Koordinator -> Staf)
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

    // Validasi Relasi Arahan Induk (parentTicketId)
    let selectedParentTicketId = null;
    let inheritedFotoInstruksi = null;
    if (parentTicketId !== undefined && parentTicketId !== null && parentTicketId !== '') {
      selectedParentTicketId = Number(parentTicketId);
      if (!Number.isInteger(selectedParentTicketId) || selectedParentTicketId <= 0) {
        return res.status(400).json({ message: 'ID arahan induk tidak valid.' });
      }
      const parentTicket = await prisma.ticket.findUnique({
        where: { id: selectedParentTicketId },
        include: { divisi: true },
      });
      if (!parentTicket) {
        return res.status(404).json({ message: 'Arahan induk tidak ditemukan.' });
      }
      // Tiket arahan harus berada dalam divisi yang sama (kecuali pembuat adalah Direktur)
      if (role !== 'DIREKTUR' && userDivisiId && parentTicket.divisiId !== userDivisiId) {
        return res.status(403).json({
          message: 'Tiket arahan induk tidak berada dalam divisi Anda.',
        });
      }
      // Wariskan fotoInstruksi dari tiket induk jika tugas turunan tidak mengunggah foto baru
      inheritedFotoInstruksi = parentTicket.fotoInstruksi || null;
    }

    let selectedPelaksanaId = null;
    let penanggungJawabId = null;

    if (isBuatTugas) {
      penanggungJawabId = pembuatId;

      if (!pelaksanaId) {
        return res.status(400).json({
          message: 'Penerima tugas / pelaksana wajib dipilih saat membuat tugas.',
        });
      }

      selectedPelaksanaId = Number(pelaksanaId);
      const pelaksana = await prisma.user.findUnique({
        where: { id: selectedPelaksanaId },
      });
      if (!pelaksana) {
        return res.status(400).json({ message: 'Penerima tugas / pelaksana tidak ditemukan.' });
      }

      // ATURAN HIERARKI BISNIS 1: KADIV
      if (role === 'KADIV') {
        // Kadiv tidak boleh menugaskan Staf secara langsung
        if (pelaksana.role === 'STAF') {
          return res.status(400).json({
            message: 'Kepala Divisi tidak dapat menugaskan Staf secara langsung. Terbitkan tugas/arahan kepada Koordinator.',
          });
        }
        if (pelaksana.role !== 'KOORDINATOR') {
          return res.status(400).json({
            message: 'Kepala Divisi hanya berwenang menerbitkan tugas/arahan kepada Koordinator.',
          });
        }
        // Koordinator penerima harus berada dalam divisi tujuan yang dipilih
        if (pelaksana.divisiId && pelaksana.divisiId !== selectedDivisiId) {
          return res.status(400).json({
            message: 'Koordinator penerima harus berada dalam Divisi Tujuan yang dipilih.',
          });
        }
      }

      // ATURAN HIERARKI BISNIS 2: KOORDINATOR
      if (role === 'KOORDINATOR') {
        // Pelaksana tidak boleh sama dengan pembuat/penanggung jawab
        if (selectedPelaksanaId === pembuatId) {
          return res.status(400).json({
            message: 'Pelaksana tugas tidak boleh sama dengan penanggung jawab / pembuat tugas.',
          });
        }
        // Koordinator menugaskan STAF
        if (pelaksana.role !== 'STAF') {
          return res.status(400).json({
            message: 'Koordinator hanya berwenang menugaskan Staf sebagai pelaksana operasional.',
          });
        }
        // Staf penerima harus berada di divisi yang sama dengan Koordinator
        if (userDivisiId && pelaksana.divisiId !== userDivisiId) {
          return res.status(400).json({
            message: 'Koordinator hanya dapat menugaskan Staf di dalam divisi yang sama.',
          });
        }
        // Koordinator hanya berwenang menerbitkan tugas di divisinya sendiri
        if (userDivisiId && selectedDivisiId !== userDivisiId) {
          return res.status(400).json({
            message: 'Koordinator hanya berwenang menerbitkan tugas operasional dalam divisinya sendiri.',
          });
        }
      }

      // ATURAN HIERARKI BISNIS 3: DIREKTUR
      if (role === 'DIREKTUR') {
        if (pelaksana.role === 'STAF') {
          return res.status(400).json({
            message: 'Direktur tidak menerbitkan tugas operasional langsung kepada Staf. Terbitkan arahan strategis kepada Kepala Divisi (Kadiv).',
          });
        }
        if (pelaksana.role !== 'KADIV') {
          return res.status(400).json({
            message: 'Direktur hanya menerbitkan arahan strategis kepada Kepala Divisi (Kadiv).',
          });
        }
      }
    }

    const validPrioritas = ['LOW', 'MEDIUM', 'HIGH'];
    const selectedPrioritas =
      prioritas && validPrioritas.includes(prioritas) ? prioritas : 'MEDIUM';

    // Laporan masalah berstatus MENUNGGU_TRIASE, sedangkan pembuatan tugas yang menunjuk staf langsung DIPROSES
    const initialStatus =
      isBuatTugas && selectedPelaksanaId ? 'DIPROSES' : 'MENUNGGU_TRIASE';

    const finalFotoInstruksi =
      fotoInstruksi && String(fotoInstruksi).trim() !== ''
        ? String(fotoInstruksi).trim()
        : inheritedFotoInstruksi;

    // Tentukan jenis tiket secara otomatis berdasarkan konteks pembuatan jika frontend tidak mengirimkannya
    // Jika isBuatTugas = true (dari halaman tambah tugas), maka default-nya 'TUGAS'
    // Jika isBuatTugas = false (dari halaman lapor masalah), maka default-nya 'LAPORAN'
    const finalJenisTiket = jenisTiket ? String(jenisTiket).toUpperCase() : (isBuatTugas ? 'TUGAS' : 'LAPORAN');

    const newTicket = await prisma.ticket.create({
      data: {
        judul: judul.trim(),
        lokasi: lokasi ? String(lokasi).trim() : null,
        deskripsi: deskripsi.trim(),
        prioritas: selectedPrioritas,
        status: initialStatus,
        fotoInstruksi: finalFotoInstruksi,
        pembuatId,
        penanggungJawabId,
        divisiId: selectedDivisiId,
        pelaksanaId: selectedPelaksanaId,
        deadline: selectedDeadline,
        parentTicketId: selectedParentTicketId,
        jenisTiket: finalJenisTiket, // <--- Baris ini ditambahkan untuk menyimpan jenis tiket
      },
      include: {
        pembuat: { select: { id: true, nama: true, noHp: true, role: true } },
        penanggungJawab: { select: { id: true, nama: true, noHp: true, role: true } },
        divisi: { select: { id: true, nama: true } },
        pelaksana: {
          select: { id: true, nama: true, noHp: true, telegramChatId: true, role: true },
        },
        parentTicket: {
          select: { id: true, judul: true, status: true, prioritas: true, pembuatId: true, fotoInstruksi: true },
        },
        childTickets: {
          select: { id: true, judul: true, status: true, pelaksanaId: true },
        },
      },
    });

    let detailsLog = `${role} ${isBuatTugas ? 'membuat tugas' : 'melaporkan masalah'} #T-${String(newTicket.id).padStart(3, '0')} (${newTicket.judul}) ke Divisi ${newTicket.divisi?.nama}`;
    if (selectedParentTicketId) {
      detailsLog += ` [Berdasarkan Arahan Induk #T-${String(selectedParentTicketId).padStart(3, '0')}]`;
    }

    await prisma.auditLog.create({
      data: {
        action: isBuatTugas
          ? role === 'KADIV'
            ? 'CREATE_DIRECTIVE'
            : 'CREATE_TASK'
          : 'REPORT_ISSUE',
        entityType: 'Ticket',
        entityId: newTicket.id,
        userId: pembuatId,
        details: detailsLog,
      },
    });

    if (isBuatTugas && selectedPelaksanaId) {
      try {
        await dispatchTicketNotifications({
          previous: null,
          current: newTicket,
          actor: newTicket.pembuat || { id: pembuatId, role, nama: req.user.nama },
        });
      } catch (notificationError) {
        console.error('[Telegram] Notifikasi tugas baru gagal:', notificationError.message);
      }
    }

    return res.status(201).json({
      message: isBuatTugas
        ? role === 'KADIV'
          ? 'Arahan divisi berhasil diterbitkan kepada Koordinator!'
          : 'Tugas operasional berhasil dibuat dan ditugaskan kepada Staf!'
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
    // Tangkap parameter 'jenis' dari query URL (contoh: ?jenis=LAPORAN)
    const { jenis } = req.query; 

    let filter = {};
    let roleConditions = {}; // Pisahkan kondisi role dari filter utama

    // Kontrol Visibilitas Berdasarkan Role
    if (role === 'KADIV') {
      // Kadiv melihat seluruh tugas divisinya serta tugas/arahan yang dia buat ke divisi lain
      const orConditions = [
        { pembuatId: Number(userId) },
      ];
      if (divisiId) {
        orConditions.push({ divisiId: Number(divisiId) });
      }
      roleConditions = { OR: orConditions };
    } else if (role === 'KOORDINATOR') {
      // Koordinator melihat tugas yang dibuatnya, ditugaskan kepadanya, atau dia penanggung jawabnya;
      // serta tiket laporan masalah masuk (MENUNGGU_TRIASE) atau tugas divisi yang pelaksananya Staf.
      // Arahan Direksi ke Kadiv tidak akan tampil sampai Kadiv mendelegasikannya ke Koordinator.
      const orConditions = [
        { pembuatId: Number(userId) },
        { pelaksanaId: Number(userId) },
        { penanggungJawabId: Number(userId) },
      ];
      if (divisiId) {
        orConditions.push({ divisiId: Number(divisiId), status: 'MENUNGGU_TRIASE' });
        orConditions.push({
          divisiId: Number(divisiId),
          pelaksana: { role: 'STAF' },
        });
      }
      roleConditions = { OR: orConditions };
    } else if (role === 'STAF') {
      // Staf hanya melihat tugas yang ditugaskan kepadanya atau yang dia laporkan
      roleConditions = {
        OR: [
          { pelaksanaId: Number(userId) },
          { pembuatId: Number(userId) },
        ],
      };
    }

    // Gabungkan filter Role dengan filter Jenis Tiket (jika ada)
    if (jenis) {
      if (Object.keys(roleConditions).length > 0) {
        // Jika ada filter role (bukan Direktur/Admin), gunakan AND
        filter = {
          AND: [
            roleConditions,
            { jenisTiket: jenis } 
          ]
        };
      } else {
        // Jika Direktur/Admin (tidak ada roleConditions), langsung set jenis
        filter = { jenisTiket: jenis };
      }
    } else {
      // Jika tidak ada request jenis, gunakan filter role seperti biasa
      filter = roleConditions;
    }
    // DIREKTUR dan ADMIN: filter = {} (Melihat seluruh data rumah sakit)

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
        parentTicket: {
          select: {
            id: true,
            judul: true,
            status: true,
            prioritas: true,
            deadline: true,
            fotoInstruksi: true,
            pembuat: { select: { id: true, nama: true, role: true } },
          },
        },
        childTickets: {
          select: {
            id: true,
            judul: true,
            status: true,
            prioritas: true,
            deadline: true,
            completedAt: true,
            pelaksana: { select: { id: true, nama: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
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
    const {
      prioritas,
      divisiId,
      pelaksanaId,
      deadline,
      status,
      catatanRevisi,
      fotoInstruksi, // Mendukung penambahan/pembaruan fotoInstruksi saat triase
    } = req.body;
    const role = req.user.role;
    const userDivisiId = req.user.divisiId ? Number(req.user.divisiId) : null;

    const currentTicket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        pembuat: { select: { id: true, nama: true, telegramChatId: true } },
      },
    });

    if (!currentTicket) {
      return res.status(404).json({ message: 'Tiket tidak ditemukan.' });
    }

    // Kadiv tidak boleh mengakses tiket di luar divisinya
    if (role === 'KADIV' && userDivisiId && currentTicket.divisiId && currentTicket.divisiId !== userDivisiId) {
      return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk men-triase tiket dari divisi lain.' });
    }

    // Koordinator hanya berwenang men-triase tiket dalam divisinya sendiri
    if (role === 'KOORDINATOR') {
      if (userDivisiId && currentTicket.divisiId && currentTicket.divisiId !== userDivisiId) {
        return res.status(403).json({ message: 'Koordinator hanya berwenang men-triase tiket dalam divisinya sendiri.' });
      }
      if (divisiId && Number(divisiId) !== userDivisiId) {
        return res.status(403).json({ message: 'Koordinator tidak dapat memindahkan tiket ke divisi lain.' });
      }
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

    // Validasi pelaksana pada proses triase
    if (pelaksanaId) {
      const pelaksana = await prisma.user.findUnique({
        where: { id: Number(pelaksanaId) },
      });
      if (!pelaksana) {
        return res.status(400).json({ message: 'Pelaksana yang ditunjuk tidak ditemukan.' });
      }

      if (role === 'DIREKTUR' && pelaksana.role !== 'KADIV') {
        return res.status(400).json({
          message: 'Direktur hanya menerbitkan arahan strategis kepada Kepala Divisi (Kadiv).',
        });
      }

      if (role === 'KADIV' && pelaksana.role === 'STAF') {
        return res.status(400).json({
          message: 'Kepala Divisi tidak dapat menugaskan Staf secara langsung. Tunjuk Koordinator.',
        });
      }

      if (role === 'KOORDINATOR') {
        if (pelaksana.role !== 'STAF') {
          return res.status(400).json({
            message: 'Koordinator hanya berwenang menugaskan Staf sebagai pelaksana.',
          });
        }
        if (userDivisiId && pelaksana.divisiId !== userDivisiId) {
          return res.status(400).json({
            message: 'Koordinator hanya dapat menugaskan Staf dalam divisinya sendiri.',
          });
        }
        if (Number(pelaksanaId) === Number(req.user.id)) {
          return res.status(400).json({
            message: 'Pelaksana tugas tidak boleh sama dengan penanggung jawab triase.',
          });
        }
      }
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
        fotoInstruksi:
          fotoInstruksi !== undefined ? fotoInstruksi : currentTicket.fotoInstruksi,
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
          select: { id: true, nama: true, noHp: true, telegramChatId: true, role: true },
        },
        parentTicket: {
          select: { id: true, judul: true, status: true, fotoInstruksi: true },
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

    try {
      await dispatchTicketNotifications({
        previous: currentTicket,
        current: updatedTicket,
        actor: updatedTicket.penanggungJawab || { id: req.user.id, role: req.user.role },
      });
    } catch (notificationError) {
      console.error('[Telegram] Notifikasi penugasan gagal:', notificationError.message);
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
    // [BARU] Tambahkan judul, deskripsi, dan fotoInstruksi ke dalam destructuring
    const {
      status,
      catatanRevisi,
      laporanPenyelesaian,
      fotoBukti,
      fotoInstruksi,
      judul,
      deskripsi
    } = req.body;
    const role = req.user.role;

    if (role === 'ADMIN') {
      return res.status(403).json({
        message: 'Admin hanya dapat melihat tugas dan tidak dapat mengubah status.',
      });
    }

    const validStatus = [
      'BARU',
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

    const currentTicket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        pembuat: {
          select: { id: true, nama: true, telegramChatId: true },
        },
        penanggungJawab: {
          select: { id: true, nama: true, telegramChatId: true },
        },
        pelaksana: {
          select: { id: true, nama: true, telegramChatId: true },
        },
      },
    });

    if (!currentTicket) {
      return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
    }

    const userId = Number(req.user.id);
    const userDivisiId = req.user.divisiId ? Number(req.user.divisiId) : null;

    // 1. Validasi Pemisahan Pelaksana dan Pemeriksa (Segregation of Duties)
    if (status === 'SELESAI' && currentTicket.pelaksanaId && userId === currentTicket.pelaksanaId) {
      return res.status(400).json({
        message: 'Pelaksana tugas tidak dapat memverifikasi atau mengevaluasi pekerjaannya sendiri.',
      });
    }

    // 2. Validasi Isolasi Divisi & Kepemilikan Tugas Berdasarkan Role
    if (role === 'KADIV') {
      if (userDivisiId && currentTicket.divisiId && currentTicket.divisiId !== userDivisiId) {
        return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk mengubah tiket dari divisi lain.' });
      }
    } else if (role === 'KOORDINATOR') {
      const isTerkait =
        currentTicket.pembuatId === userId ||
        currentTicket.penanggungJawabId === userId ||
        currentTicket.pelaksanaId === userId ||
        (userDivisiId && currentTicket.divisiId === userDivisiId);
      if (!isTerkait) {
        return res.status(403).json({ message: 'Koordinator tidak memiliki hak akses untuk mengubah tiket dari divisi lain.' });
      }
    } else if (role === 'STAF') {
      // Staf berhak memperbarui tugas yang ditugaskan kepadanya ATAU laporan yang dibuatnya sendiri
      const isPelaksana = currentTicket.pelaksanaId === userId;
      const isPembuat = currentTicket.pembuatId === userId;

      if (!isPelaksana && !isPembuat) {
        return res.status(403).json({
          message: 'Anda hanya memiliki wewenang untuk memperbarui tugas yang ditugaskan kepada Anda atau laporan yang Anda buat.',
        });
      }

      // Staf berwenang mengirim laporan selesai, kendala, progres, atau melakukan REVISI LAPORAN (MENUNGGU_TRIASE)
      if (!['MENUNGGU_VALIDASI', 'HOLD_ESKALASI', 'DIPROSES', 'MENUNGGU_TRIASE'].includes(status)) {
        return res.status(403).json({
          message: `Staf tidak memiliki wewenang untuk mengubah status tiket menjadi ${status}.`,
        });
      }
    }

    // Saat staf mengirim laporan selesai (MENUNGGU_VALIDASI), wajib menyertakan foto bukti
    if (status === 'MENUNGGU_VALIDASI') {
      if (!fotoBukti && !currentTicket.fotoBukti) {
        return res.status(400).json({
          message: 'Foto bukti pengerjaan wajib diunggah sebelum mengirimkan laporan penyelesaian!',
        });
      }
      if (!laporanPenyelesaian || !String(laporanPenyelesaian).trim()) {
        return res.status(400).json({
          message: 'Keterangan laporan penyelesaian wajib diisi.',
        });
      }
    }

    const dataToUpdate = {
      status,
      catatanRevisi:
        catatanRevisi !== undefined ? catatanRevisi : currentTicket.catatanRevisi,
      laporanPenyelesaian:
        laporanPenyelesaian !== undefined
          ? laporanPenyelesaian
          : currentTicket.laporanPenyelesaian,
      fotoBukti:
        fotoBukti !== undefined ? fotoBukti : currentTicket.fotoBukti,
      fotoInstruksi:
        fotoInstruksi !== undefined ? fotoInstruksi : currentTicket.fotoInstruksi,
      // [BARU] Simpan teks judul dan deskripsi baru (jika ada kiriman)
      judul: judul !== undefined ? judul : currentTicket.judul,
      deskripsi: deskripsi !== undefined ? deskripsi : currentTicket.deskripsi,
      completedAt:
        status === 'SELESAI'
          ? currentTicket.completedAt || new Date()
          : status === 'DIPROSES'
          ? null
          : currentTicket.completedAt,
    };

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: dataToUpdate,
      include: {
        pembuat: { select: { id: true, nama: true, noHp: true, role: true } },
        penanggungJawab: { select: { id: true, nama: true, noHp: true, role: true } },
        divisi: { select: { id: true, nama: true } },
        pelaksana: {
          select: { id: true, nama: true, noHp: true, telegramChatId: true, role: true },
        },
        parentTicket: {
          select: { id: true, judul: true, status: true, fotoInstruksi: true },
        },
        childTickets: {
          select: { id: true, judul: true, status: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action:
          status === 'MENUNGGU_VALIDASI'
            ? 'SUBMIT_COMPLETION_REPORT'
            : status === 'SELESAI'
            ? 'APPROVE_EVALUATION'
            : status === 'HOLD_ESKALASI'
            ? 'ESCALATE_TASK'
            : 'UPDATE_STATUS',
        entityType: 'Ticket',
        entityId: updatedTicket.id,
        userId: Number(req.user.id),
        details: `${role} mengubah status tiket #T-${String(updatedTicket.id).padStart(3, '0')} menjadi ${status}`,
      },
    });

    try {
      await dispatchTicketNotifications({
        previous: currentTicket,
        current: updatedTicket,
        actor: req.user.role === 'STAF' ? updatedTicket.pelaksana : updatedTicket.penanggungJawab,
      });
    } catch (notificationError) {
      console.error('[Telegram] Notifikasi pembaruan status gagal:', notificationError.message);
    }

    return res.status(200).json({
      message:
        status === 'MENUNGGU_VALIDASI'
          ? 'Laporan penyelesaian dan foto bukti berhasil dikirim untuk dievaluasi atasan!'
          : status === 'SELESAI'
          ? 'Evaluasi disetujui! Tugas resmi dinyatakan Selesai.'
          : status === 'HOLD_ESKALASI'
          ? 'Tugas berhasil dieskalasi ke pimpinan untuk penanganan lebih lanjut.'
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
    const callerRole = req.user?.role;
    const userDivisiId = req.user?.divisiId ? Number(req.user.divisiId) : null;

    let where = { role: 'STAF' };
    if (callerRole === 'DIREKTUR') {
      where.role = 'KADIV';
    } else if (callerRole === 'KADIV') {
      where.role = 'KOORDINATOR';
      if (userDivisiId) where.divisiId = userDivisiId;
    } else if (callerRole === 'KOORDINATOR') {
      where.role = 'STAF';
      if (userDivisiId) where.divisiId = userDivisiId;
    }

    const staffList = await prisma.user.findMany({
      where,
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
    return res.status(500).json({ message: 'Gagal mengambil daftar pelaksana.' });
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

// Memperbarui atau Mengarsipkan Dokumen SOP Berdasarkan ID
const updateSopById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { 
      nomorSop, 
      judul, 
      revisi, 
      deskripsi, 
      fileUrl, 
      divisiId, 
      status // <--- Ubah isArchived menjadi status
    } = req.body;

    const existingSop = await prisma.dokumenSop.findUnique({ where: { id } });
    if (!existingSop) return res.status(404).json({ message: 'Dokumen SOP tidak ditemukan.' });

    if (!['KADIV', 'DIREKTUR'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak.' });
    }

    const dataToUpdate = {};
    if (nomorSop !== undefined) dataToUpdate.nomorSop = nomorSop.trim();
    if (judul !== undefined) dataToUpdate.judul = judul.trim();
    if (revisi !== undefined) dataToUpdate.revisi = revisi;
    if (deskripsi !== undefined) dataToUpdate.deskripsi = deskripsi;
    if (fileUrl !== undefined) dataToUpdate.fileUrl = fileUrl;
    if (divisiId !== undefined) dataToUpdate.divisiId = divisiId ? Number(divisiId) : null;
    if (status !== undefined) dataToUpdate.status = status; // <--- Simpan status (AKTIF / ARSIP)

    const updatedSop = await prisma.dokumenSop.update({
      where: { id },
      data: dataToUpdate,
    });

    return res.status(200).json({ message: 'SOP diperbarui.', data: updatedSop });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal memperbarui SOP.' });
  }
};

const deleteSopPermanently = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existingSop = await prisma.dokumenSop.findUnique({ where: { id } });
    
    if (!existingSop) {
      return res.status(404).json({ message: 'Dokumen SOP tidak ditemukan.' });
    }

    if (!['KADIV', 'DIREKTUR'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak.' });
    }

    await prisma.dokumenSop.delete({ where: { id } });

    return res.status(200).json({ message: 'Dokumen SOP berhasil dihapus permanen.' });
  } catch (error) {
    console.error('Error deleteSopPermanently:', error);
    return res.status(500).json({ message: 'Gagal menghapus dokumen SOP dari server.' });
  }
};

// 7. Ambil Detail Tiket Berdasarkan ID (Termasuk Hirarki Parent-Child & fotoInstruksi)
const getTicketById = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const role = req.user?.role;
    const userDivisiId = req.user?.divisiId ? Number(req.user.divisiId) : null;
    const userId = Number(req.user?.id);

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        pembuat: { select: { id: true, nama: true, noHp: true, role: true } },
        penanggungJawab: { select: { id: true, nama: true, noHp: true, role: true } },
        divisi: { select: { id: true, nama: true } },
        pelaksana: { select: { id: true, nama: true, noHp: true, role: true, telegramChatId: true } },
        parentTicket: {
          select: {
            id: true,
            judul: true,
            status: true,
            prioritas: true,
            deadline: true,
            fotoInstruksi: true,
            pembuat: { select: { id: true, nama: true, role: true } },
          },
        },
        childTickets: {
          select: {
            id: true,
            judul: true,
            status: true,
            prioritas: true,
            deadline: true,
            completedAt: true,
            pelaksana: { select: { id: true, nama: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Tugas tidak ditemukan' });
    }

    // Pemeriksaan Akses Hak Role & Isolasi Divisi
    if (role === 'KADIV') {
      const isPembuat = ticket.pembuatId === userId;
      const isDivisiSama = userDivisiId && ticket.divisiId === userDivisiId;
      if (!isPembuat && !isDivisiSama) {
        return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk melihat tiket dari divisi lain.' });
      }
    } else if (role === 'KOORDINATOR') {
      const isPembuat = ticket.pembuatId === userId;
      const isPelaksana = ticket.pelaksanaId === userId;
      const isPenanggungJawab = ticket.penanggungJawabId === userId;
      const isDivisiSama = userDivisiId && ticket.divisiId === userDivisiId;
      if (!isPembuat && !isPelaksana && !isPenanggungJawab && !isDivisiSama) {
        return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk melihat tiket dari divisi lain.' });
      }
    } else if (role === 'STAF') {
      if (ticket.pelaksanaId !== userId && ticket.pembuatId !== userId) {
        return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk melihat tiket ini.' });
      }
    }

    return res.status(200).json({ data: ticket });
  } catch (error) {
    console.error('Error getTicketById:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
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
  getTicketById,
  updateSopById,
  deleteSopPermanently,
};