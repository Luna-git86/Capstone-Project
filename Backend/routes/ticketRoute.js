// Backend/routes/ticketRoute.js
const express = require('express');
const router = express.Router();

const {
  createTicket,
  getTickets,
  triageTicket,
  updateTicketStatus,
  getAssignableStaff,
  getSops,
  createOrUpdateSop,
  getTicketById, // <-- 1. TAMBAHKAN IMPOR INI
} = require('../controllers/ticketController');

const {
  getTicketOptions,
} = require('../controllers/ticketOptionsController');

const {
  verifyToken,
  checkRole,
} = require('../middlewares/authMiddleware');

router.use(verifyToken);

// Pilihan dropdown divisi & pelaksana dibuka untuk semua role
router.get(
  '/options',
  checkRole(['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']),
  getTicketOptions
);

router.get(
  '/staff',
  checkRole(['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']),
  getAssignableStaff
);

// Panduan SOP
router.get(
  '/sops',
  checkRole(['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']),
  getSops
);

router.post(
  '/sops',
  checkRole(['DIREKTUR', 'KADIV']),
  createOrUpdateSop
);

// Buat Laporan Masalah (Semua kecuali Admin) & Buat Tugas (Koordinator, Kadiv, Direktur)
router.post(
  '/',
  checkRole(['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']),
  createTicket
);

// Lihat Daftar Tugas (Semua Role)
router.get(
  '/',
  checkRole(['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']),
  getTickets
);

// <-- 2. TAMBAHKAN RUTE GET DETAIL TUGAS BERDASARKAN ID DI SINI -->
router.get(
  '/:id',
  checkRole(['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']),
  getTicketById
);

// Buat Tugas dari Tiket Masalah / Disposisi (Direktur, Kadiv, Koordinator)
router.patch(
  '/:id/triage',
  checkRole(['DIREKTUR', 'KADIV', 'KOORDINATOR']),
  triageTicket
);

router.put(
  '/:id/triage',
  checkRole(['DIREKTUR', 'KADIV', 'KOORDINATOR']),
  triageTicket
);

// Ubah Status Tugas & Evaluasi Foto
router.patch(
  '/:id/status',
  checkRole(['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']),
  updateTicketStatus
);

router.put(
  '/:id/status',
  checkRole(['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']),
  updateTicketStatus
);

module.exports = router;