// Backend/routes/authRoute.js
const express = require('express');
const router = express.Router();

const {
  login,
  register,
  getUsers,
  resetPassword,
  deleteUser,
  getDivisi,
  getAuditLogs,
  createTelegramLink,
  getTelegramStatus,
  unlinkTelegram,
} = require('../controllers/authController');

const {
  verifyToken,
  checkRole,
} = require('../middlewares/authMiddleware');

// Rute Publik
router.post('/login', login);
router.get('/divisi', getDivisi);

// Rute Tautan Telegram (Semua Pengguna Terotentikasi)
router.post('/telegram/link-token', verifyToken, createTelegramLink);
router.get('/telegram/status', verifyToken, getTelegramStatus);
router.delete('/telegram/link', verifyToken, unlinkTelegram);

// Rute Khusus Admin Sistem (Modul 1 & Modul 6 UAT)
router.get('/users', verifyToken, checkRole(['ADMIN']), getUsers);
router.post('/register', verifyToken, checkRole(['ADMIN']), register);
router.post('/users', verifyToken, checkRole(['ADMIN']), register);
router.put('/users/:id/reset-password', verifyToken, checkRole(['ADMIN']), resetPassword);
router.patch('/users/:id/reset-password', verifyToken, checkRole(['ADMIN']), resetPassword);
router.delete('/users/:id', verifyToken, checkRole(['ADMIN']), deleteUser);
router.get('/audit-logs', verifyToken, checkRole(['ADMIN']), getAuditLogs);

module.exports = router;
