const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.JWT_SECRET || 'kunci_rahasia_rsia_2026';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    // Mendukung token via query string khusus untuk direct file download (PDF/Excel)
    token = req.query.token;
  }

  console.log('[AUTH DEBUG]', {
    path: req.originalUrl,
    hasToken: Boolean(token),
    source: authHeader ? 'bearer_header' : req.query?.token ? 'query_param' : 'none',
  });

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({
      message: 'Akses ditolak. Token tidak ditemukan.',
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
