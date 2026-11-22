const pool = require('../db');

// Hàm sinh slug chuẩn SEO từ tên tiếng Việt (VD: "Thời trang Nam" -> "thoi-trang-nam")
function toSlug(text = '') {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// 1. Lấy danh sách danh mục + 4 chỉ số KPI + phân trang
async function getCategories(req, res) {
  try {
    const search = (req.query.search || '').trim().toLowerCase();
    const status = req.query.status || 'all'; // all | active | hidden
    const sort = req.query.sort || 'id_asc'; // id_asc | id_desc | name_asc | products_desc
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 5));

    const sql = `
      SELECT
        dm.MaDanhMuc,
        dm.TenDanhMuc,
        dm.MoTa,
        dm.HienThi,
        COUNT(DISTINCT sp.MaSanPham) AS SoSanPham,
        (
          SELECT a.DuongDan
          FROM SanPham sp2
          INNER JOIN AnhSanPham a ON a.MaSanPham = sp2.MaSanPham
          WHERE sp2.MaDanhMuc = dm.MaDanhMuc
          ORDER BY sp2.NoiBat DESC, sp2.MaSanPham ASC, a.ThuTu ASC
          LIMIT 1
        ) AS AnhBia
      FROM DanhMuc dm
      LEFT JOIN SanPham sp ON sp.MaDanhMuc = dm.MaDanhMuc
      GROUP BY dm.MaDanhMuc, dm.TenDanhMuc, dm.MoTa, dm.HienThi
      ORDER BY dm.MaDanhMuc ASC
    `;

    const [rows] = await pool.query(sql);

    // Chuẩn hóa dữ liệu + gắn slug
    const allCategories = rows.map((row) => {
      const slug = toSlug(row.TenDanhMuc);
      return {
        MaDanhMuc: row.MaDanhMuc,
        TenDanhMuc: row.TenDanhMuc,
        MoTa: row.MoTa || '',
        HienThi: Boolean(row.HienThi),
        SoSanPham: Number(row.SoSanPham),
        AnhBia: row.AnhBia || '',
        Slug: `/danh-muc/${slug}`,
      };
    });

    // Tính 4 thẻ KPI trên toàn bộ danh mục
    const tongDanhMuc = allCategories.length;
    const dangKichHoat = allCategories.filter((c) => c.HienThi).length;
    const tamAn = tongDanhMuc - dangKichHoat;
    const tyLeTrucTuyen =
      tongDanhMuc > 0 ? Math.round((dangKichHoat / tongDanhMuc) * 100) : 0;
    const tongSanPham = allCategories.reduce((sum, c) => sum + c.SoSanPham, 0);

    // Lọc theo từ khóa (tên, slug, mô tả) & trạng thái
    let filtered = allCategories.filter((cat) => {
      if (status === 'active' && !cat.HienThi) return false;
      if (status === 'hidden' && cat.HienThi) return false;
      if (!search) return true;
      return (
        cat.TenDanhMuc.toLowerCase().includes(search) ||
        cat.Slug.toLowerCase().includes(search) ||
        cat.MoTa.toLowerCase().includes(search)
      );
    });

    // Sắp xếp thứ tự
    if (sort === 'id_desc') {
      filtered.sort((a, b) => b.MaDanhMuc - a.MaDanhMuc);
    } else if (sort === 'name_asc') {
      filtered.sort((a, b) => a.TenDanhMuc.localeCompare(b.TenDanhMuc, 'vi'));
    } else if (sort === 'products_desc') {
      filtered.sort((a, b) => b.SoSanPham - a.SoSanPham);
    } else {
      filtered.sort((a, b) => a.MaDanhMuc - b.MaDanhMuc);
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    const categories = filtered.slice(offset, offset + limit);

    res.json({
      stats: {
        tongDanhMuc,
        dangKichHoat,
        tamAn,
        tyLeTrucTuyen,
        tongSanPham,
      },
      categories,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('[categories.controller > getCategories]', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách danh mục', error: err.message });
  }
}

// 2. Thêm danh mục mới
async function createCategory(req, res) {
  try {
    const tenDanhMuc = (req.body.tenDanhMuc || '').trim();
    const moTa = (req.body.moTa || '').trim() || null;
    const hienThi = req.body.hienThi === false ? 0 : 1;

    if (!tenDanhMuc) {
      return res.status(400).json({ message: 'Vui lòng nhập tên danh mục' });
    }

    const sql = `INSERT INTO DanhMuc (TenDanhMuc, MoTa, HienThi) VALUES (?, ?, ?)`;
    const [result] = await pool.query(sql, [tenDanhMuc, moTa, hienThi]);

    res.status(201).json({
      message: 'Thêm danh mục thành công',
      maDanhMuc: result.insertId,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Tên danh mục này đã tồn tại' });
    }
    console.error('[categories.controller > createCategory]', err);
    res.status(500).json({ message: 'Lỗi thêm danh mục', error: err.message });
  }
}

// 3. Cập nhật danh mục
async function updateCategory(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Mã danh mục không hợp lệ' });
    }

    const tenDanhMuc = (req.body.tenDanhMuc || '').trim();
    const moTa = (req.body.moTa || '').trim() || null;
    const hienThi = req.body.hienThi === false ? 0 : 1;

    if (!tenDanhMuc) {
      return res.status(400).json({ message: 'Vui lòng nhập tên danh mục' });
    }

    const sql = `
      UPDATE DanhMuc
      SET TenDanhMuc = ?, MoTa = ?, HienThi = ?
      WHERE MaDanhMuc = ?
    `;
    const [result] = await pool.query(sql, [tenDanhMuc, moTa, hienThi, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    res.json({ message: 'Cập nhật danh mục thành công' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Tên danh mục bị trùng' });
    }
    console.error('[categories.controller > updateCategory]', err);
    res.status(500).json({ message: 'Lỗi cập nhật danh mục', error: err.message });
  }
}

// 4. Bật/tắt công tắc Trạng thái kinh doanh (HienThi)
async function toggleStatus(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Mã danh mục không hợp lệ' });
    }

    const hienThi = req.body.hienThi ? 1 : 0;
    const [result] = await pool.query(
      `UPDATE DanhMuc SET HienThi = ? WHERE MaDanhMuc = ?`,
      [hienThi, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    res.json({ maDanhMuc: id, hienThi: Boolean(hienThi) });
  } catch (err) {
    console.error('[categories.controller > toggleStatus]', err);
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái danh mục', error: err.message });
  }
}

// 5. Xóa danh mục (chỉ cho xóa khi chưa có sản phẩm thuộc danh mục)
async function deleteCategory(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Mã danh mục không hợp lệ' });
    }

    const [[check]] = await pool.query(
      `SELECT COUNT(*) AS total FROM SanPham WHERE MaDanhMuc = ?`,
      [id]
    );

    if (Number(check.total) > 0) {
      return res.status(400).json({
        message: `Không thể xóa vì danh mục đang có ${check.total} sản phẩm. Hãy chuyển sang "Tạm ẩn" thay vì xóa.`,
      });
    }

    const [result] = await pool.query(
      `DELETE FROM DanhMuc WHERE MaDanhMuc = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    res.json({ message: 'Đã xóa danh mục' });
  } catch (err) {
    console.error('[categories.controller > deleteCategory]', err);
    res.status(500).json({ message: 'Lỗi xóa danh mục', error: err.message });
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  toggleStatus,
  deleteCategory,
};