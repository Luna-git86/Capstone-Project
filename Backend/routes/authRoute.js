// Backend/routes/authRoute.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, checkRole } = require('../middlewares/authMiddleware');

// Rute Publik: Login & Daftar Divisi
router.post('/login', authController.login);
router.get('/divisi', authController.getDivisi);

// Rute Eksklusif Admin Sistem (UAT-1.1): Manajemen Akun, Register & Reset Password
router.get('/users', verifyToken, checkRole(['ADMIN']), authController.getUsers);
router.post('/register', verifyToken, checkRole(['ADMIN']), authController.register);
router.put('/users/:id/reset-password', verifyToken, checkRole(['ADMIN']), authController.resetPassword);

module.exports = router;