// Backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

// Fungsi untuk memverifikasi token JWT dari Frontend
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Akses ditolak. Token tidak ditemukan." });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rahasia_super_aman');
        req.user = decoded; // Menyimpan data user (id, role, idDivisi) ke dalam request
        next();
    } catch (error) {
        return res.status(403).json({ message: "Token tidak valid atau sudah kedaluwarsa." });
    }
};

// Fungsi untuk membatasi akses berdasarkan Role (RBAC)
const checkRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Akses ditolak. Anda tidak memiliki izin untuk halaman ini." });
        }
        next();
    };
};

// PASTIKAN BARIS INI ADA (Ini yang menyebabkan error undefined sebelumnya)
module.exports = { verifyToken, checkRole };