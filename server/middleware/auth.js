const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aura_admin_secret_key_2026';
const bootId = Date.now();

function signToken(payload, options = { expiresIn: '7d' }) {
  return jwt.sign({ ...payload, bootId }, JWT_SECRET, options);
}

function verifyRequestToken(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return {
      ok: false,
      status: 401,
      code: 'MISSING_TOKEN',
      message: 'Vui lòng đăng nhập để tiếp tục',
    };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.bootId || decoded.bootId !== bootId) {
      return {
        ok: false,
        status: 401,
        code: 'SERVER_RESTARTED',
        message: 'Máy chủ vừa khởi động lại. Vui lòng đăng nhập lại từ đầu.',
      };
    }
    return { ok: true, decoded };
  } catch {
    return {
      ok: false,
      status: 401,
      code: 'INVALID_TOKEN',
      message: 'Phiên đăng nhập đã hết hạn',
    };
  }
}

function requireAdmin(req, res, next) {
  const result = verifyRequestToken(req);
  if (!result.ok) {
    return res.status(result.status).json({
      success: false,
      code: result.code,
      message: result.message,
    });
  }

  if (result.decoded.vaiTro !== 'QUAN_TRI') {
    return res.status(403).json({
      success: false,
      message: 'Tài khoản không có quyền quản trị',
    });
  }

  req.admin = result.decoded;
  next();
}

function requireAuth(req, res, next) {
  const result = verifyRequestToken(req);
  if (!result.ok) {
    return res.status(result.status).json({
      success: false,
      code: result.code,
      message: result.message,
    });
  }

  req.user = result.decoded;
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return next();
  }

  const result = verifyRequestToken(req);
  if (!result.ok) {
    return res.status(result.status).json({
      success: false,
      code: result.code,
      message: result.message,
    });
  }

  req.user = result.decoded;
  next();
}

module.exports = {
  requireAdmin,
  requireAuth,
  optionalAuth,
  signToken,
  JWT_SECRET,
  bootId,
};
