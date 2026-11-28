const pool = require('../db');
const { buildCategoryTree, getDescendantIds } = require('../utils/categoryTree');

const LOW_STOCK_THRESHOLD = 5;

function isPrintEligibleCategory(catRow) {
  if (!catRow) return false;
  const txt = `${catRow.Slug || ''} ${catRow.TenDanhMuc || ''}`.toLowerCase();
  return (
    txt.includes('ao-thun') ||
    txt.includes('áo thun') ||
    txt.includes('hoodie')
  );
}

async function validateLeafCategory(conn, maDanhMuc) {
  const catId = Number(maDanhMuc);
  if (!Number.isInteger(catId) || catId <= 0) {
    const err = new Error('Vui lòng chọn danh mục hợp lệ');
    err.statusCode = 400;
    throw err;
  }

  const [[cat]] = await conn.query(
    'SELECT MaDanhMuc, TenDanhMuc, Slug FROM DanhMuc WHERE MaDanhMuc = ?',
    [catId]
  );
  if (!cat) {
    const err = new Error('Danh mục được chọn không tồn tại');
    err.statusCode = 400;
    throw err;
  }

  const [[childCheck]] = await conn.query(
    'SELECT COUNT(*) AS cnt FROM DanhMuc WHERE MaDanhMucCha = ?',
    [catId]
  );
  if (Number(childCheck.cnt) > 0) {
    const err = new Error(
      `Vui lòng chọn danh mục con thuộc "${cat.TenDanhMuc}", không gán trực tiếp vào danh mục cha.`
    );
    err.statusCode = 400;
    throw err;
  }

  return cat;
}

async function syncProductVariants(conn, productId, prodSku, variants = []) {
  if (!Array.isArray(variants)) return;

  const [[prodRow]] = await conn.query(
    'SELECT MaHienThi FROM SanPham WHERE MaSanPham = ?',
    [productId]
  );
  const baseSku = (prodSku || prodRow?.MaHienThi || `SP-${productId}`)
    .trim()
    .toUpperCase();

  const [sizeRows] = await conn.query('SELECT MaKichThuoc, TenKichThuoc FROM KichThuoc');
  const sizeNameMap = new Map(sizeRows.map((s) => [Number(s.MaKichThuoc), s.TenKichThuoc]));

  const seenPairs = new Set();
  const normalized = [];

  for (let i = 0; i < variants.length; i += 1) {
    const v = variants[i];
    const maMauSac = Number(v.maMauSac);
    const maKichThuoc = Number(v.maKichThuoc);
    const soLuongTon = Math.max(0, Number(v.soLuongTon ?? 0));

    if (!Number.isInteger(maMauSac) || maMauSac <= 0 || !Number.isInteger(maKichThuoc) || maKichThuoc <= 0) {
      const err = new Error(`Biến thể dòng ${i + 1}: Vui lòng chọn đầy đủ Màu sắc và Kích cỡ.`);
      err.statusCode = 400;
      throw err;
    }

    const pairKey = `${maMauSac}-${maKichThuoc}`;
    if (seenPairs.has(pairKey)) {
      const err = new Error('Không thể có hai dòng biến thể trùng cùng Màu sắc và Kích cỡ.');
      err.statusCode = 400;
      throw err;
    }
    seenPairs.add(pairKey);

    const sizeLabel = (sizeNameMap.get(maKichThuoc) || `SZ${maKichThuoc}`)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const rawSku = (v.sku || '').trim().toUpperCase();
    const sku = rawSku || `${baseSku}-${sizeLabel}-C${maMauSac}`;

    normalized.push({
      maBienThe: v.maBienThe ? Number(v.maBienThe) : null,
      maMauSac,
      maKichThuoc,
      soLuongTon,
      sku,
    });
  }

  const [existingRows] = await conn.query(
    'SELECT MaBienThe FROM BienTheSanPham WHERE MaSanPham = ?',
    [productId]
  );
  const existingIds = new Set(existingRows.map((r) => Number(r.MaBienThe)));
  const keptIds = new Set(
    normalized.filter((v) => v.maBienThe && existingIds.has(v.maBienThe)).map((v) => v.maBienThe)
  );

  // Xử lý các biến thể bị xóa trên form
  for (const oldId of existingIds) {
    if (!keptIds.has(oldId)) {
      const [[used]] = await conn.query(
        'SELECT COUNT(*) AS cnt FROM ChiTietDonHang WHERE MaBienThe = ?',
        [oldId]
      );
      if (Number(used.cnt) > 0) {
        await conn.query(
          'UPDATE BienTheSanPham SET DangKinhDoanh = 0, SoLuongTon = 0 WHERE MaBienThe = ?',
          [oldId]
        );
      } else {
        await conn.query('DELETE FROM BienTheSanPham WHERE MaBienThe = ?', [oldId]);
      }
    }
  }

  // Cập nhật / thêm mới các biến thể còn lại
  for (const item of normalized) {
    if (item.maBienThe && keptIds.has(item.maBienThe)) {
      const [dupSku] = await conn.query(
        'SELECT MaBienThe FROM BienTheSanPham WHERE SKU = ? AND MaBienThe <> ? LIMIT 1',
        [item.sku, item.maBienThe]
      );
      if (dupSku.length > 0) {
        const err = new Error(`SKU biến thể "${item.sku}" đã tồn tại.`);
        err.statusCode = 409;
        throw err;
      }

      await conn.query(
        `UPDATE BienTheSanPham
         SET MaKichThuoc = ?, MaMauSac = ?, SKU = ?, SoLuongTon = ?, DangKinhDoanh = 1
         WHERE MaBienThe = ? AND MaSanPham = ?`,
        [item.maKichThuoc, item.maMauSac, item.sku, item.soLuongTon, item.maBienThe, productId]
      );
    } else {
      // Nếu cặp (MaSanPham, MaKichThuoc, MaMauSac) từng bị ẩn trước đó thì khôi phục lại
      const [[softDeleted]] = await conn.query(
        `SELECT MaBienThe FROM BienTheSanPham
         WHERE MaSanPham = ? AND MaKichThuoc = ? AND MaMauSac = ? LIMIT 1`,
        [productId, item.maKichThuoc, item.maMauSac]
      );
      if (softDeleted) {
        await conn.query(
          `UPDATE BienTheSanPham
           SET SKU = ?, SoLuongTon = ?, DangKinhDoanh = 1
           WHERE MaBienThe = ?`,
          [item.sku, item.soLuongTon, softDeleted.MaBienThe]
        );
      } else {
        let finalSku = item.sku;
        const [dupSku] = await conn.query(
          'SELECT MaBienThe FROM BienTheSanPham WHERE SKU = ? LIMIT 1',
          [finalSku]
        );
        if (dupSku.length > 0) {
          finalSku = `${finalSku}-${Date.now().toString().slice(-4)}`;
        }
        await conn.query(
          `INSERT INTO BienTheSanPham (MaSanPham, MaKichThuoc, MaMauSac, SKU, SoLuongTon, DangKinhDoanh)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [productId, item.maKichThuoc, item.maMauSac, finalSku, item.soLuongTon]
        );
      }
    }
  }
}

// Upload ảnh sản phẩm qua Multer
function uploadProductImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Vui lòng chọn tệp ảnh hợp lệ' });
  }
  const url = `/uploads/products/${req.file.filename}`;
  res.status(201).json({
    success: true,
    url,
    filename: req.file.originalname,
  });
}

// 1. Lấy danh sách sản phẩm + thống kê + phân trang + sắp xếp + metadata size/color
async function getProducts(req, res) {
  try {
    const search = (req.query.search || '').trim();
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const status = req.query.status || 'all'; // all | selling | low_stock | out_of_stock | hidden
    const sort = req.query.sort || 'newest'; // newest | price_asc | price_desc | stock_asc | stock_desc
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const statsSql = `
      SELECT
        COUNT(*) AS tongSanPham,
        COALESCE(SUM(CASE WHEN sp.HoTroIn = 1 THEN 1 ELSE 0 END), 0) AS hoTroIn,
        COALESCE(SUM(CASE WHEN sp.DangKinhDoanh = 1 AND COALESCE(bt.TongTonKho, 0) = 0 THEN 1 ELSE 0 END), 0) AS hetHang,
        COALESCE(SUM(CASE WHEN sp.DangKinhDoanh = 1 AND COALESCE(bt.TongTonKho, 0) > 0 AND COALESCE(bt.TongTonKho, 0) <= ${LOW_STOCK_THRESHOLD} THEN 1 ELSE 0 END), 0) AS sapHetHang
      FROM SanPham sp
      LEFT JOIN (
        SELECT MaSanPham, COUNT(*) AS SoBienThe, COALESCE(SUM(SoLuongTon), 0) AS TongTonKho
        FROM BienTheSanPham
        WHERE DangKinhDoanh = 1
        GROUP BY MaSanPham
      ) bt ON bt.MaSanPham = sp.MaSanPham
    `;

    const lowStockSql = `
      SELECT
        sp.MaSanPham,
        sp.MaHienThi,
        sp.TenSanPham,
        dm.TenDanhMuc,
        COALESCE(bt.TongTonKho, 0) AS TongTonKho
      FROM SanPham sp
      INNER JOIN DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
      LEFT JOIN (
        SELECT MaSanPham, COALESCE(SUM(SoLuongTon), 0) AS TongTonKho
        FROM BienTheSanPham
        WHERE DangKinhDoanh = 1
        GROUP BY MaSanPham
      ) bt ON bt.MaSanPham = sp.MaSanPham
      WHERE sp.DangKinhDoanh = 1 AND COALESCE(bt.TongTonKho, 0) > 0 AND COALESCE(bt.TongTonKho, 0) <= ${LOW_STOCK_THRESHOLD}
      ORDER BY TongTonKho ASC, sp.MaSanPham DESC
      LIMIT 6
    `;

    const categoriesSql = `
      SELECT
        dm.MaDanhMuc,
        dm.MaDanhMucCha,
        dm.TenDanhMuc,
        dm.Slug,
        dm.MoTa,
        dm.AnhDaiDien,
        dm.ThuTu,
        dm.HienThi,
        COUNT(DISTINCT sp.MaSanPham) AS DirectProductCount
      FROM DanhMuc dm
      LEFT JOIN SanPham sp ON sp.MaDanhMuc = dm.MaDanhMuc
      GROUP BY
        dm.MaDanhMuc,
        dm.MaDanhMucCha,
        dm.TenDanhMuc,
        dm.Slug,
        dm.MoTa,
        dm.AnhDaiDien,
        dm.ThuTu,
        dm.HienThi
      ORDER BY dm.ThuTu ASC, dm.MaDanhMuc ASC
    `;

    const [[[stats]], [lowStockProducts], [rawCategories], [sizes], [colors]] =
      await Promise.all([
        pool.query(statsSql),
        pool.query(lowStockSql),
        pool.query(categoriesSql),
        pool.query('SELECT MaKichThuoc, TenKichThuoc, ThuTu FROM KichThuoc ORDER BY ThuTu ASC'),
        pool.query('SELECT MaMauSac, TenMau, MaHex FROM MauSac ORDER BY MaMauSac ASC'),
      ]);

    const { flatTree, nodeMap } = buildCategoryTree(rawCategories, 'order_asc');

    const whereClauses = ['1 = 1'];
    const params = [];

    if (search) {
      whereClauses.push(
        '(sp.TenSanPham LIKE ? OR sp.MaHienThi LIKE ? OR dm.TenDanhMuc LIKE ? OR dmp.TenDanhMuc LIKE ?)'
      );
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    if (categoryId) {
      const catIds = getDescendantIds(nodeMap, categoryId);
      if (catIds.length > 0) {
        whereClauses.push(`sp.MaDanhMuc IN (${catIds.map(() => '?').join(',')})`);
        params.push(...catIds);
      } else {
        whereClauses.push('sp.MaDanhMuc = ?');
        params.push(categoryId);
      }
    }

    if (status === 'hidden') {
      whereClauses.push('sp.DangKinhDoanh = 0');
    } else if (status === 'out_of_stock') {
      whereClauses.push('sp.DangKinhDoanh = 1 AND COALESCE(bt.TongTonKho, 0) = 0');
    } else if (status === 'low_stock') {
      whereClauses.push(
        `sp.DangKinhDoanh = 1 AND COALESCE(bt.TongTonKho, 0) > 0 AND COALESCE(bt.TongTonKho, 0) <= ${LOW_STOCK_THRESHOLD}`
      );
    } else if (status === 'selling') {
      whereClauses.push('sp.DangKinhDoanh = 1 AND COALESCE(bt.TongTonKho, 0) > 0');
    }

    let orderBySql = 'sp.MaSanPham DESC';
    if (sort === 'price_asc') orderBySql = 'sp.GiaBan ASC, sp.MaSanPham DESC';
    else if (sort === 'price_desc') orderBySql = 'sp.GiaBan DESC, sp.MaSanPham DESC';
    else if (sort === 'stock_asc') orderBySql = 'COALESCE(bt.TongTonKho, 0) ASC, sp.MaSanPham DESC';
    else if (sort === 'stock_desc') orderBySql = 'COALESCE(bt.TongTonKho, 0) DESC, sp.MaSanPham DESC';

    const baseJoin = `
      FROM SanPham sp
      INNER JOIN DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
      LEFT JOIN DanhMuc dmp ON dmp.MaDanhMuc = dm.MaDanhMucCha
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
        dm.Slug AS CategorySlug,
        dm.MaDanhMucCha,
        dmp.TenDanhMuc AS TenDanhMucCha,
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
      ORDER BY ${orderBySql}
      LIMIT ? OFFSET ?
    `;

    const [[[countRow]], [rows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total ${baseJoin}`, params),
      pool.query(listSql, [...params, limit, offset]),
    ]);

    const total = Number(countRow.total);

    const products = rows.map((row) => {
      const stock = Number(row.TongTonKho);
      let trangThai = 'DANG_BAN';
      if (row.DangKinhDoanh === 0) {
        trangThai = 'TAM_AN';
      } else if (stock === 0) {
        trangThai = 'HET_HANG';
      } else if (stock <= LOW_STOCK_THRESHOLD) {
        trangThai = 'SAP_HET';
      }

      return {
        ...row,
        GiaBan: Number(row.GiaBan),
        HoTroIn: Boolean(row.HoTroIn),
        NoiBat: Boolean(row.NoiBat),
        DangKinhDoanh: Boolean(row.DangKinhDoanh),
        SoBienThe: Number(row.SoBienThe),
        SoMau: Number(row.SoMau),
        SoKichCo: Number(row.SoKichCo),
        TongTonKho: stock,
        TrangThai: trangThai,
      };
    });

    res.json({
      stats: {
        tongSanPham: Number(stats.tongSanPham),
        hoTroIn: Number(stats.hoTroIn),
        hetHang: Number(stats.hetHang),
        sapHetHang: Number(stats.sapHetHang),
      },
      lowStockProducts: lowStockProducts.map((p) => ({
        ...p,
        TongTonKho: Number(p.TongTonKho),
      })),
      categories: flatTree.map((c) => ({
        MaDanhMuc: c.MaDanhMuc,
        MaDanhMucCha: c.MaDanhMucCha,
        TenDanhMuc: c.TenDanhMuc,
        ParentName: c.ParentName,
        Slug: c.Slug,
        HienThi: c.HienThi,
        EffectiveHienThi: c.EffectiveHienThi,
        level: c.level,
        isLeaf: c.isLeaf,
        printEligible: isPrintEligibleCategory(c),
        soSanPham: c.SoSanPham,
      })),
      sizes,
      colors,
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

// 2. Thêm sản phẩm mới (kèm biến thể nếu có)
async function createProduct(req, res) {
  const conn = await pool.getConnection();
  try {
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
      variants,
    } = req.body;

    if (!maDanhMuc || !maHienThi?.trim() || !tenSanPham?.trim() || Number(giaBan) <= 0) {
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ danh mục, mã SKU, tên sản phẩm và giá bán > 0',
      });
    }

    const normalizedSku = maHienThi.trim().toUpperCase();

    await conn.beginTransaction();

    const catRow = await validateLeafCategory(conn, maDanhMuc);
    const effectivePrint = isPrintEligibleCategory(catRow) && hoTroIn ? 1 : 0;

    const [dupSku] = await conn.query(
      'SELECT MaSanPham FROM SanPham WHERE MaHienThi = ? LIMIT 1',
      [normalizedSku]
    );
    if (dupSku.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: `Mã SKU "${normalizedSku}" đã tồn tại. Vui lòng nhập mã SKU khác.`,
      });
    }

    const insertSql = `
      INSERT INTO SanPham
        (MaDanhMuc, MaHienThi, TenSanPham, MoTa, GiaBan, HoTroIn, NoiBat, DangKinhDoanh)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await conn.query(insertSql, [
      catRow.MaDanhMuc,
      normalizedSku,
      tenSanPham.trim(),
      moTa.trim() || null,
      Number(giaBan),
      effectivePrint,
      noiBat ? 1 : 0,
      dangKinhDoanh ? 1 : 0,
    ]);

    const newProductId = result.insertId;

    if (anhDaiDien.trim()) {
      await conn.query(
        `INSERT INTO AnhSanPham (MaSanPham, DuongDan, ThuTu) VALUES (?, ?, 1)`,
        [newProductId, anhDaiDien.trim()]
      );
    }

    if (Array.isArray(variants) && variants.length > 0) {
      await syncProductVariants(conn, newProductId, normalizedSku, variants);
    }

    await conn.commit();

    res.status(201).json({
      message: 'Đã lưu sản phẩm mới thành công',
      maSanPham: newProductId,
    });
  } catch (err) {
    await conn.rollback();
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Mã SKU này đã tồn tại. Vui lòng nhập mã khác.' });
    }
    console.error('[products.controller > createProduct]', err);
    res.status(500).json({ message: 'Lỗi thêm sản phẩm', error: err.message });
  } finally {
    conn.release();
  }
}

// 3. Cập nhật sản phẩm (kèm đồng bộ biến thể nếu gửi lên)
async function updateProduct(req, res) {
  const conn = await pool.getConnection();
  try {
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
      variants,
    } = req.body;

    if (!maDanhMuc || !maHienThi?.trim() || !tenSanPham?.trim() || Number(giaBan) <= 0) {
      return res.status(400).json({ message: 'Thông tin sản phẩm không hợp lệ' });
    }

    const normalizedSku = maHienThi.trim().toUpperCase();

    await conn.beginTransaction();

    const catRow = await validateLeafCategory(conn, maDanhMuc);
    const effectivePrint = isPrintEligibleCategory(catRow) && hoTroIn ? 1 : 0;

    const [dupSku] = await conn.query(
      'SELECT MaSanPham FROM SanPham WHERE MaHienThi = ? AND MaSanPham <> ? LIMIT 1',
      [normalizedSku, id]
    );
    if (dupSku.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: `Mã SKU "${normalizedSku}" đã được sản phẩm khác sử dụng.`,
      });
    }

    const updateSql = `
      UPDATE SanPham
      SET MaDanhMuc = ?, MaHienThi = ?, TenSanPham = ?, MoTa = ?,
          GiaBan = ?, HoTroIn = ?, NoiBat = ?, DangKinhDoanh = ?
      WHERE MaSanPham = ?
    `;
    const [result] = await conn.query(updateSql, [
      catRow.MaDanhMuc,
      normalizedSku,
      tenSanPham.trim(),
      moTa.trim() || null,
      Number(giaBan),
      effectivePrint,
      noiBat ? 1 : 0,
      dangKinhDoanh ? 1 : 0,
      id,
    ]);

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    if (anhDaiDien.trim()) {
      await conn.query(
        `INSERT INTO AnhSanPham (MaSanPham, DuongDan, ThuTu)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE DuongDan = VALUES(DuongDan)`,
        [id, anhDaiDien.trim()]
      );
    }

    if (Array.isArray(variants)) {
      await syncProductVariants(conn, id, normalizedSku, variants);
    }

    await conn.commit();

    res.json({ message: 'Đã lưu thay đổi sản phẩm' });
  } catch (err) {
    await conn.rollback();
    if (err.statusCode) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Mã SKU bị trùng' });
    }
    console.error('[products.controller > updateProduct]', err);
    res.status(500).json({ message: 'Lỗi cập nhật sản phẩm', error: err.message });
  } finally {
    conn.release();
  }
}

// 4. Xóa sản phẩm: có đơn thì ẩn, chưa có đơn thì xóa hẳn
async function deleteProduct(req, res) {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Mã sản phẩm không hợp lệ' });
    }

    const [[existing]] = await conn.query(
      'SELECT MaSanPham, TenSanPham FROM SanPham WHERE MaSanPham = ?',
      [id]
    );
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    const [[orderRef]] = await conn.query(
      `SELECT COUNT(*) AS cnt
       FROM ChiTietDonHang ct
       INNER JOIN BienTheSanPham bt ON bt.MaBienThe = ct.MaBienThe
       WHERE bt.MaSanPham = ?`,
      [id]
    );

    if (Number(orderRef.cnt) > 0) {
      await conn.query('UPDATE SanPham SET DangKinhDoanh = 0 WHERE MaSanPham = ?', [id]);
      return res.json({
        success: true,
        action: 'hidden',
        message: `Sản phẩm "${existing.TenSanPham}" đã phát sinh đơn hàng nên đã chuyển sang Tạm ẩn.`,
      });
    }

    await conn.beginTransaction();
    await conn.query('DELETE FROM AnhSanPham WHERE MaSanPham = ?', [id]);
    await conn.query('DELETE FROM BienTheSanPham WHERE MaSanPham = ?', [id]);
    await conn.query('DELETE FROM SanPham WHERE MaSanPham = ?', [id]);
    await conn.commit();

    res.json({
      success: true,
      action: 'deleted',
      message: `Đã xóa vĩnh viễn sản phẩm "${existing.TenSanPham}".`,
    });
  } catch (err) {
    await conn.rollback();
    console.error('[products.controller > deleteProduct]', err);
    res.status(500).json({ message: 'Lỗi xóa sản phẩm', error: err.message });
  } finally {
    conn.release();
  }
}

// 5. Bật/tắt sao Nổi bật
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

// 6. Lấy danh sách biến thể của 1 sản phẩm
async function getProductVariants(req, res) {
  try {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ message: 'Mã sản phẩm không hợp lệ' });
    }

    const [rows] = await pool.query(
      `SELECT
        bt.MaBienThe,
        bt.MaSanPham,
        bt.MaKichThuoc,
        kt.TenKichThuoc,
        bt.MaMauSac,
        ms.TenMau,
        ms.MaHex,
        bt.SKU,
        bt.SoLuongTon,
        bt.DangKinhDoanh
      FROM BienTheSanPham bt
      INNER JOIN KichThuoc kt ON kt.MaKichThuoc = bt.MaKichThuoc
      INNER JOIN MauSac ms ON ms.MaMauSac = bt.MaMauSac
      WHERE bt.MaSanPham = ? AND bt.DangKinhDoanh = 1
      ORDER BY kt.ThuTu ASC, ms.MaMauSac ASC`,
      [productId]
    );

    res.json({
      success: true,
      variants: rows.map((r) => ({
        ...r,
        SoLuongTon: Number(r.SoLuongTon),
        DangKinhDoanh: Boolean(r.DangKinhDoanh),
      })),
    });
  } catch (err) {
    console.error('[products.controller > getProductVariants]', err);
    res.status(500).json({ message: 'Lỗi tải biến thể sản phẩm', error: err.message });
  }
}

// 7. Thêm biến thể cho sản phẩm
async function createProductVariant(req, res) {
  try {
    const productId = Number(req.params.id);
    const maMauSac = Number(req.body.maMauSac);
    const maKichThuoc = Number(req.body.maKichThuoc);
    const soLuongTon = Math.max(0, Number(req.body.soLuongTon ?? 0));
    const rawSku = (req.body.sku || '').trim().toUpperCase();

    if (!Number.isInteger(productId) || !maMauSac || !maKichThuoc) {
      return res.status(400).json({ message: 'Vui lòng chọn đầy đủ Màu sắc và Kích cỡ' });
    }

    const [[prod]] = await connQuerySingle(
      'SELECT MaSanPham, MaHienThi FROM SanPham WHERE MaSanPham = ?',
      [productId]
    );
    if (!prod) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
    }

    const [[dupPair]] = await pool.query(
      'SELECT MaBienThe, DangKinhDoanh FROM BienTheSanPham WHERE MaSanPham = ? AND MaMauSac = ? AND MaKichThuoc = ? LIMIT 1',
      [productId, maMauSac, maKichThuoc]
    );

    const [[sz]] = await pool.query('SELECT TenKichThuoc FROM KichThuoc WHERE MaKichThuoc = ?', [
      maKichThuoc,
    ]);
    const sizeLabel = (sz?.TenKichThuoc || `SZ${maKichThuoc}`).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const sku = rawSku || `${prod.MaHienThi}-${sizeLabel}-C${maMauSac}`;

    if (dupPair) {
      if (dupPair.DangKinhDoanh) {
        return res.status(409).json({ message: 'Biến thể Màu & Kích cỡ này đã tồn tại' });
      }
      await pool.query(
        'UPDATE BienTheSanPham SET SKU = ?, SoLuongTon = ?, DangKinhDoanh = 1 WHERE MaBienThe = ?',
        [sku, soLuongTon, dupPair.MaBienThe]
      );
      return res.status(201).json({ success: true, maBienThe: dupPair.MaBienThe });
    }

    const [result] = await pool.query(
      `INSERT INTO BienTheSanPham (MaSanPham, MaKichThuoc, MaMauSac, SKU, SoLuongTon, DangKinhDoanh)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [productId, maKichThuoc, maMauSac, sku, soLuongTon]
    );

    res.status(201).json({ success: true, maBienThe: result.insertId, sku });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Mã SKU biến thể đã tồn tại' });
    }
    console.error('[products.controller > createProductVariant]', err);
    res.status(500).json({ message: 'Lỗi thêm biến thể', error: err.message });
  }
}

async function connQuerySingle(sql, params) {
  return pool.query(sql, params);
}

// 8. Cập nhật biến thể
async function updateProductVariant(req, res) {
  try {
    const productId = Number(req.params.id);
    const variantId = Number(req.params.variantId);
    const maMauSac = Number(req.body.maMauSac);
    const maKichThuoc = Number(req.body.maKichThuoc);
    const soLuongTon = Math.max(0, Number(req.body.soLuongTon ?? 0));
    const sku = (req.body.sku || '').trim().toUpperCase();

    if (!Number.isInteger(productId) || !Number.isInteger(variantId) || !maMauSac || !maKichThuoc) {
      return res.status(400).json({ message: 'Thông tin biến thể không hợp lệ' });
    }

    const updates = ['MaMauSac = ?', 'MaKichThuoc = ?', 'SoLuongTon = ?'];
    const params = [maMauSac, maKichThuoc, soLuongTon];
    if (sku) {
      updates.push('SKU = ?');
      params.push(sku);
    }
    params.push(variantId, productId);

    const [result] = await pool.query(
      `UPDATE BienTheSanPham SET ${updates.join(', ')} WHERE MaBienThe = ? AND MaSanPham = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy biến thể' });
    }

    res.json({ success: true, message: 'Cập nhật biến thể thành công' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Biến thể hoặc SKU bị trùng' });
    }
    console.error('[products.controller > updateProductVariant]', err);
    res.status(500).json({ message: 'Lỗi cập nhật biến thể', error: err.message });
  }
}

// 9. Xóa biến thể (có đơn thì ẩn, chưa có đơn thì xóa)
async function deleteProductVariant(req, res) {
  try {
    const productId = Number(req.params.id);
    const variantId = Number(req.params.variantId);
    if (!Number.isInteger(productId) || !Number.isInteger(variantId)) {
      return res.status(400).json({ message: 'Mã biến thể không hợp lệ' });
    }

    const [[used]] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM ChiTietDonHang WHERE MaBienThe = ?',
      [variantId]
    );
    if (Number(used.cnt) > 0) {
      await pool.query(
        'UPDATE BienTheSanPham SET DangKinhDoanh = 0, SoLuongTon = 0 WHERE MaBienThe = ? AND MaSanPham = ?',
        [variantId, productId]
      );
      return res.json({
        success: true,
        action: 'hidden',
        message: 'Biến thể đã từng được đặt hàng nên đã chuyển sang tạm ẩn.',
      });
    }

    const [result] = await pool.query(
      'DELETE FROM BienTheSanPham WHERE MaBienThe = ? AND MaSanPham = ?',
      [variantId, productId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy biến thể' });
    }

    res.json({ success: true, action: 'deleted', message: 'Đã xóa biến thể' });
  } catch (err) {
    console.error('[products.controller > deleteProductVariant]', err);
    res.status(500).json({ message: 'Lỗi xóa biến thể', error: err.message });
  }
}

module.exports = {
  uploadProductImage,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleFeatured,
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
};
