// Backend/routes/slaRoute.js
const express = require('express');
const router = express.Router();
const { getLaporanSLA } = require('../controllers/slaController');
const { exportExcelSla, exportPdfSla } = require('../controllers/slaExportController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Middleware otentikasi global untuk seluruh rute laporan SLA
router.use(verifyToken);
// Staf tidak diizinkan mengakses laporan SLA (Hanya Admin, Direktur, Kadiv, Koordinator)
router.use(checkRole(['ADMIN', 'DIREKTUR', 'KADIV', 'KOORDINATOR']));

// 1. Data JSON Laporan SLA (untuk tampilan tabel & kartu KPI di Frontend)
router.get('/', getLaporanSLA);

// 2. Export File Excel (.xlsx)
router.get('/export/excel', exportExcelSla);

// 3. Export File PDF (.pdf)
router.get('/export/pdf', exportPdfSla);

module.exports = router;
