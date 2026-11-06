// Backend/routes/notificationRoute.js
const express = require('express');
const router = express.Router();

const {
  getNotificationLogs,
  retrySingleNotification,
  retryAllFailedNotifications,
} = require('../controllers/notificationLogController');

const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Seluruh rute Notification Log hanya dapat diakses oleh Admin Sistem (Modul 4 & Modul 5)
router.use(verifyToken);
router.use(checkRole(['ADMIN']));

// 1. Ambil daftar dan ringkasan KPI log notifikasi
router.get('/logs', getNotificationLogs);

// 2. Retry manual untuk satu notifikasi spesifik
router.post('/logs/:id/retry', retrySingleNotification);

// 3. Retry massal untuk seluruh notifikasi yang gagal
router.post('/logs/retry-failed', retryAllFailedNotifications);

module.exports = router;
