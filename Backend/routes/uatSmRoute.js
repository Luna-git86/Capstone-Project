// Backend/routes/uatSmRoute.js
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');
const uatSmController = require('../controllers/uatSmController');

// Proteksi wajib: hanya akun PENGUJI yang dapat membuka simulator pengujian UAT
router.use(verifyToken);
router.use(checkRole(['PENGUJI']));

router.get('/status', uatSmController.getStatus);
router.get('/stage-data/:tabKey', uatSmController.getTabData);
router.post('/run/:stageId', uatSmController.runStage);
router.get('/figure/:filename', uatSmController.getFigure);
router.post('/check-excel', uatSmController.checkUploadedExcel);

module.exports = router;
