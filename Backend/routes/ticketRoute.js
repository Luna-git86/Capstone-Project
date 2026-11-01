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
} = require('../controllers/ticketController');

const {
  getTicketOptions,
} = require('../controllers/ticketOptionsController');

const {
  verifyToken,
  checkRole,
} = require('../middlewares/authMiddleware');

router.use(verifyToken);

// Pilihan dropdown divisi & pelaksana
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

// Buat Laporan / Tugas (Hanya Direktur, Kadiv, Koordinator, dan Staf — Admin Tidak Boleh)
router.post(
  '/',
  checkRole(['DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']),
  createTicket
);

// Lihat Daftar Tugas (Semua Role Termasuk Admin)
router.get(
  '/',
  checkRole(['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']),
  getTickets
);

// Bagi Tugas / Tunjuk Staf Pelaksana (Khusus Atasan: Direktur, Kadiv, Koordinator)
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

// Ubah Status Tugas (Admin Tidak Boleh)
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