// Backend/routes/ticketRoutes.js
const express = require('express');
const router = express.Router();
const { createTicket, getTickets, updateTicketStatus } = require('../controllers/ticketController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Kunci semua rute tiket dengan verifikasi token
router.use(verifyToken);

// Hanya Admin, Koordinator, dan Staf yang bisa membuat tiket
router.post('/', checkRole(['ADMIN', 'KOORDINATOR', 'STAF']), createTicket);

// Semua 5 role bisa melihat tiket (nanti difilter per divisi di controller)
router.get('/', checkRole(['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR', 'STAF']), getTickets);

// Hanya Admin, Kadiv, Koordinator, dan Staf yang bisa mengubah status tiket
router.patch('/:id/status', checkRole(['ADMIN', 'KADIV', 'KOORDINATOR', 'STAF']), updateTicketStatus);

module.exports = router;