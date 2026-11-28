const pool = require('../db');
const {
  toSlug,
  buildCategoryTree,
  getDescendantIds,
} = require('../utils/categoryTree');

const CATEGORY_STATS_SQL = `
  SELECT
    dm.MaDanhMuc,
    dm.MaDanhMucCha,
    dm.TenDanhMuc,
    dm.Slug,
    dm.MoTa,
    dm.AnhDaiDien,
    dm.ThuTu,
    dm.HienThi,
    COUNT(DISTINCT sp.MaSanPham) AS DirectProductCount,
    COUNT(DISTINCT CASE WHEN sp.DangKinhDoanh = 1 THEN sp.MaSanPham END) AS DirectActiveProductCount,
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

function buildDefaultDescription(name) {
  return `Danh mục ${name} chính hãng từ AURA Studio.`;
}

function paginateTreeGroups(roots, flatTree, page, limit) {
  const pages = [];
  let currentChunk = [];

  for (const root of roots) {
    const groupNodes = [];
    const collect = (node) => {
      groupNodes.push(node);
      for (const child of node.children || []) {
        collect(child);
      }
    };
    collect(root);

    if (
      currentChunk.length > 0 &&
      currentChunk.length + groupNodes.length > limit
    ) {
      pages.push(currentChunk);
      currentChunk = [...groupNodes];
    } else {
      currentChunk.push(...groupNodes);
    }
  }

  if (currentChunk.length > 0) {
    pages.push(currentChunk);
  }

  const total = flatTree.length;
  const totalPages = Math.max(1, pages.length);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const categories = pages[safePage - 1] || [];

  return { categories, total, totalPages, safePage };
}

// 1. Lấy danh sách danh mục dạng cây + 4 chỉ số KPI + phân trang
async function getCategories(req, res) {
  try {
    const search = (req.query.search || '').trim().toLowerCase();
    const status = req.query.status || 'all'; // all | active | hidden | empty
    const sort = req.query.sort || 'order_asc'; // order_asc | id_asc | id_desc | name_asc | products_desc
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 6));

    const [rows] = await pool.query(CATEGORY_STATS_SQL);
    const { roots, flatTree } = buildCategoryTree(rows, sort);

    // Tính 4 thẻ KPI trên toàn bộ danh mục thật trong DB
    const tongDanhMuc = flatTree.length;
    const dangKichHoat = flatTree.filter((c) => c.HienThi).length;
    const tamAn = tongDanhMuc - dangKichHoat;
    const tyLeTrucTuyen =
      tongDanhMuc > 0 ? Math.round((dangKichHoat / tongDanhMuc) * 100) : 0;
    const tongSanPham = flatTree
      .filter((c) => c.MaDanhMucCha === null)
      .reduce((sum, c) => sum + c.SoSanPham, 0);
    const danhMucChuaCoSanPham = flatTree.filter((c) => c.SoSanPham === 0).length;

    const isDefaultTreeView = status === 'all' && !search;

    let categories;
    let total;
    let totalPages;
    let safePage;

    if (isDefaultTreeView) {
      const paged = paginateTreeGroups(roots, flatTree, page, limit);
      categories = paged.categories;
      total = paged.total;
      totalPages = paged.totalPages;
      safePage = paged.safePage;
    } else {
      const filtered = flatTree.filter((cat) => {
        if (status === 'active' && !cat.HienThi) return false;
        if (status === 'hidden' && cat.HienThi) return false;
        if (status === 'empty' && cat.SoSanPham > 0) return false;
        if (!search) return true;
        return (
          cat.TenDanhMuc.toLowerCase().includes(search) ||
          cat.Slug.toLowerCase().includes(search) ||
          cat.MoTa.toLowerCase().includes(search) ||
          (cat.ParentName || '').toLowerCase().includes(search)
        );
      });

      total = filtered.length;
      totalPages = Math.max(1, Math.ceil(total / limit));
      safePage = Math.min(page, totalPages);
      const offset = (safePage - 1) * limit;
      categories = filtered.slice(offset, offset + limit);
    }

    // Danh sách gọn toàn bộ danh mục (dùng cho dropdown chọn danh mục cha & chuyển sản phẩm)
    const { flatTree: orderedParents } = buildCategoryTree(rows, 'order_asc');
    const allCategories = orderedParents.map((c) => ({
      MaDanhMuc: c.MaDanhMuc,
      MaDanhMucCha: c.MaDanhMucCha,
      TenDanhMuc: c.TenDanhMuc,
      Slug: c.Slug,
      ThuTu: c.ThuTu,
      HienThi: c.HienThi,
      DirectProductCount: c.DirectProductCount,
      SoSanPham: c.SoSanPham,
      ChildrenCount: c.ChildrenCount,
      isLeaf: c.isLeaf,
      level: c.level,
      ParentName: c.ParentName,
    }));

    res.json({
      stats: {
        tongDanhMuc,
        dangKichHoat,
        tamAn,
        tyLeTrucTuyen,
        tongSanPham,
        danhMucChuaCoSanPham,
      },
      categories,
      allCategories,
      isTreeMode: isDefaultTreeView,
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

// Upload ảnh danh mục
function uploadCategoryImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Vui lòng chọn tệp ảnh hợp lệ' });
  }
  const url = `/uploads/categories/${req.file.filename}`;
  res.status(201).json({ success: true, url });
}

// 2. Thêm danh mục mới (hỗ trợ danh mục cha, slug tự sinh, mô tả mặc định, ảnh, thứ tự)
async function createCategory(req, res) {
  try {
    const tenDanhMuc = (req.body.tenDanhMuc || '').trim();
    const rawSlug = (req.body.slug || '').trim();
    const maDanhMucCha = req.body.maDanhMucCha ? Number(req.body.maDanhMucCha) : null;
    const rawMoTa = (req.body.moTa || '').trim();
    const moTa = rawMoTa || buildDefaultDescription(tenDanhMuc);
    const anhDaiDien = (req.body.anhDaiDien || '').trim() || null;
    const hienThi = req.body.hienThi === false ? 0 : 1;

    if (!tenDanhMuc) {
      return res.status(400).json({ message: 'Vui lòng nhập tên danh mục' });
    }

    let parentRow = null;
    if (maDanhMucCha !== null) {
      if (!Number.isInteger(maDanhMucCha) || maDanhMucCha <= 0) {
        return res.status(400).json({ message: 'Danh mục cha không hợp lệ' });
      }
      const [[foundParent]] = await pool.query(
        'SELECT MaDanhMuc, TenDanhMuc, Slug FROM DanhMuc WHERE MaDanhMuc = ?',
        [maDanhMucCha]
      );
      if (!foundParent) {
        return res.status(400).json({ message: 'Danh mục cha không tồn tại' });
      }
      parentRow = foundParent;
    }

    // Kiểm tra trùng tên trong cùng cấp cha
    const dupNameSql =
      maDanhMucCha === null
        ? 'SELECT MaDanhMuc FROM DanhMuc WHERE MaDanhMucCha IS NULL AND LOWER(TenDanhMuc) = LOWER(?) LIMIT 1'
        : 'SELECT MaDanhMuc FROM DanhMuc WHERE MaDanhMucCha = ? AND LOWER(TenDanhMuc) = LOWER(?) LIMIT 1';
    const dupNameParams =
      maDanhMucCha === null ? [tenDanhMuc] : [maDanhMucCha, tenDanhMuc];
    const [dupNames] = await pool.query(dupNameSql, dupNameParams);
    if (dupNames.length > 0) {
      return res.status(409).json({
        message: 'Tên danh mục này đã tồn tại trong cùng cấp danh mục',
      });
    }

    // Sinh slug và kiểm tra trùng slug
    let slug = toSlug(rawSlug || tenDanhMuc);
    if (!slug) {
      slug = `danh-muc-${Date.now()}`;
    }

    const [dupSlugs] = await pool.query(
      'SELECT MaDanhMuc FROM DanhMuc WHERE Slug = ? LIMIT 1',
      [slug]
    );
    if (dupSlugs.length > 0) {
      if (rawSlug) {
        return res.status(409).json({ message: 'Đường dẫn (slug) này đã tồn tại' });
      }
      if (parentRow) {
        slug = `${parentRow.Slug}-${slug}`;
      }
      const [dupPrefixed] = await pool.query(
        'SELECT MaDanhMuc FROM DanhMuc WHERE Slug = ? LIMIT 1',
        [slug]
      );
      if (dupPrefixed.length > 0) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }
    }

    let thuTu = Number(req.body.thuTu);
    if (!Number.isInteger(thuTu) || thuTu <= 0) {
      const maxSql =
        maDanhMucCha === null
          ? 'SELECT COALESCE(MAX(ThuTu), 0) AS maxOrder FROM DanhMuc WHERE MaDanhMucCha IS NULL'
          : 'SELECT COALESCE(MAX(ThuTu), 0) AS maxOrder FROM DanhMuc WHERE MaDanhMucCha = ?';
      const maxParams = maDanhMucCha === null ? [] : [maDanhMucCha];
      const [[maxRow]] = await pool.query(maxSql, maxParams);
      thuTu = Number(maxRow.maxOrder || 0) + 1;
    }

    const sql = `
      INSERT INTO DanhMuc (MaDanhMucCha, TenDanhMuc, Slug, MoTa, AnhDaiDien, ThuTu, HienThi)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
      maDanhMucCha,
      tenDanhMuc,
      slug,
      moTa,
      anhDaiDien,
      thuTu,
      hienThi,
    ]);

    res.status(201).json({
      message: 'Thêm danh mục thành công',
      maDanhMuc: result.insertId,
      slug,
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Tên hoặc slug danh mục này đã tồn tại' });
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
    const rawSlug = (req.body.slug || '').trim();
    const hasParentField = Object.prototype.hasOwnProperty.call(req.body, 'maDanhMucCha');
    const maDanhMucCha =
      req.body.maDanhMucCha ? Number(req.body.maDanhMucCha) : null;
    const rawMoTa = (req.body.moTa || '').trim();
    const moTa = rawMoTa || buildDefaultDescription(tenDanhMuc);
    const hasAnhField = Object.prototype.hasOwnProperty.call(req.body, 'anhDaiDien');
    const anhDaiDien = hasAnhField ? ((req.body.anhDaiDien || '').trim() || null) : undefined;
    const hienThi = req.body.hienThi === false ? 0 : 1;

    if (!tenDanhMuc) {
      return res.status(400).json({ message: 'Vui lòng nhập tên danh mục' });
    }

    const [allRows] = await pool.query(
      'SELECT MaDanhMuc, MaDanhMucCha, Slug, ThuTu, AnhDaiDien FROM DanhMuc'
    );
    const { nodeMap } = buildCategoryTree(
      allRows.map((r) => ({ ...r, TenDanhMuc: '', HienThi: 1 })),
      'order_asc'
    );
    const existing = nodeMap.get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    const nextParentId = hasParentField ? maDanhMucCha : existing.MaDanhMucCha;

    if (nextParentId !== null) {
      if (!Number.isInteger(nextParentId) || nextParentId <= 0 || !nodeMap.has(nextParentId)) {
        return res.status(400).json({ message: 'Danh mục cha không hợp lệ' });
      }
      const descendantIds = new Set(getDescendantIds(nodeMap, id));
      if (descendantIds.has(nextParentId)) {
        return res.status(400).json({
          message: 'Không thể chọn chính danh mục này hoặc danh mục con làm danh mục cha',
        });
      }
    }

    const dupNameSql =
      nextParentId === null
        ? 'SELECT MaDanhMuc FROM DanhMuc WHERE MaDanhMucCha IS NULL AND LOWER(TenDanhMuc) = LOWER(?) AND MaDanhMuc <> ? LIMIT 1'
        : 'SELECT MaDanhMuc FROM DanhMuc WHERE MaDanhMucCha = ? AND LOWER(TenDanhMuc) = LOWER(?) AND MaDanhMuc <> ? LIMIT 1';
    const dupNameParams =
      nextParentId === null ? [tenDanhMuc, id] : [nextParentId, tenDanhMuc, id];
    const [dupNames] = await pool.query(dupNameSql, dupNameParams);
    if (dupNames.length > 0) {
      return res.status(409).json({
        message: 'Tên danh mục này đã tồn tại trong cùng cấp danh mục',
      });
    }

    const slug = toSlug(rawSlug || existing.Slug || tenDanhMuc);
    if (!slug) {
      return res.status(400).json({ message: 'Đường dẫn (slug) không hợp lệ' });
    }

    const [dupSlugs] = await pool.query(
      'SELECT MaDanhMuc FROM DanhMuc WHERE Slug = ? AND MaDanhMuc <> ? LIMIT 1',
      [slug, id]
    );
    if (dupSlugs.length > 0) {
      return res.status(409).json({ message: 'Đường dẫn (slug) này đã được sử dụng' });
    }

    const thuTu =
      Number.isInteger(Number(req.body.thuTu)) && Number(req.body.thuTu) > 0
        ? Number(req.body.thuTu)
        : existing.ThuTu;

    const nextAnhDaiDien = anhDaiDien !== undefined ? anhDaiDien : (existing.AnhDaiDien || null);

    const sql = `
      UPDATE DanhMuc
      SET MaDanhMucCha = ?, TenDanhMuc = ?, Slug = ?, MoTa = ?, AnhDaiDien = ?, ThuTu = ?, HienThi = ?
      WHERE MaDanhMuc = ?
    `;
    await pool.query(sql, [
      nextParentId,
      tenDanhMuc,
      slug,
      moTa,
      nextAnhDaiDien,
      thuTu,
      hienThi,
      id,
    ]);

    res.json({ message: 'Cập nhật danh mục thành công', slug });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Tên hoặc slug danh mục bị trùng' });
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

// 5. Đổi thứ tự hiển thị danh mục trong cùng cấp cha
async function reorderCategory(req, res) {
  const conn = await pool.getConnection();
  try {
    const id = Number(req.body.id);
    const direction = req.body.direction; // 'up' | 'down'

    if (!Number.isInteger(id) || id <= 0 || !['up', 'down'].includes(direction)) {
      return res.status(400).json({ message: 'Tham số sắp xếp không hợp lệ' });
    }

    await conn.beginTransaction();

    const [[target]] = await conn.query(
      'SELECT MaDanhMuc, MaDanhMucCha FROM DanhMuc WHERE MaDanhMuc = ?',
      [id]
    );
    if (!target) {
      await conn.rollback();
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    const siblingsSql =
      target.MaDanhMucCha === null
        ? 'SELECT MaDanhMuc, ThuTu FROM DanhMuc WHERE MaDanhMucCha IS NULL ORDER BY ThuTu ASC, MaDanhMuc ASC'
        : 'SELECT MaDanhMuc, ThuTu FROM DanhMuc WHERE MaDanhMucCha = ? ORDER BY ThuTu ASC, MaDanhMuc ASC';
    const siblingsParams = target.MaDanhMucCha === null ? [] : [target.MaDanhMucCha];
    const [siblings] = await conn.query(siblingsSql, siblingsParams);

    const idx = siblings.findIndex((s) => Number(s.MaDanhMuc) === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;

    if (idx === -1 || swapIdx < 0 || swapIdx >= siblings.length) {
      await conn.rollback();
      return res.json({ message: 'Đã ở vị trí giới hạn', moved: false });
    }

    // Chuẩn hóa lại ThuTu 1..n rồi hoán đổi vị trí
    const reordered = [...siblings];
    const temp = reordered[idx];
    reordered[idx] = reordered[swapIdx];
    reordered[swapIdx] = temp;

    for (let i = 0; i < reordered.length; i += 1) {
      await conn.query('UPDATE DanhMuc SET ThuTu = ? WHERE MaDanhMuc = ?', [
        i + 1,
        reordered[i].MaDanhMuc,
      ]);
    }

    await conn.commit();
    res.json({ message: 'Đã cập nhật thứ tự danh mục', moved: true });
  } catch (err) {
    await conn.rollback();
    console.error('[categories.controller > reorderCategory]', err);
    res.status(500).json({ message: 'Lỗi sắp xếp danh mục', error: err.message });
  } finally {
    conn.release();
  }
}

// 6. Xóa danh mục (chặn nếu có sản phẩm hoặc có danh mục con)
async function deleteCategory(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Mã danh mục không hợp lệ' });
    }

    const [rows] = await pool.query(CATEGORY_STATS_SQL);
    const { nodeMap } = buildCategoryTree(rows, 'order_asc');
    const target = nodeMap.get(id);

    if (!target) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục' });
    }

    if (target.SoSanPham > 0) {
      return res.status(400).json({
        message: `Không thể xóa vì danh mục đang có ${target.SoSanPham} sản phẩm. Hãy chuyển sang "Tạm ẩn" thay vì xóa.`,
      });
    }

    if (target.ChildrenCount > 0) {
      return res.status(400).json({
        message: `Không thể xóa danh mục cha khi vẫn còn ${target.ChildrenCount} danh mục con.`,
      });
    }

    await pool.query(`DELETE FROM DanhMuc WHERE MaDanhMuc = ?`, [id]);

    res.json({ message: 'Đã xóa danh mục' });
  } catch (err) {
    console.error('[categories.controller > deleteCategory]', err);
    res.status(500).json({ message: 'Lỗi xóa danh mục', error: err.message });
  }
}

// Chuyển toàn bộ sản phẩm từ 1 danh mục sang danh mục lá khác
async function transferCategoryProducts(req, res) {
  try {
    const sourceId = Number(req.params.id);
    const targetId = Number(req.body.targetCategoryId);

    if (!Number.isInteger(sourceId) || sourceId <= 0 || !Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ message: 'Mã danh mục nguồn hoặc đích không hợp lệ' });
    }
    if (sourceId === targetId) {
      return res.status(400).json({ message: 'Danh mục đích phải khác danh mục nguồn' });
    }

    const [rows] = await pool.query(CATEGORY_STATS_SQL);
    const { nodeMap } = buildCategoryTree(rows, 'order_asc');
    const sourceNode = nodeMap.get(sourceId);
    const targetNode = nodeMap.get(targetId);

    if (!sourceNode || !targetNode) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục nguồn hoặc đích' });
    }
    if (!targetNode.isLeaf) {
      return res.status(400).json({ message: 'Vui lòng chọn danh mục lá làm danh mục đích' });
    }

    const sourceIds = getDescendantIds(nodeMap, sourceId);
    const [result] = await pool.query(
      `UPDATE SanPham SET MaDanhMuc = ? WHERE MaDanhMuc IN (${sourceIds.map(() => '?').join(',')})`,
      [targetId, ...sourceIds]
    );

    res.json({
      success: true,
      movedCount: result.affectedRows,
      message: `Đã chuyển ${result.affectedRows} sản phẩm từ "${sourceNode.TenDanhMuc}" sang "${targetNode.TenDanhMuc}".`,
    });
  } catch (err) {
    console.error('[categories.controller > transferCategoryProducts]', err);
    res.status(500).json({ message: 'Lỗi chuyển sản phẩm sang danh mục khác', error: err.message });
  }
}

module.exports = {
  uploadCategoryImage,
  getCategories,
  createCategory,
  updateCategory,
  toggleStatus,
  reorderCategory,
  transferCategoryProducts,
  deleteCategory,
};
