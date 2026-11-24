const pool = require('../db');

// 1. Lấy danh sách đơn hàng cho Admin + Thống kê + Lọc theo tabs & tìm kiếm
async function getOrders(req, res) {
  try {
    const search = (req.query.search || '').trim();
    const status = (req.query.status || 'all').trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    // Thống kê số lượng đơn theo từng trạng thái
    const statsSql = `
      SELECT
        COUNT(*) AS tatCa,
        COALESCE(SUM(CASE WHEN TrangThai = 'CHO_XAC_NHAN' THEN 1 ELSE 0 END), 0) AS choXacNhan,
        COALESCE(SUM(CASE WHEN TrangThai = 'DA_XAC_NHAN' THEN 1 ELSE 0 END), 0) AS daXacNhan,
        COALESCE(SUM(CASE WHEN TrangThai = 'DANG_GIAO' THEN 1 ELSE 0 END), 0) AS dangGiao,
        COALESCE(SUM(CASE WHEN TrangThai = 'DA_GIAO' THEN 1 ELSE 0 END), 0) AS daGiao,
        COALESCE(SUM(CASE WHEN TrangThai = 'HUY' THEN 1 ELSE 0 END), 0) AS daHuy,
        COALESCE(SUM(CASE WHEN TrangThai <> 'HUY' AND TrangThaiThanhToan = 'DA_THANH_TOAN' THEN TongThanhToan ELSE 0 END), 0) AS doanhThuThucTe
      FROM DonHang
    `;

    const whereClauses = ['1 = 1'];
    const params = [];

    if (search) {
      whereClauses.push('(dh.MaHienThi LIKE ? OR dh.TenNguoiNhan LIKE ? OR dh.DienThoaiNhan LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (status !== 'all') {
      whereClauses.push('dh.TrangThai = ?');
      params.push(status);
    }

    const whereSql = whereClauses.join(' AND ');

    // Đếm tổng số dòng phù hợp bộ lọc
    const countSql = `
      SELECT COUNT(*) AS total
      FROM DonHang dh
      WHERE ${whereSql}
    `;

    // Truy vấn danh sách đơn hàng
    const ordersSql = `
      SELECT
        dh.MaDonHang,
        dh.MaHienThi,
        dh.MaTaiKhoan,
        dh.TenNguoiNhan,
        dh.DienThoaiNhan,
        dh.DiaChiGiao,
        dh.GhiChu,
        dh.TienHang,
        dh.PhiGiaoHang,
        dh.TongThanhToan,
        dh.PhuongThuc,
        dh.TrangThaiThanhToan,
        dh.TrangThai,
        dh.NgayDat,
        tk.Email AS EmailKhachHang,
        COALESCE(items.soLuongMon, 0) AS soLuongMon
      FROM DonHang dh
      LEFT JOIN TaiKhoan tk ON tk.MaTaiKhoan = dh.MaTaiKhoan
      LEFT JOIN (
        SELECT MaDonHang, COUNT(*) AS soLuongMon
        FROM ChiTietDonHang
        GROUP BY MaDonHang
      ) items ON items.MaDonHang = dh.MaDonHang
      WHERE ${whereSql}
      ORDER BY dh.NgayDat DESC, dh.MaDonHang DESC
      LIMIT ? OFFSET ?
    `;

    const [[[stats]], [[{ total }]], [orders]] = await Promise.all([
      pool.query(statsSql),
      pool.query(countSql, params),
      pool.query(ordersSql, [...params, limit, offset]),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          tatCa: Number(stats.tatCa),
          choXacNhan: Number(stats.choXacNhan),
          daXacNhan: Number(stats.daXacNhan),
          dangGiao: Number(stats.dangGiao),
          daGiao: Number(stats.daGiao),
          daHuy: Number(stats.daHuy),
          doanhThuThucTe: Number(stats.doanhThuThucTe),
        },
        orders: orders.map((o) => ({
          ...o,
          TienHang: Number(o.TienHang),
          PhiGiaoHang: Number(o.PhiGiaoHang),
          TongThanhToan: Number(o.TongThanhToan),
          soLuongMon: Number(o.soLuongMon),
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
    console.error('[orders.controller > getOrders]', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy danh sách đơn hàng', error: err.message });
  }
}

// 2. Lấy chi tiết đơn hàng + sản phẩm + mẫu in đính kèm (cho thợ in xưởng)
async function getOrderById(req, res) {
  try {
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã đơn hàng không hợp lệ' });
    }

    const [[order]] = await pool.query(
      `SELECT dh.*, tk.Email AS EmailKhachHang, tk.HoTen AS TenKhachHang
       FROM DonHang dh
       LEFT JOIN TaiKhoan tk ON tk.MaTaiKhoan = dh.MaTaiKhoan
       WHERE dh.MaDonHang = ?`,
      [orderId]
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    // Lấy các sản phẩm trong đơn
    const itemsSql = `
      SELECT
        ct.MaDongDon,
        ct.MaBienThe,
        ct.TenSanPhamLucMua,
        ct.SKULucMua,
        ct.KichThuocLucMua,
        ct.MauSacLucMua,
        ct.DonGia,
        ct.SoLuong,
        ct.ThanhTien
      FROM ChiTietDonHang ct
      WHERE ct.MaDonHang = ?
    `;
    const [items] = await pool.query(itemsSql, [orderId]);

    // Lấy các mẫu in ấn xưởng đính kèm các dòng đơn
    const dongDonIds = items.map((i) => i.MaDongDon);
    let printTemplates = [];

    if (dongDonIds.length > 0) {
      const printsSql = `
        SELECT
          midh.MaDongDon,
          midh.MaViTriIn,
          midh.MaMauIn,
          vt.TenViTri,
          vt.MaViTri,
          mi.TenMauIn,
          mi.DuongDanPNG,
          mi.LoaiMau,
          mi.NhanKieuIn,
          mi.KichThuocPx,
          mi.DungLuongBytes
        FROM MauInDonHang midh
        JOIN ViTriIn vt ON vt.MaViTriIn = midh.MaViTriIn
        JOIN MauIn mi ON mi.MaMauIn = midh.MaMauIn
        WHERE midh.MaDongDon IN (?)
      `;
      const [prints] = await pool.query(printsSql, [dongDonIds]);
      printTemplates = prints;
    }

    // Ghép mẫu in vào từng dòng sản phẩm
    const enrichedItems = items.map((item) => {
      const itemPrints = printTemplates.filter((p) => p.MaDongDon === item.MaDongDon);
      return {
        ...item,
        DonGia: Number(item.DonGia),
        ThanhTien: Number(item.ThanhTien),
        prints: itemPrints,
      };
    });

    res.json({
      success: true,
      data: {
        ...order,
        TienHang: Number(order.TienHang),
        PhiGiaoHang: Number(order.PhiGiaoHang),
        TongThanhToan: Number(order.TongThanhToan),
        items: enrichedItems,
        artworks: printTemplates, // Toàn bộ file ảnh xưởng cần in cho đơn này
      },
    });
  } catch (err) {
    console.error('[orders.controller > getOrderById]', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết đơn hàng', error: err.message });
  }
}

// 3. Cập nhật trạng thái đơn hàng (CHO_XAC_NHAN, DA_XAC_NHAN, DANG_GIAO, DA_GIAO, HUY)
async function updateOrderStatus(req, res) {
  const conn = await pool.getConnection();
  try {
    const orderId = Number(req.params.id);
    const { trangThai } = req.body;

    const validStatuses = ['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'DANG_GIAO', 'DA_GIAO', 'HUY'];
    if (!validStatuses.includes(trangThai)) {
      return res.status(400).json({ success: false, message: 'Trạng thái đơn hàng không hợp lệ' });
    }

    await conn.beginTransaction();

    const [[order]] = await conn.query('SELECT * FROM DonHang WHERE MaDonHang = ? FOR UPDATE', [orderId]);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    const currentStatus = order.TrangThai;
    if (currentStatus === trangThai) {
      await conn.rollback();
      return res.json({ success: true, message: 'Đơn hàng đã ở trạng thái này', data: order });
    }

    // Nếu đơn hàng chuyển sang DA_GIAO: MySQL có check constraint ck_don_da_giao:
    // (TrangThai <> 'DA_GIAO' or TrangThaiThanhToan = 'DA_THANH_TOAN')
    // Nếu đơn chưa thanh toán, tự động đánh dấu đã thanh toán khi giao thành công
    let updateSql = 'UPDATE DonHang SET TrangThai = ? WHERE MaDonHang = ?';
    let updateParams = [trangThai, orderId];

    if (trangThai === 'DA_GIAO' && order.TrangThaiThanhToan !== 'DA_THANH_TOAN') {
      updateSql = "UPDATE DonHang SET TrangThai = ?, TrangThaiThanhToan = 'DA_THANH_TOAN' WHERE MaDonHang = ?";
    }

    await conn.query(updateSql, updateParams);

    // Nếu chuyển sang trạng thái HUY và đơn trước đó chưa hủy: Hoàn trả lại số lượng tồn kho biến thể!
    if (trangThai === 'HUY' && currentStatus !== 'HUY') {
      const [items] = await conn.query(
        'SELECT MaBienThe, SoLuong FROM ChiTietDonHang WHERE MaDonHang = ?',
        [orderId]
      );
      for (const item of items) {
        if (item.MaBienThe && item.SoLuong > 0) {
          await conn.query(
            'UPDATE BienTheSanPham SET SoLuongTon = SoLuongTon + ? WHERE MaBienThe = ?',
            [item.SoLuong, item.MaBienThe]
          );
        }
      }
    }

    await conn.commit();
    res.json({
      success: true,
      message: `Cập nhật trạng thái đơn sang "${trangThai}" thành công`,
      data: { orderId, previousStatus: currentStatus, newStatus: trangThai },
    });
  } catch (err) {
    await conn.rollback();
    console.error('[orders.controller > updateOrderStatus]', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái đơn', error: err.message });
  } finally {
    conn.release();
  }
}

// 4. Cập nhật trạng thái thanh toán (DA_THANH_TOAN, CHUA_THANH_TOAN)
async function updateOrderPayment(req, res) {
  try {
    const orderId = Number(req.params.id);
    const { trangThaiThanhToan } = req.body;

    const validPayments = ['CHUA_THANH_TOAN', 'DA_THANH_TOAN'];
    if (!validPayments.includes(trangThaiThanhToan)) {
      return res.status(400).json({ success: false, message: 'Trạng thái thanh toán không hợp lệ' });
    }

    const [result] = await pool.query(
      'UPDATE DonHang SET TrangThaiThanhToan = ? WHERE MaDonHang = ?',
      [trangThaiThanhToan, orderId]
    );

    if (result.matchedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái thanh toán thành "${trangThaiThanhToan}"`,
      data: { orderId, trangThaiThanhToan },
    });
  } catch (err) {
    console.error('[orders.controller > updateOrderPayment]', err);
    res.status(500).json({ success: false, message: 'Lỗi cập nhật thanh toán', error: err.message });
  }
}

module.exports = {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderPayment,
};
