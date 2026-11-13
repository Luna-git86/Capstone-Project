// Backend/routes/notificationRoute.js
const express = require('express');
const router = express.Router();

const {
  getNotificationLogs,
  getMyNotifications,
  retrySingleNotification,
  retryAllFailedNotifications,
} = require('../controllers/notificationLogController');

const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Seluruh rute wajib login
router.use(verifyToken);

// 1. Ambil notifikasi masuk khusus akun pengguna yang sedang login (Semua Role: STAF, KOORDINATOR, KADIV, DIREKTUR, ADMIN)
router.get('/my-notifications', getMyNotifications);

// Seluruh rute Notification Log di bawah ini hanya dapat diakses oleh Admin Sistem (Modul 4 & Modul 5)
router.use(checkRole(['ADMIN']));

// 2. Ambil daftar dan ringkasan KPI log notifikasi
router.get('/logs', getNotificationLogs);

// 3. Retry manual untuk satu notifikasi spesifik
router.post('/logs/:id/retry', retrySingleNotification);

// 4. Retry massal untuk seluruh notifikasi yang gagal
router.post('/logs/retry-failed', retryAllFailedNotifications);

module.exports = router;
