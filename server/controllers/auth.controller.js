const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// 1. Đăng nhập hệ thống (Áp dụng cho cả Khách hàng & Quản trị viên)
async function login(req, res) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ email và mật khẩu',
        code: 'MISSING_FIELDS',
      });
    }

    // Truy vấn tài khoản
    const sql = `
      SELECT MaTaiKhoan, HoTen, Email, SoDienThoai, MatKhauBam, VaiTro, BiKhoa
      FROM TaiKhoan
      WHERE LOWER(Email) = ?
      LIMIT 1
    `;
    const [[user]] = await pool.query(sql, [email]);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Kiểm tra trạng thái khóa tài khoản (Screen 4 Biến thể 2 Figma)
    if (Boolean(user.BiKhoa)) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ khách hàng care@aura.vn để được mở khóa.',
        code: 'ACCOUNT_LOCKED',
      });
    }

    // So khớp mật khẩu
    const isBcryptHash = String(user.MatKhauBam).startsWith('$2');
    const isMatch = isBcryptHash
      ? await bcrypt.compare(password, user.MatKhauBam)
      : password === user.MatKhauBam;

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Ký token JWT
    const payload = {
      maTaiKhoan: user.MaTaiKhoan,
      hoTen: user.HoTen,
      email: user.Email,
      soDienThoai: user.SoDienThoai,
      vaiTro: user.VaiTro,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: payload,
    });
  } catch (err) {
    console.error('[auth.controller > login]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đăng nhập',
      error: err.message,
    });
  }
}

// 2. Đăng ký tài khoản khách hàng mới (Screen 5 & Screen 6 Figma)
async function register(req, res) {
  const conn = await pool.getConnection();
  try {
    const hoTen = (req.body.hoTen || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const soDienThoai = (req.body.soDienThoai || '').trim() || null;

    if (!hoTen || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Họ tên, email và mật khẩu là các trường bắt buộc',
        code: 'MISSING_FIELDS',
      });
    }

    // Kiểm tra định dạng email cơ bản
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Định dạng email không hợp lệ',
        code: 'INVALID_EMAIL',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có tối thiểu 6 ký tự',
        code: 'PASSWORD_TOO_SHORT',
      });
    }

    await conn.beginTransaction();

    // Kiểm tra email đã tồn tại hay chưa
    const [[existing]] = await conn.query('SELECT MaTaiKhoan FROM TaiKhoan WHERE LOWER(Email) = ?', [email]);
    if (existing) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: 'Email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc sử dụng email khác.',
        code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    // Băm mật khẩu bằng bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tạo tài khoản mới
    const [result] = await conn.query(
      `INSERT INTO TaiKhoan (HoTen, Email, SoDienThoai, MatKhauBam, VaiTro, BiKhoa)
       VALUES (?, ?, ?, ?, 'KHACH_HANG', 0)`,
      [hoTen, email, soDienThoai, hashedPassword]
    );

    const newUserId = result.insertId;

    // Tự động khởi tạo giỏ hàng cho khách mới
    await conn.query('INSERT INTO GioHang (MaTaiKhoan) VALUES (?)', [newUserId]);

    await conn.commit();

    const payload = {
      maTaiKhoan: newUserId,
      hoTen,
      email,
      soDienThoai,
      vaiTro: 'KHACH_HANG',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      token,
      user: payload,
    });
  } catch (err) {
    await conn.rollback();
    console.error('[auth.controller > register]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi đăng ký tài khoản',
      error: err.message,
    });
  } finally {
    conn.release();
  }
}

// 3. Lấy thông tin tài khoản hiện tại
async function getProfile(req, res) {
  try {
    const userId = req.user?.maTaiKhoan;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }

    const [[user]] = await pool.query(
      `SELECT MaTaiKhoan, HoTen, Email, SoDienThoai, VaiTro, BiKhoa, NgayTao
       FROM TaiKhoan WHERE MaTaiKhoan = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    res.json({
      success: true,
      user: {
        maTaiKhoan: user.MaTaiKhoan,
        hoTen: user.HoTen,
        email: user.Email,
        soDienThoai: user.SoDienThoai,
        vaiTro: user.VaiTro,
        biKhoa: Boolean(user.BiKhoa),
        ngayTao: user.NgayTao,
      },
    });
  } catch (err) {
    console.error('[auth.controller > getProfile]', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy thông tin hồ sơ', error: err.message });
  }
}

module.exports = {
  login,
  register,
  getProfile,
};
