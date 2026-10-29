const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.JWT_SECRET || 'kunci_rahasia_rsia_2026';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log('[AUTH DEBUG]', {
    path: req.originalUrl,
    hasAuthorization: Boolean(authHeader),
    startsWithBearer: authHeader?.startsWith('Bearer '),
  });

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Akses ditolak. Token tidak ditemukan.',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({
      message: 'Akses ditolak. Format token kosong.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    console.log('[AUTH JWT VALID]', {
      path: req.originalUrl,
      role: decoded.role,
      userId: decoded.id,
    });

    req.user = decoded;
    next();
  } catch (error) {
    console.error('[AUTH JWT ERROR]', error.message);

    return res.status(403).json({
      message: 'Token tidak valid atau sudah kedaluwarsa.',
    });
  }
};

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    console.log('[AUTH ROLE CHECK]', {
      role: req.user?.role,
      allowedRoles,
    });

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