
const express = require('express');
const router = express.Router();

const {
  createTicket,
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
  checkRole(['ADMIN', 'DIREKTUR', 'KADIV']),
  getTicketOptions
);

// Hanya Direktur dan KADIV yang dapat membuat tugas
router.post(
  '/',
  checkRole(['DIREKTUR', 'KADIV']),
  createTicket
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
