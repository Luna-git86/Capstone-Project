const express = require('express');
const router = express.Router();
const { getNotificationLogs } = require('../controllers/notificationLogController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, checkRole(['ADMIN']), getNotificationLogs);

module.exports = router;
