const bcrypt = require('bcryptjs');
const pool = require('./db');

async function seedAdmin() {
  const email = 'aura.admin@aura-studio.vn';
  const plainPassword = 'Admin@123';
  const hash = await bcrypt.hash(plainPassword, 10);

  await pool.query(
    `INSERT INTO TaiKhoan (HoTen, Email, SoDienThoai, MatKhauBam, VaiTro, BiKhoa)
     VALUES (?, ?, ?, ?, 'QUAN_TRI', 0)
     ON DUPLICATE KEY UPDATE
       MatKhauBam = VALUES(MatKhauBam),
       VaiTro = 'QUAN_TRI',
       BiKhoa = 0`,
    ['Quản trị viên', email, '0900000001', hash]
  );

  console.log(`Đã cập nhật tài khoản Admin: ${email} / ${plainPassword}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Lỗi seedAdmin:', err.message);
  process.exit(1);
});