// Backend/controllers/ticketController.js
const prisma = require('../db');

// Fungsi Membuat Tiket Baru
const createTicket = async (req, res) => {
    try {
        const { judul, deskripsi, prioritas, idDivisi } = req.body;
        const pembuatId = req.user.id; 

        const newTicket = await prisma.ticket.create({
            data: {
                judul,
                deskripsi,
                prioritas: prioritas || 'NORMAL',
                status: 'MENUNGGU',
                pembuatId,
                idDivisi: idDivisi || req.user.idDivisi 
            }
        });

        res.status(201).json({ message: "Tiket berhasil dibuat!", data: newTicket });
    } catch (error) {
        console.error("Error createTicket:", error);
        res.status(500).json({ message: "Gagal membuat tiket pada server." });
    }
};

// Fungsi Mengambil Daftar Tiket 
const getTickets = async (req, res) => {
    try {
        const { role, idDivisi } = req.user; 
        let filter = {};

        // Skenario UAT: Filter tiket khusus divisinya (kecuali Admin/Direktur)
        if (['KADIV', 'KOORDINATOR', 'STAF'].includes(role)) {
            if (!idDivisi) return res.status(200).json({ data: [] });
            filter = { idDivisi: idDivisi };
        }

        const tickets = await prisma.ticket.findMany({
            where: filter,
            include: { 
                pembuat: { select: { namaLengkap: true, role: true } },
                divisi: { select: { namaDivisi: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ data: tickets });
    } catch (error) {
        console.error("Error getTickets:", error);
        res.status(500).json({ message: "Gagal mengambil daftar tiket." });
    }
};

// Fungsi Memperbarui Status Tiket 
const updateTicketStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; 

        const validStatus = ['MENUNGGU', 'PROSES', 'SELESAI', 'DITOLAK'];
        if (!validStatus.includes(status)) {
            return res.status(400).json({ message: "Pilihan status tidak valid." });
        }

        const updatedTicket = await prisma.ticket.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        res.status(200).json({ message: `Status diperbarui menjadi ${status}!`, data: updatedTicket });
    } catch (error) {
        console.error("Error updateTicketStatus:", error);
        res.status(500).json({ message: "Gagal memperbarui status tiket." });
    }
};

module.exports = { createTicket, getTickets, updateTicketStatus };