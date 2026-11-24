const pool = require('../db');

// 1. Lấy danh sách khách hàng + Thống kê tổng quan + Tìm kiếm
async function getCustomers(req, res) {
  try {
    const search = (req.query.search || '').trim();
    const status = (req.query.status || 'all').trim(); // 'all' | 'active' | 'locked'
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    // Thống kê khách hàng
    const statsSql = `
      SELECT
        COUNT(*) AS tongKhachHang,
        COALESCE(SUM(CASE WHEN BiKhoa = 0 THEN 1 ELSE 0 END), 0) AS dangHoatDong,
        COALESCE(SUM(CASE WHEN BiKhoa = 1 THEN 1 ELSE 0 END), 0) AS biKhoa
      FROM TaiKhoan
      WHERE VaiTro = 'KHACH_HANG'
    `;

    const whereClauses = ["tk.VaiTro = 'KHACH_HANG'"];
    const params = [];

    if (search) {
      whereClauses.push('(tk.HoTen LIKE ? OR tk.Email LIKE ? OR tk.SoDienThoai LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (status === 'active') {
      whereClauses.push('tk.BiKhoa = 0');
    } else if (status === 'locked') {
      whereClauses.push('tk.BiKhoa = 1');
    }

    const whereSql = whereClauses.join(' AND ');

    // Đếm tổng số khách hàng theo filter
    const countSql = `SELECT COUNT(*) AS total FROM TaiKhoan tk WHERE ${whereSql}`;

    // Lấy danh sách khách hàng kèm số đơn và tổng chi tiêu
    const customersSql = `
      SELECT
        tk.MaTaiKhoan,
        CONCAT('#CUST-', LPAD(tk.MaTaiKhoan, 4, '0')) AS MaHienThi,
        tk.HoTen,
        tk.Email,
        tk.SoDienThoai,
        tk.BiKhoa,
        tk.NgayTao,
        COALESCE(orders.tongDonHang, 0) AS TongDonHang,
        COALESCE(orders.tongChiTieu, 0) AS TongChiTieu
      FROM TaiKhoan tk
      LEFT JOIN (
        SELECT
          MaTaiKhoan,
          COUNT(*) AS tongDonHang,
          SUM(CASE WHEN TrangThai <> 'HUY' AND TrangThaiThanhToan = 'DA_THANH_TOAN' THEN TongThanhToan ELSE 0 END) AS tongChiTieu
        FROM DonHang
        GROUP BY MaTaiKhoan
      ) orders ON orders.MaTaiKhoan = tk.MaTaiKhoan
      WHERE ${whereSql}
      ORDER BY tk.NgayTao DESC, tk.MaTaiKhoan DESC
      LIMIT ? OFFSET ?
    `;

    const [[[stats]], [[{ total }]], [customers]] = await Promise.all([
      pool.query(statsSql),
      pool.query(countSql, params),
      pool.query(customersSql, [...params, limit, offset]),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          tongKhachHang: Number(stats.tongKhachHang),
          dangHoatDong: Number(stats.dangHoatDong),
          biKhoa: Number(stats.biKhoa),
        },
        customers: customers.map((c) => ({
          ...c,
          TongDonHang: Number(c.TongDonHang),
          TongChiTieu: Number(c.TongChiTieu),
          BiKhoa: Boolean(c.BiKhoa),
        })),
        pagination: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    console.error('[customers.controller > getCustomers]', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách khách hàng', error: err.message });
  }
}

// 2. Khóa / Mở khóa tài khoản khách hàng
async function toggleCustomerLock(req, res) {
  try {
    const customerId = Number(req.params.id);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã khách hàng không hợp lệ' });
    }

    const [[user]] = await pool.query(
      'SELECT MaTaiKhoan, HoTen, Email, VaiTro, BiKhoa FROM TaiKhoan WHERE MaTaiKhoan = ?',
      [customerId]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản người dùng' });
    }

    if (user.VaiTro === 'QUAN_TRI') {
      return res.status(403).json({ success: false, message: 'Không thể khóa tài khoản Quản trị viên hệ thống' });
    }

    const newLockState = user.BiKhoa ? 0 : 1;

    await pool.query('UPDATE TaiKhoan SET BiKhoa = ? WHERE MaTaiKhoan = ?', [newLockState, customerId]);

    res.json({
      success: true,
      message: newLockState === 1 ? 'Đã khóa tài khoản khách hàng thành công' : 'Đã mở khóa tài khoản khách hàng thành công',
      data: {
        customerId,
        biKhoa: Boolean(newLockState),
      },
    });
  } catch (err) {
    console.error('[customers.controller > toggleCustomerLock]', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái khóa tài khoản', error: err.message });
  }
}

module.exports = {
  getCustomers,
  toggleCustomerLock,
};
