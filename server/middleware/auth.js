const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aura_admin_secret_key_2026';

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Vui lòng đăng nhập quản trị viên' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.vaiTro !== 'QUAN_TRI') {
      return res.status(403).json({ message: 'Tài khoản không có quyền quản trị' });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn' });
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để tiếp tục' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập đã hết hạn' });
  }
}

module.exports = { requireAdmin, requireAuth, JWT_SECRET };
