const pool = require('../db');

// 1. Lấy danh sách sản phẩm + thống kê + phân trang
async function getProducts(req, res) {
  try {
    const search = (req.query.search || '').trim();
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const status = req.query.status || 'all';
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 6));
    const offset = (page - 1) * limit;

    const statsSql = `
      SELECT
        COUNT(*) AS tongSanPham,
        COALESCE(SUM(CASE WHEN sp.HoTroIn = 1 THEN 1 ELSE 0 END), 0) AS hoTroIn,
        COALESCE(SUM(CASE WHEN sp.DangKinhDoanh = 1 AND bt.SoBienThe > 0 AND bt.TongTonKho = 0 THEN 1 ELSE 0 END), 0) AS hetHang
      FROM SanPham sp
      LEFT JOIN (
        SELECT MaSanPham, COUNT(*) AS SoBienThe, COALESCE(SUM(SoLuongTon), 0) AS TongTonKho
        FROM BienTheSanPham
        WHERE DangKinhDoanh = 1
        GROUP BY MaSanPham
      ) bt ON bt.MaSanPham = sp.MaSanPham
    `;

    const categoriesSql = `
      SELECT dm.MaDanhMuc, dm.TenDanhMuc, COUNT(sp.MaSanPham) AS soSanPham
      FROM DanhMuc dm
      LEFT JOIN SanPham sp ON sp.MaDanhMuc = dm.MaDanhMuc
      WHERE dm.HienThi = 1
      GROUP BY dm.MaDanhMuc, dm.TenDanhMuc
      ORDER BY dm.MaDanhMuc ASC
    `;

    const whereClauses = ['1 = 1'];
    const params = [];

    if (search) {
      whereClauses.push(
        '(sp.TenSanPham LIKE ? OR sp.MaHienThi LIKE ? OR dm.TenDanhMuc LIKE ?)'
      );
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (categoryId) {
      whereClauses.push('sp.MaDanhMuc = ?');
      params.push(categoryId);
    }

    if (status === 'hidden') {
      whereClauses.push('sp.DangKinhDoanh = 0');
    } else if (status === 'out_of_stock') {
      whereClauses.push(
        'sp.DangKinhDoanh = 1 AND COALESCE(bt.SoBienThe, 0) > 0 AND COALESCE(bt.TongTonKho, 0) = 0'
      );
    } else if (status === 'selling') {
      whereClauses.push(
        'sp.DangKinhDoanh = 1 AND (COALESCE(bt.SoBienThe, 0) = 0 OR COALESCE(bt.TongTonKho, 0) > 0)'
      );
    }

    const baseJoin = `
      FROM SanPham sp
      INNER JOIN DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
      LEFT JOIN (
        SELECT
          MaSanPham,
          COUNT(*) AS SoBienThe,
          COUNT(DISTINCT MaMauSac) AS SoMau,
          COUNT(DISTINCT MaKichThuoc) AS SoKichCo,
          COALESCE(SUM(SoLuongTon), 0) AS TongTonKho
        FROM BienTheSanPham
        WHERE DangKinhDoanh = 1
        GROUP BY MaSanPham
      ) bt ON bt.MaSanPham = sp.MaSanPham
      LEFT JOIN (
        SELECT a1.MaSanPham, a1.DuongDan
        FROM AnhSanPham a1
        INNER JOIN (
          SELECT MaSanPham, MIN(ThuTu) AS MinThuTu
          FROM AnhSanPham
          GROUP BY MaSanPham
        ) a2 ON a1.MaSanPham = a2.MaSanPham AND a1.ThuTu = a2.MinThuTu
      ) anh ON anh.MaSanPham = sp.MaSanPham
      WHERE ${whereClauses.join(' AND ')}
    `;

    const listSql = `
      SELECT
        sp.MaSanPham,
        sp.MaDanhMuc,
        dm.TenDanhMuc,
        sp.MaHienThi,
        sp.TenSanPham,
        sp.MoTa,
        sp.GiaBan,
        sp.HoTroIn,
        sp.NoiBat,
        sp.DangKinhDoanh,
        anh.DuongDan AS AnhDaiDien,
        COALESCE(bt.SoBienThe, 0) AS SoBienThe,
        COALESCE(bt.SoMau, 0) AS SoMau,
        COALESCE(bt.SoKichCo, 0) AS SoKichCo,
        COALESCE(bt.TongTonKho, 0) AS TongTonKho
      ${baseJoin}
      ORDER BY sp.MaSanPham DESC
      LIMIT ? OFFSET ?
    `;

    const [[[stats]], [categories], [[countRow]], [rows]] = await Promise.all([
      pool.query(statsSql),
      pool.query(categoriesSql),
      pool.query(`SELECT COUNT(*) AS total ${baseJoin}`, params),
      pool.query(listSql, [...params, limit, offset]),
    ]);

    const total = Number(countRow.total);

    const products = rows.map((row) => {
      let trangThai = 'DANG_BAN';
      if (row.DangKinhDoanh === 0) {
        trangThai = 'TAM_AN';
      } else if (Number(row.SoBienThe) > 0 && Number(row.TongTonKho) === 0) {
        trangThai = 'HET_HANG';
      }

      return {
        ...row,
        GiaBan: Number(row.GiaBan),
        HoTroIn: Boolean(row.HoTroIn),
        NoiBat: Boolean(row.NoiBat),
        DangKinhDoanh: Boolean(row.DangKinhDoanh),
        SoMau: Number(row.SoMau),
        SoKichCo: Number(row.SoKichCo),
        TongTonKho: Number(row.TongTonKho),
        TrangThai: trangThai,
      };
    });

    res.json({
      stats: {
        tongSanPham: Number(stats.tongSanPham),
        hoTroIn: Number(stats.hoTroIn),
        hetHang: Number(stats.hetHang),
      },
      categories: categories.map((c) => ({
        ...c,
        soSanPham: Number(c.soSanPham),
      })),
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err) {
    console.error('[products.controller > getProducts]', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách sản phẩm', error: err.message });
  }
}

// 2. Thêm sản phẩm mới
async function createProduct(req, res) {
  try {
    // 1. Validate đầu vào
    const {
      maDanhMuc,
      maHienThi,
      tenSanPham,
      moTa = '',
      giaBan,
      hoTroIn = false,
      noiBat = false,
      dangKinhDoanh = true,
      anhDaiDien = '',
    } = req.body;

    if (!maDanhMuc || !maHienThi?.trim() || !tenSanPham?.trim() || Number(giaBan) <= 0) {
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ danh mục, mã SKU, tên sản phẩm và giá bán > 0',
      });
    }

    // 2. Ghi vào SanPham + AnhSanPham (nếu có)
    const insertSql = `
      INSERT INTO SanPham
        (MaDanhMuc, MaHienThi, TenSanPham, MoTa, GiaBan, HoTroIn, NoiBat, DangKinhDoanh)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(insertSql, [
      Number(maDanhMuc),
      maHienThi.trim().toUpperCase(),
      tenSanPham.trim(),
      moTa.trim() || null,
      Number(giaBan),
      hoTroIn ? 1 : 0,
      noiBat ? 1 : 0,
      dangKinhDoanh ? 1 : 0,
    ]);

    const newProductId = result.insertId;

    if (anhDaiDien.trim()) {
      await pool.query(
        `INSERT INTO AnhSanPham (MaSanPham, DuongDan, ThuTu) VALUES (?, ?, 1)`,
        [newProductId, anhDaiDien.trim()]
      );
    }

    // 3. Trả kết quả
    res.status(201).json({
      message: 'Thêm sản phẩm thành công',
      maSanPham: newProductId,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Mã sản phẩm (SKU) này đã tồn tại' });
    }
    console.error('[products.controller > createProduct]', err);
    res.status(500).json({ message: 'Lỗi thêm sản phẩm', error: err.message });
  }
}

// 3. Cập nhật sản phẩm
async function updateProduct(req, res) {
  try {
    // 1. Validate đầu vào
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Mã sản phẩm không hợp lệ' });
    }

    const {
      maDanhMuc,
      maHienThi,
      tenSanPham,
      moTa = '',
      giaBan,
      hoTroIn = false,
      noiBat = false,
      dangKinhDoanh = true,
      anhDaiDien = '',
    } = req.body;

    if (!maDanhMuc || !maHienThi?.trim() || !tenSanPham?.trim() || Number(giaBan) <= 0) {
      return res.status(400).json({ message: 'Thông tin sản phẩm không hợp lệ' });
    }

    // 2. Cập nhật MySQL
    const updateSql = `
      UPDATE SanPham
      SET MaDanhMuc = ?, MaHienThi = ?, TenSanPham = ?, MoTa = ?,
          GiaBan = ?, HoTroIn = ?, NoiBat = ?, DangKinhDoanh = ?
      WHERE MaSanPham = ?
    `;
    const [result] = await pool.query(updateSql, [
      Number(maDanhMuc),
      maHienThi.trim().toUpperCase(),
      tenSanPham.trim(),
      moTa.trim() || null,
      Number(giaBan),
      hoTroIn ? 1 : 0,
      noiBat ? 1 : 0,
      dangKinhDoanh ? 1 : 0,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    if (anhDaiDien.trim()) {
      await pool.query(
        `INSERT INTO AnhSanPham (MaSanPham, DuongDan, ThuTu)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE DuongDan = VALUES(DuongDan)`,
        [id, anhDaiDien.trim()]
      );
    }

    // 3. Trả kết quả
    res.json({ message: 'Cập nhật sản phẩm thành công' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Mã sản phẩm (SKU) bị trùng' });
    }
    console.error('[products.controller > updateProduct]', err);
    res.status(500).json({ message: 'Lỗi cập nhật sản phẩm', error: err.message });
  }
}

// 4. Bật/tắt sao Nổi bật
async function toggleFeatured(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Mã sản phẩm không hợp lệ' });
    }

    const noiBat = req.body.noiBat ? 1 : 0;
    const [result] = await pool.query(
      `UPDATE SanPham SET NoiBat = ? WHERE MaSanPham = ?`,
      [noiBat, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    res.json({ maSanPham: id, noiBat: Boolean(noiBat) });
  } catch (err) {
    console.error('[products.controller > toggleFeatured]', err);
    res.status(500).json({ message: 'Lỗi cập nhật nổi bật', error: err.message });
  }
}

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  toggleFeatured,
};