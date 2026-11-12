// Backend/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET wajib dikonfigurasi pada environment production!');
  }
  return 'dev_only_secret_rsia_2026';
};

// Fungsi untuk menyensor token dari URL sebelum dicatat ke log (Mengatasi Temuan A.2)
const sanitizeUrlForLog = (url = '') => {
  return String(url).replace(/([?&]token=)[^&]+/gi, '$1[REDACTED]');
};

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token && req.path.includes('export')) {
      // Query token hanya diizinkan khusus untuk endpoint unduh/export laporan
      token = String(req.query.token);
    }

    if (!token) {
      return res.status(401).json({
        message: 'Akses ditolak. Token tidak ditemukan.',
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    return next();
  } catch (error) {
    console.warn(`[Auth] Token tidak valid pada ${sanitizeUrlForLog(req.originalUrl)}`);
    return res.status(401).json({
      message: 'Sesi telah berakhir atau token tidak valid. Silakan login kembali.',
    });
  }
};

const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.warn(
        `[RBAC] Akses ditolak untuk role ${req.user?.role || 'UNKNOWN'} ke ${sanitizeUrlForLog(req.originalUrl)}`
      );
      return res.status(403).json({
        message: 'Akses Ditolak! Jabatan Anda tidak memiliki wewenang untuk tindakan ini.',
      });
    }
    return next();
  };
};

module.exports = {
  verifyToken,
  checkRole,
  getJwtSecret,
};