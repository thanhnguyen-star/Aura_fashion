const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

async function login(req, res) {
  try {
    // 1. Validate đầu vào
    const email = (req.body.email || '').trim();
    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email và mật khẩu' });
    }

    // 2. Truy vấn tài khoản
    const sql = `
      SELECT MaTaiKhoan, HoTen, Email, MatKhauBam, VaiTro, BiKhoa
      FROM TaiKhoan
      WHERE Email = ?
      LIMIT 1
    `;
    const [[user]] = await pool.query(sql, [email]);

    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    if (Boolean(user.BiKhoa)) {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa' });
    }

    const isBcryptHash = String(user.MatKhauBam).startsWith('$2');
    const isMatch = isBcryptHash
      ? await bcrypt.compare(password, user.MatKhauBam)
      : password === user.MatKhauBam;

    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // 3. Ký JWT và trả kết quả
    const payload = {
      maTaiKhoan: user.MaTaiKhoan,
      hoTen: user.HoTen,
      email: user.Email,
      vaiTro: user.VaiTro,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, admin: payload });
  } catch (err) {
    console.error('[auth.controller > login]', err);
    res.status(500).json({ message: 'Lỗi đăng nhập hệ thống', error: err.message });
  }
}

module.exports = { login };