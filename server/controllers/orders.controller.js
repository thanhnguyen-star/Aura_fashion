const pool = require('../db');

async function getOrderById(req, res) {
  try {
    // 1. Validate ID
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Mã đơn hàng không hợp lệ' });
    }

    // 2. Truy vấn đơn hàng + các dòng chi tiết
    const [[order]] = await pool.query(
      `SELECT * FROM DonHang WHERE MaDonHang = ?`,
      [orderId]
    );

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }

    const itemsSql = `
      SELECT
        MaDongDon,
        TenSanPhamLucMua,
        SKULucMua,
        KichThuocLucMua,
        MauSacLucMua,
        DonGia,
        SoLuong,
        ThanhTien
      FROM ChiTietDonHang
      WHERE MaDonHang = ?
    `;
    const [items] = await pool.query(itemsSql, [orderId]);

    // 3. Trả kết quả
    res.json({
      ...order,
      TienHang: Number(order.TienHang),
      PhiGiaoHang: Number(order.PhiGiaoHang),
      TongThanhToan: Number(order.TongThanhToan),
      items: items.map((i) => ({
        ...i,
        DonGia: Number(i.DonGia),
        ThanhTien: Number(i.ThanhTien),
      })),
    });
  } catch (err) {
    console.error('[orders.controller > getOrderById]', err);
    res.status(500).json({ message: 'Lỗi lấy chi tiết đơn hàng', error: err.message });
  }
}

module.exports = { getOrderById };