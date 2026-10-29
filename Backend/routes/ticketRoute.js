
const express = require('express');
const router = express.Router();

const {
  createTicket,
  assignTicket,
  getTickets,
  updateTicketStatus,
} = require('../controllers/ticketController');

const {
  getTicketOptions,
} = require('../controllers/ticketOptionsController');

const {
  verifyToken,
  checkRole,
} = require('../middlewares/authMiddleware');

router.use(verifyToken);

// Data pilihan dropdown dari database
router.get(
  '/options',
  checkRole(['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR']),
  getTicketOptions
);

// Direktur, KADIV, dan Koordinator dapat membuat/mengajukan tugas.
router.post(
  '/',
  checkRole(['DIREKTUR', 'KADIV', 'KOORDINATOR']),
  createTicket
);

// Persetujuan dan delegasi pelaksana hanya oleh KADIV/Direktur.
router.patch(
  '/:id/assign',
  checkRole(['DIREKTUR', 'KADIV']),
  assignTicket
);

// Semua role yang ditentukan dapat melihat tiket
router.get(
  '/',
  checkRole(['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']),
  getTickets
);

// Pengubahan status tiket
router.patch(
  '/:id/status',
  checkRole(['ADMIN', 'KADIV', 'KOORDINATOR', 'STAF']),
  updateTicketStatus
);

module.exports = router;
