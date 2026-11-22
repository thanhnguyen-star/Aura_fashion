const pool = require('../db');

async function getDashboard(req, res) {
  try {
    const orderStatsSql = `
      SELECT
        COALESCE(SUM(CASE WHEN TrangThai <> 'HUY' AND TrangThaiThanhToan = 'DA_THANH_TOAN' THEN TongThanhToan ELSE 0 END), 0) AS tongDoanhThu,
        COUNT(*) AS tongDonHang,
        COALESCE(SUM(CASE WHEN TrangThai = 'CHO_XAC_NHAN' THEN 1 ELSE 0 END), 0) AS donChoXuLy
      FROM DonHang
    `;

    const productStatsSql = `
      SELECT COUNT(*) AS soSanPham
      FROM SanPham
      WHERE DangKinhDoanh = 1
    `;

    const recentOrdersSql = `
      SELECT
        MaDonHang,
        MaHienThi,
        TenNguoiNhan,
        DienThoaiNhan,
        DiaChiGiao,
        GhiChu,
        TienHang,
        PhiGiaoHang,
        TongThanhToan,
        PhuongThuc,
        TrangThaiThanhToan,
        TrangThai,
        NgayDat
      FROM DonHang
      ORDER BY NgayDat DESC, MaDonHang DESC
      LIMIT 5
    `;

    const [[[orderStats]], [[productStats]], [orders]] = await Promise.all([
      pool.query(orderStatsSql),
      pool.query(productStatsSql),
      pool.query(recentOrdersSql),
    ]);

    res.json({
      stats: {
        tongDoanhThu: Number(orderStats.tongDoanhThu),
        tongDonHang: Number(orderStats.tongDonHang),
        soSanPham: Number(productStats.soSanPham),
        donChoXuLy: Number(orderStats.donChoXuLy),
      },
      orders: orders.map((o) => ({
        ...o,
        TienHang: Number(o.TienHang),
        PhiGiaoHang: Number(o.PhiGiaoHang),
        TongThanhToan: Number(o.TongThanhToan),
      })),
    });
  } catch (err) {
    console.error('[dashboard.controller > getDashboard]', err);
    res.status(500).json({ message: 'Lỗi lấy dữ liệu thống kê', error: err.message });
  }
}

module.exports = { getDashboard };