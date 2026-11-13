// Backend/routes/smRoute.js
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const smController = require('../controllers/smController');

// Proteksi Wajib: Login JWT Valid + Role hanya DIREKTUR & KADIV
router.use(verifyToken);
router.use(checkRole(['DIREKTUR', 'KADIV']));

// Endpoint dinamis untuk memuat berkas JSON dashboard ter-whitelist
router.get('/:file', smController.getDashboardData);

module.exports = router;
