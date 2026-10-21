// Backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Endpoint untuk login: POST /api/auth/login
router.post('/login', login);

// Endpoint untuk register: POST /api/auth/register 
// (Bisa kita uji nanti, siapkan saja dulu rutenya)
router.post('/register', register);

module.exports = router;