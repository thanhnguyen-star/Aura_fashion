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
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Xây dựng cây danh mục và tính tổng số sản phẩm thực tế (cha = trực tiếp + tổng các con)
 */
function buildCategoryTree(flatRows, sortBy = 'order_asc') {
  const nodeMap = new Map();

  for (const row of flatRows) {
    const id = Number(row.MaDanhMuc);
    const parentId = row.MaDanhMucCha ? Number(row.MaDanhMucCha) : null;
    const directCount = Number(row.DirectProductCount ?? row.SoSanPham ?? 0);
    const directActiveCount = Number(row.DirectActiveProductCount ?? directCount);

    nodeMap.set(id, {
      MaDanhMuc: id,
      MaDanhMucCha: parentId,
      TenDanhMuc: row.TenDanhMuc,
      Slug: row.Slug || toSlug(row.TenDanhMuc),
      DuongDan: `/danh-muc/${row.Slug || toSlug(row.TenDanhMuc)}`,
      MoTa: row.MoTa || '',
      AnhDaiDien: row.AnhDaiDien || '',
      ThuTu: Number(row.ThuTu || 0),
      HienThi: Boolean(row.HienThi),
      DirectProductCount: directCount,
      DirectActiveProductCount: directActiveCount,
      SoSanPham: directCount,
      SoSanPhamHoatDong: directActiveCount,
      AnhBia: row.AnhDaiDien || row.AnhBia || '',
      ParentName: null,
      ParentSlug: null,
      ParentHienThi: true,
      EffectiveHienThi: Boolean(row.HienThi),
      ChildrenCount: 0,
      isLeaf: true,
      children: [],
    });
  }

  const roots = [];
  for (const node of nodeMap.values()) {
    if (node.MaDanhMucCha && nodeMap.has(node.MaDanhMucCha)) {
      const parent = nodeMap.get(node.MaDanhMucCha);
      node.ParentName = parent.TenDanhMuc;
      node.ParentSlug = parent.Slug;
      parent.children.push(node);
    } else {
      node.MaDanhMucCha = null;
      roots.push(node);
    }
  }

  const comparator = (a, b) => {
    if (sortBy === 'id_desc') return b.MaDanhMuc - a.MaDanhMuc;
    if (sortBy === 'id_asc') return a.MaDanhMuc - b.MaDanhMuc;
    if (sortBy === 'name_asc') return a.TenDanhMuc.localeCompare(b.TenDanhMuc, 'vi');
    if (sortBy === 'products_desc') return b.SoSanPham - a.SoSanPham;
    if (a.ThuTu !== b.ThuTu) return a.ThuTu - b.ThuTu;
    return a.MaDanhMuc - b.MaDanhMuc;
  };

  function computeStats(node, parentEffectiveVisible = true, level = 0) {
    node.level = level;
    node.EffectiveHienThi = node.HienThi && parentEffectiveVisible;
    node.ParentHienThi = parentEffectiveVisible;
    node.ChildrenCount = node.children.length;
    node.isLeaf = node.children.length === 0;

    let sumProducts = node.DirectProductCount;
    let sumActiveProducts = node.DirectActiveProductCount;

    for (const child of node.children) {
      computeStats(child, node.EffectiveHienThi, level + 1);
      sumProducts += child.SoSanPham;
      sumActiveProducts += child.SoSanPhamHoatDong;
      if (!node.AnhBia && child.AnhBia) {
        node.AnhBia = child.AnhBia;
      }
    }

    if (!node.AnhDaiDien && node.AnhBia) {
      node.AnhDaiDien = node.AnhBia;
    }

    node.SoSanPham = sumProducts;
    node.SoSanPhamHoatDong = sumActiveProducts;
    node.children.sort(comparator);
  }

  for (const root of roots) {
    computeStats(root, true, 0);
  }
  roots.sort(comparator);

  const flatTree = [];
  function flatten(nodes) {
    for (const node of nodes) {
      flatTree.push(node);
      if (node.children.length > 0) {
        flatten(node.children);
      }
    }
  }
  flatten(roots);

  return { roots, flatTree, nodeMap };
}

function getDescendantIds(nodeMap, rootId) {
  const ids = [];
  const start = nodeMap.get(Number(rootId));
  if (!start) return ids;

  const stack = [start];
  while (stack.length > 0) {
    const cur = stack.pop();
    ids.push(cur.MaDanhMuc);
    for (const child of cur.children || []) {
      stack.push(child);
    }
  }
  return ids;
}

module.exports = {
  toSlug,
  buildCategoryTree,
  getDescendantIds,
};
