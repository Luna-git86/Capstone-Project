// Backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

// Kunci rahasia harus SAMA PERSIS dengan yang ada di authController.js
const JWT_SECRET = process.env.JWT_SECRET || 'kunci_rahasia_rsia_2026';

// 1. Middleware Verifikasi Token Login
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ message: 'Akses ditolak. Format token kosong.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Berisi { id, role, divisiId }
    next();
  } catch (error) {
    console.error('Verifikasi JWT gagal:', error.message);
    return res.status(403).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
};

// 2. Middleware Pemeriksa Role (RBAC)
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Akses Ditolak! Role Anda tidak memiliki wewenang untuk aksi ini.',
      });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  checkRole,
};