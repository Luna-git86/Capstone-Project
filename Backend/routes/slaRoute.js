const express = require('express');
const router = express.Router();
const { getLaporanSLA } = require('../controllers/slaController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

router.get(
  '/',
  verifyToken,
  checkRole(['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR']),
  getLaporanSLA
);

module.exports = router;
