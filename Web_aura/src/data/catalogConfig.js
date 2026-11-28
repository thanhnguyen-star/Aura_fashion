// Cấu hình danh mục dùng chung cho Mega Menu và Sidebar trang sản phẩm.
// Muốn thêm, sửa hoặc ẩn danh mục (ví dụ thêm "Áo thun in theo mẫu"),
// chỉ cần chỉnh 1 dòng trong CATALOG_CATEGORIES bên dưới.

export const CATALOG_ALL_MENU_ITEMS = [
  { label: 'Sản phẩm mới', slug: 'all', sub: 'all', sort: 'newest' },
  { label: 'Bán chạy nhất', slug: 'all', sub: 'all', sort: 'popular' },
];

export const CATALOG_CATEGORIES = [
  {
    id: 'nam',
    title: 'Nam',
    allLabel: 'Tất cả sản phẩm',
    items: [
      {
        id: 'ao-thun',
        label: 'Áo thun',
        icon: 'shirt',
        keywords: ['áo thun', 'sơ mi', 'polo'],
      },
      {
        id: 'hoodie',
        label: 'Hoodie',
        icon: 'layers',
        keywords: ['hoodie'],
      },
      {
        id: 'ao-khoac',
        label: 'Áo khoác',
        icon: 'jacket',
        keywords: ['áo khoác', 'áo gió', 'jacket'],
        loaiTypes: ['khoac-nam'],
        excludeKeywords: ['cardigan'],
      },
    ],
  },
  {
    id: 'nu',
    title: 'Nữ',
    allLabel: 'Tất cả sản phẩm',
    items: [
      {
        id: 'ao-thun',
        label: 'Áo thun',
        icon: 'shirt',
        keywords: ['áo thun', 'sơ mi', 'polo'],
      },
      {
        id: 'hoodie',
        label: 'Hoodie',
        icon: 'layers',
        keywords: ['hoodie'],
      },
      {
        id: 'ao-khoac',
        label: 'Áo khoác',
        icon: 'jacket',
        keywords: ['áo khoác', 'áo gió', 'jacket'],
        loaiTypes: ['khoac-nu'],
        excludeKeywords: ['cardigan'],
      },
    ],
  },
  {
    id: 'phu-kien',
    title: 'Phụ kiện',
    allLabel: 'Tất cả phụ kiện',
    items: [
      {
        id: 'tui',
        label: 'Túi',
        icon: 'bag',
        keywords: ['túi'],
        loaiTypes: ['tui-xach'],
      },
      {
        id: 'mu',
        label: 'Mũ',
        icon: 'cap',
        keywords: ['mũ'],
        loaiTypes: ['mu-non'],
      },
      {
        id: 'kinh-trang-suc',
        label: 'Kính & Trang sức',
        icon: 'gem',
        keywords: ['kính', 'dây chuyền', 'trang sức', 'nhẫn', 'vòng'],
        loaiTypes: ['trang-suc', 'phu-kien-khac'],
      },
    ],
  },
];

export const CATALOG_TABS = [
  { slug: 'all', label: 'Tất cả' },
  ...CATALOG_CATEGORIES.map((cat) => ({ slug: cat.id, label: cat.title })),
];

export function getMegaMenuColumns() {
  return [
    {
      id: 'all',
      title: 'Tất cả sản phẩm',
      slug: 'all',
      items: CATALOG_ALL_MENU_ITEMS,
    },
    ...CATALOG_CATEGORIES.map((cat) => ({
      id: cat.id,
      title: cat.title,
      slug: cat.id,
      items: cat.items.map((item) => ({
        label: item.label,
        slug: cat.id,
        sub: item.id,
      })),
    })),
  ];
}

export function getSidebarSubCategories(categorySlug) {
  if (categorySlug === 'all') {
    const seen = new Set();
    const merged = [{ id: 'all', ten: 'Tất cả sản phẩm', icon: 'grid' }];

    for (const cat of CATALOG_CATEGORIES) {
      for (const item of cat.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push({
            id: item.id,
            ten: item.label,
            icon: item.icon || 'grid',
          });
        }
      }
    }

    return merged;
  }

  const category = CATALOG_CATEGORIES.find((cat) => cat.id === categorySlug);
  if (!category) {
    return [{ id: 'all', ten: 'Tất cả sản phẩm', icon: 'grid' }];
  }

  return [
    { id: 'all', ten: category.allLabel || 'Tất cả sản phẩm', icon: 'grid' },
    ...category.items.map((item) => ({
      id: item.id,
      ten: item.label,
      icon: item.icon || 'grid',
    })),
  ];
}

export function matchesCatalogSub(sp, subId, categorySlug = 'all') {
  if (!subId || subId === 'all') return true;

  const targetSlug = categorySlug !== 'all' ? categorySlug : sp.danhMuc;
  const preferredCat = CATALOG_CATEGORIES.find((cat) => cat.id === targetSlug);
  let rule = preferredCat?.items.find((item) => item.id === subId);

  if (!rule) {
    for (const cat of CATALOG_CATEGORIES) {
      const found = cat.items.find((item) => item.id === subId);
      if (found) {
        rule = found;
        break;
      }
    }
  }

  if (!rule) {
    return sp.loai === subId;
  }

  const name = (sp.ten || '').toLowerCase();

  if (
    Array.isArray(rule.excludeKeywords) &&
    rule.excludeKeywords.some((kw) => name.includes(kw.toLowerCase()))
  ) {
    return false;
  }

  if (Array.isArray(rule.loaiTypes) && rule.loaiTypes.includes(sp.loai)) {
    return true;
  }

  if (
    Array.isArray(rule.keywords) &&
    rule.keywords.some((kw) => name.includes(kw.toLowerCase()))
  ) {
    return true;
  }

  if (sp.loai === rule.id) {
    return true;
  }

  if (!rule.keywords?.length && !rule.loaiTypes?.length) {
    return name.includes(rule.label.toLowerCase());
  }

  return false;
}
