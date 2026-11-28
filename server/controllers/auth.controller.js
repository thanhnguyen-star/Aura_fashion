const bcrypt = require('bcryptjs');
const { randomInt } = require('crypto');
const pool = require('../db');
const firebaseAdmin = require('../firebaseAdmin');
const { signToken } = require('../middleware/auth');

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

    const token = signToken(payload);

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

// 2. Tạo OTP để frontend gửi email bằng EmailJS.
async function sendOtp(req, res) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập địa chỉ email hợp lệ.',
        code: 'INVALID_EMAIL',
      });
    }

    const [[existing]] = await pool.query(
      'SELECT MaTaiKhoan FROM TaiKhoan WHERE LOWER(Email) = ? LIMIT 1',
      [email]
    );

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.',
        code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    const otp = randomInt(100000, 1000000).toString();
    await pool.query(
      `INSERT INTO otp_codes (email, code, attempts, expires_at)
       VALUES (?, ?, 0, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
       ON DUPLICATE KEY UPDATE
         code = ?,
         attempts = 0,
         expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE)`,
      [email, otp, otp]
    );

    return res.json({
      success: true,
      otp_code: otp,
    });
  } catch (err) {
    console.error('[auth.controller > sendOtp]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Không thể tạo mã OTP lúc này. Vui lòng thử lại.',
    });
  }
}

async function verifyOtp(req, res) {
  const email = (req.body.email || '').trim().toLowerCase();
  const otp = (req.body.otp || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ success: false, message: 'Email hoặc mã OTP không hợp lệ.' });
  }

  let conn;
  let transactionStarted = false;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    transactionStarted = true;

    const [[record]] = await conn.query(
      'SELECT code, attempts, (expires_at < NOW()) AS expired FROM otp_codes WHERE email = ? FOR UPDATE',
      [email]
    );
    if (!record) {
      await conn.rollback();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Không tìm thấy mã OTP. Vui lòng gửi mã mới.', code: 'OTP_NOT_FOUND' });
    }

    if (Boolean(record.expired)) {
      await conn.query('DELETE FROM otp_codes WHERE email = ?', [email]);
      await conn.commit();
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn. Vui lòng gửi mã mới.', code: 'OTP_EXPIRED' });
    }

    if (record.code !== otp) {
      const attempts = Number(record.attempts) + 1;
      if (attempts >= 5) {
        await conn.query('DELETE FROM otp_codes WHERE email = ?', [email]);
        await conn.commit();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: 'Bạn đã nhập sai mã 5 lần. Vui lòng gửi mã mới.', code: 'OTP_ATTEMPTS_EXCEEDED' });
      }

      await conn.query('UPDATE otp_codes SET attempts = ? WHERE email = ?', [attempts, email]);
      await conn.commit();
      transactionStarted = false;
      return res.status(400).json({
        success: false,
        message: `Mã OTP không chính xác. Bạn còn ${5 - attempts} lần thử.`,
        code: 'INVALID_OTP',
      });
    }

    await conn.query('DELETE FROM otp_codes WHERE email = ?', [email]);
    await conn.commit();
    transactionStarted = false;
    return res.json({ success: true, message: 'Xác minh OTP thành công.' });
  } catch (err) {
    if (transactionStarted) await conn.rollback();
    console.error('[auth.controller > verifyOtp]', err.message);
    return res.status(500).json({ success: false, message: 'Không thể xác minh mã OTP lúc này.' });
  } finally {
    conn?.release();
  }
}

// 3. Đăng ký tài khoản khách hàng mới (Screen 5 & Screen 6 Figma)
async function registerFirebase(req, res) {
  const authorization = req.headers.authorization || '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!idToken) {
    return res.status(401).json({ success: false, message: 'Thiếu Firebase ID token.' });
  }

  let firebaseUser;
  try {
    firebaseUser = await firebaseAdmin.auth().verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ success: false, message: 'Firebase ID token không hợp lệ hoặc đã hết hạn.' });
  }

  const hoTen = (req.body.hoTen || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const soDienThoai = (req.body.soDienThoai || '').trim() || null;

  if (!hoTen || !email || !password) {
    return res.status(400).json({ success: false, message: 'Họ tên, email và mật khẩu là bắt buộc.' });
  }
  if (!firebaseUser.email || firebaseUser.email.toLowerCase() !== email) {
    return res.status(403).json({ success: false, message: 'Email không khớp với Firebase account.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Địa chỉ email không hợp lệ.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự.' });
  }

  let conn;
  let transactionStarted = false;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    transactionStarted = true;

    const [[existing]] = await conn.query(
      'SELECT MaTaiKhoan FROM TaiKhoan WHERE LOWER(Email) = ? LIMIT 1',
      [email]
    );
    if (existing) {
      await conn.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        message: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.',
        code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const [result] = await conn.query(
      `INSERT INTO TaiKhoan (HoTen, Email, SoDienThoai, MatKhauBam, VaiTro, BiKhoa)
       VALUES (?, ?, ?, ?, 'KHACH_HANG', 0)`,
      [hoTen, email, soDienThoai, hashedPassword]
    );
    await conn.query('INSERT INTO GioHang (MaTaiKhoan) VALUES (?)', [result.insertId]);
    await conn.commit();
    transactionStarted = false;

    const user = {
      maTaiKhoan: result.insertId,
      hoTen,
      email,
      soDienThoai,
      vaiTro: 'KHACH_HANG',
    };
    const token = signToken(user);
    return res.status(201).json({ success: true, message: 'Đăng ký tài khoản thành công.', token, user });
  } catch (err) {
    if (transactionStarted) await conn.rollback();
    console.error('[auth.controller > registerFirebase]', err);
    return res.status(500).json({ success: false, message: 'Không thể lưu thông tin tài khoản.' });
  } finally {
    conn?.release();
  }
}

// 3b. Đăng ký tài khoản trực tiếp (có xác thực OTP cho @gmail.com)
async function register(req, res) {
  const hoTen = (req.body.hoTen || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const soDienThoai = (req.body.soDienThoai || '').trim() || null;
  const isGmail = email.endsWith('@gmail.com');
  const otp = (req.body.otp || '').trim();

  if (!hoTen || !email || !password) {
    return res.status(400).json({ success: false, message: 'Họ tên, email và mật khẩu là bắt buộc.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Địa chỉ email không hợp lệ.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự.' });
  }
  if (isGmail && !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.' });
  }

  let conn;
  let transactionStarted = false;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    transactionStarted = true;

    const [[existing]] = await conn.query(
      'SELECT MaTaiKhoan FROM TaiKhoan WHERE LOWER(Email) = ? LIMIT 1',
      [email]
    );
    if (existing) {
      await conn.rollback();
      transactionStarted = false;
      return res.status(409).json({
        success: false,
        message: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.',
        code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    if (isGmail) {
      const [[record]] = await conn.query(
        'SELECT code, attempts, (expires_at < NOW()) AS expired FROM otp_codes WHERE email = ? FOR UPDATE',
        [email]
      );
      if (!record) {
        await conn.rollback();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: 'Không tìm thấy mã OTP. Vui lòng gửi mã mới.', code: 'OTP_NOT_FOUND' });
      }
      if (Boolean(record.expired)) {
        await conn.query('DELETE FROM otp_codes WHERE email = ?', [email]);
        await conn.commit();
        transactionStarted = false;
        return res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn. Vui lòng gửi mã mới.', code: 'OTP_EXPIRED' });
      }
      if (record.code !== otp) {
        const attempts = Number(record.attempts) + 1;
        if (attempts >= 5) {
          await conn.query('DELETE FROM otp_codes WHERE email = ?', [email]);
          await conn.commit();
          transactionStarted = false;
          return res.status(400).json({ success: false, message: 'Bạn đã nhập sai mã 5 lần. Vui lòng gửi mã mới.', code: 'OTP_ATTEMPTS_EXCEEDED' });
        }
        await conn.query('UPDATE otp_codes SET attempts = ? WHERE email = ?', [attempts, email]);
        await conn.commit();
        transactionStarted = false;
        return res.status(400).json({
          success: false,
          message: `Mã OTP không chính xác. Bạn còn ${5 - attempts} lần thử.`,
          code: 'INVALID_OTP',
        });
      }
      await conn.query('DELETE FROM otp_codes WHERE email = ?', [email]);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const [result] = await conn.query(
      `INSERT INTO TaiKhoan (HoTen, Email, SoDienThoai, MatKhauBam, VaiTro, BiKhoa)
       VALUES (?, ?, ?, ?, 'KHACH_HANG', 0)`,
      [hoTen, email, soDienThoai, hashedPassword]
    );
    await conn.query('INSERT INTO GioHang (MaTaiKhoan) VALUES (?)', [result.insertId]);
    await conn.commit();
    transactionStarted = false;

    const user = {
      maTaiKhoan: result.insertId,
      hoTen,
      email,
      soDienThoai,
      vaiTro: 'KHACH_HANG',
    };
    const token = signToken(user);
    return res.status(201).json({ success: true, message: 'Đăng ký tài khoản thành công.', token, user });
  } catch (err) {
    if (transactionStarted) await conn.rollback();
    console.error('[auth.controller > register]', err);
    return res.status(500).json({ success: false, message: 'Không thể lưu thông tin tài khoản.' });
  } finally {
    conn?.release();
  }
}

// 4. Đăng nhập / Đăng ký nhanh qua tài khoản Google
async function googleLogin(req, res) {
  const email = (req.body.email || '').trim().toLowerCase();
  const name = (req.body.name || req.body.hoTen || '').trim() || 'Người dùng Google';
  const avatar = req.body.avatar || null;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Không tìm thấy thông tin email từ tài khoản Google.',
      code: 'MISSING_EMAIL',
    });
  }

  const conn = await pool.getConnection();
  try {

    // Kiểm tra tài khoản đã tồn tại trong CSDL chưa
    const sql = `
      SELECT MaTaiKhoan, HoTen, Email, SoDienThoai, MatKhauBam, VaiTro, BiKhoa
      FROM TaiKhoan
      WHERE LOWER(Email) = ?
      LIMIT 1
    `;
    const [[user]] = await conn.query(sql, [email]);

    if (user) {
      // Nếu đã có tài khoản, kiểm tra trạng thái khóa
      if (Boolean(user.BiKhoa)) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản Google này liên kết với tài khoản đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ care@aura.vn.',
          code: 'ACCOUNT_LOCKED',
        });
      }

      const payload = {
        maTaiKhoan: user.MaTaiKhoan,
        hoTen: user.HoTen,
        email: user.Email,
        soDienThoai: user.SoDienThoai,
        vaiTro: user.VaiTro,
        avatar,
      };

      const token = signToken(payload);

      return res.json({
        success: true,
        message: 'Đăng nhập Google thành công',
        token,
        user: payload,
      });
    }

    // Nếu chưa có, tự động tạo tài khoản Khách Hàng mới
    await conn.beginTransaction();

    const randomPassword = 'GGL_' + Math.random().toString(36).slice(-10) + Date.now();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    const [result] = await conn.query(
      `INSERT INTO TaiKhoan (HoTen, Email, SoDienThoai, MatKhauBam, VaiTro, BiKhoa)
       VALUES (?, ?, null, ?, 'KHACH_HANG', 0)`,
      [name, email, hashedPassword]
    );

    const newUserId = result.insertId;

    // Tự động tạo giỏ hàng cho khách mới
    await conn.query('INSERT INTO GioHang (MaTaiKhoan) VALUES (?)', [newUserId]);

    await conn.commit();

    const payload = {
      maTaiKhoan: newUserId,
      hoTen: name,
      email,
      soDienThoai: null,
      vaiTro: 'KHACH_HANG',
      avatar,
    };

    const token = signToken(payload);

    res.status(201).json({
      success: true,
      message: 'Đăng ký và liên kết tài khoản Google thành công',
      token,
      user: payload,
    });
  } catch (err) {
    await conn.rollback();
    console.error('[auth.controller > googleLogin]', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi đăng nhập Google: ' + err.message,
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

// 4. Cập nhật thông tin tài khoản (Họ tên, SĐT)
async function updateProfile(req, res) {
  try {
    const userId = req.user?.maTaiKhoan;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }

    const hoTen = (req.body.hoTen || '').trim();
    const soDienThoai = (req.body.soDienThoai || '').trim() || null;

    if (!hoTen) {
      return res.status(400).json({ success: false, message: 'Họ tên không được để trống' });
    }

    await pool.query(
      'UPDATE TaiKhoan SET HoTen = ?, SoDienThoai = ? WHERE MaTaiKhoan = ?',
      [hoTen, soDienThoai, userId]
    );

    const [[updatedUser]] = await pool.query(
      'SELECT MaTaiKhoan, HoTen, Email, SoDienThoai, VaiTro, BiKhoa, NgayTao FROM TaiKhoan WHERE MaTaiKhoan = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user: {
        maTaiKhoan: updatedUser.MaTaiKhoan,
        hoTen: updatedUser.HoTen,
        email: updatedUser.Email,
        soDienThoai: updatedUser.SoDienThoai,
        vaiTro: updatedUser.VaiTro,
        biKhoa: Boolean(updatedUser.BiKhoa),
        ngayTao: updatedUser.NgayTao,
      },
    });
  } catch (err) {
    console.error('[auth.controller > updateProfile]', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật hồ sơ', error: err.message });
  }
}

// 5. Đổi mật khẩu
async function changePassword(req, res) {
  try {
    const userId = req.user?.maTaiKhoan;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có tối thiểu 6 ký tự',
      });
    }

    const [[user]] = await pool.query(
      'SELECT MaTaiKhoan, MatKhauBam FROM TaiKhoan WHERE MaTaiKhoan = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    const isBcrypt = String(user.MatKhauBam).startsWith('$2');
    const isMatch = isBcrypt
      ? await bcrypt.compare(currentPassword, user.MatKhauBam)
      : currentPassword === user.MatKhauBam;

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNew = await bcrypt.hash(newPassword, salt);

    await pool.query(
      'UPDATE TaiKhoan SET MatKhauBam = ? WHERE MaTaiKhoan = ?',
      [hashedNew, userId]
    );

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    console.error('[auth.controller > changePassword]', err);
    res.status(500).json({ success: false, message: 'Lỗi đổi mật khẩu', error: err.message });
  }
}

module.exports = {
  login,
  register,
  googleLogin,
  sendOtp,
  verifyOtp,
  registerFirebase,
  getProfile,
  updateProfile,
  changePassword,
};
