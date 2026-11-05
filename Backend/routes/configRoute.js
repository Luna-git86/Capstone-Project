// Backend/routes/configRoute.js
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const {
  getSystemConfig,
  updateSystemConfig,
  getTelegramBotStatus,
  getRecipientsSummary,
  getConfigAuditLogs,
} = require('../controllers/adminConfigController');

// Proteksi seluruh rute konfigurasi khusus untuk role ADMIN
router.use(verifyToken, checkRole(['ADMIN']));

router.get('/', getSystemConfig);
router.put('/', updateSystemConfig);
router.get('/telegram-status', getTelegramBotStatus);
router.get('/recipients-summary', getRecipientsSummary);
router.get('/audit-logs', getConfigAuditLogs);

module.exports = router;
