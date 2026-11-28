const pool = require('./db');
const { toSlug } = require('./utils/categoryTree');

const DEFAULT_CATEGORY_TREE = [
  {
    tenDanhMuc: 'Nam',
    slug: 'nam',
    anhDaiDien: '/img/nam/aokhoac.jpg',
    moTa: 'Thiết kế tối giản, phom dáng hiện đại và dễ phối dành cho nam giới.',
    thuTu: 1,
    children: [
      {
        tenDanhMuc: 'Áo thun',
        slug: 'nam-ao-thun',
        moTa: 'Áo thun cotton dệt compact, áo polo và sơ mi cơ bản dành cho nam.',
        thuTu: 1,
      },
      {
        tenDanhMuc: 'Hoodie',
        slug: 'nam-hoodie',
        moTa: 'Áo hoodie nỉ bông dày dặn, giữ phom rộng thoải mái cho nam.',
        thuTu: 2,
      },
      {
        tenDanhMuc: 'Áo khoác',
        slug: 'nam-ao-khoac',
        moTa: 'Áo khoác jacket, áo gió và áo khoác jean phong cách tối giản cho nam.',
        thuTu: 3,
      },
    ],
  },
  {
    tenDanhMuc: 'Nữ',
    slug: 'nu',
    anhDaiDien: '/img/nu/01_ao_so_mi_peplum_trang.jpg',
    moTa: 'Đường cắt thanh lịch, tối giản và tinh tế dành cho nữ giới.',
    thuTu: 2,
    children: [
      {
        tenDanhMuc: 'Áo thun',
        slug: 'nu-ao-thun',
        moTa: 'Áo thun nữ phom chuẩn, chất liệu thoáng mát, dễ phối đồ.',
        thuTu: 1,
      },
      {
        tenDanhMuc: 'Hoodie',
        slug: 'nu-hoodie',
        moTa: 'Áo hoodie nỉ mềm mịn, phong cách trẻ trung năng động cho nữ.',
        thuTu: 2,
      },
      {
        tenDanhMuc: 'Áo khoác',
        slug: 'nu-ao-khoac',
        moTa: 'Áo khoác nữ dáng gọn, thanh lịch cho nhiều điều kiện thời tiết.',
        thuTu: 3,
      },
    ],
  },
  {
    tenDanhMuc: 'Phụ kiện',
    slug: 'phu-kien',
    anhDaiDien: '/img/phu-kien/11_tui_hobo_den.jpg',
    moTa: 'Túi tote, mũ nón, kính mắt và trang sức hoàn thiện phong cách AURA.',
    thuTu: 3,
    children: [],
  },
];

// Sản phẩm cửa hàng chuẩn hóa đưa vào DB để một nguồn dữ liệu duy nhất
const STOREFRONT_PRODUCTS = [
  // NAM -> Áo thun
  {
    code: 'NAM-01',
    catSlug: 'nam-ao-thun',
    name: 'Áo Thun Oversize Đen AURA',
    desc: 'Áo thun phom rộng cotton compact 260gsm màu đen tối giản, dễ phối hằng ngày.',
    price: 319000,
    supportPrint: 1,
    featured: 1,
    img: '/img/nam/thunden1.png',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#000000', '#FFFFFF', '#71717A'],
  },
  {
    code: 'NAM-02',
    catSlug: 'nam-ao-thun',
    name: 'Áo Thun Basic Trắng AURA',
    desc: 'Áo thun trắng tinh khôi cổ tròn bo gân, bề mặt mịn hỗ trợ in DTG sắc nét.',
    price: 319000,
    supportPrint: 1,
    featured: 0,
    img: '/img/nam/thuntrang1.png',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#FFFFFF', '#000000'],
  },
  {
    code: 'NAM-03',
    catSlug: 'nam-ao-thun',
    name: 'Áo Sơ Mi Tay Dài Basic AURA',
    desc: 'Áo sơ mi tay dài chất liệu cotton pha thoáng nhẹ, đường may tinh gọn.',
    price: 339000,
    supportPrint: 0,
    featured: 0,
    img: '/img/nam/somitaydai.jpg',
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: ['#FFFFFF', '#E4D8C9', '#000000'],
  },
  {
    code: 'NAM-04',
    catSlug: 'nam-ao-thun',
    name: 'Áo Polo Đen AURA',
    desc: 'Áo polo dệt pique đứng dáng, phù hợp cả đi làm và dạo phố.',
    price: 379000,
    supportPrint: 0,
    featured: 1,
    img: '/img/nam/poloden.jpg',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#000000', '#71717A'],
  },
  {
    code: 'NAM-05',
    catSlug: 'nam-ao-thun',
    name: 'Áo Thun Form Rộng Đen AURA',
    desc: 'Phom boxy vai trễ hiện đại, chất vải dày vừa phải ít nhăn.',
    price: 329000,
    supportPrint: 1,
    featured: 0,
    img: '/img/nam/thunden2.jpg',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['#000000', '#71717A'],
  },
  // NAM -> Hoodie
  {
    code: 'NAM-06',
    catSlug: 'nam-hoodie',
    name: 'Áo Hoodie AURA Essential',
    desc: 'Hoodie nỉ chân cua dày dặn, mũ 2 lớp đứng phom đặc trưng của AURA.',
    price: 449000,
    supportPrint: 1,
    featured: 1,
    img: '/img/nam/hodie1.png',
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: ['#000000', '#E4D8C9', '#FFFFFF'],
  },
  {
    code: 'NAM-07',
    catSlug: 'nam-hoodie',
    name: 'Áo Hoodie Xám AURA',
    desc: 'Hoodie xám tiêu tối giản, lớp nỉ mềm giữ ấm tốt.',
    price: 459000,
    supportPrint: 1,
    featured: 0,
    img: '/img/nam/hodiexam.jpg',
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: ['#71717A', '#000000'],
  },
  // NAM -> Áo khoác
  {
    code: 'NAM-08',
    catSlug: 'nam-ao-khoac',
    name: 'Áo Gió Thể Thao AURA',
    desc: 'Áo gió cản gió nhẹ, chống thấm sương, thiết kế khóa kéo gọn gàng.',
    price: 549000,
    supportPrint: 0,
    featured: 0,
    img: '/img/nam/aogio.jpg',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#000000', '#71717A'],
  },
  {
    code: 'NAM-09',
    catSlug: 'nam-ao-khoac',
    name: 'Áo Khoác Jacket AURA',
    desc: 'Jacket nam dáng ngắn thanh lịch, lót trong thoáng khí.',
    price: 599000,
    supportPrint: 0,
    featured: 1,
    img: '/img/nam/aokhoac.jpg',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#000000', '#71717A'],
  },
  {
    code: 'NAM-10',
    catSlug: 'nam-ao-khoac',
    name: 'Áo Khoác Jean Nam AURA',
    desc: 'Denim wash sắc nét, phom đứng khỏe khoắn dễ layering.',
    price: 690000,
    supportPrint: 0,
    featured: 0,
    img: '/img/nam/aokhoacjean.jpg',
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: ['#000000', '#71717A'],
  },
  // NỮ -> Áo thun & NỮ
  {
    code: 'NU-01',
    catSlug: 'nu-ao-thun',
    name: 'Áo Sơ Mi Peplum Trắng AURA',
    desc: 'Thiết kế chiết eo nhẹ thanh lịch, phù hợp công sở lẫn dạo phố.',
    price: 349000,
    supportPrint: 0,
    featured: 1,
    img: '/img/nu/01_ao_so_mi_peplum_trang.jpg',
    sizes: ['S', 'M', 'L'],
    colors: ['#FFFFFF', '#E4D8C9'],
  },
  {
    code: 'NU-02',
    catSlug: 'nu-ao-thun',
    name: 'Áo Thun Nữ Form Ôm Đen',
    desc: 'Chất thun co giãn 4 chiều mềm mịn, tôn dáng tối giản.',
    price: 279000,
    supportPrint: 1,
    featured: 1,
    img: '/img/nu/02_ao_thun_den.jpg',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#000000', '#FFFFFF', '#71717A'],
  },
  {
    code: 'NU-03',
    catSlug: 'nu-ao-khoac',
    name: 'Áo Khoác Cardigan Cream AURA',
    desc: 'Cardigan len dệt mịn tông màu kem trang nhã, dễ phối với đầm và áo thun.',
    price: 449000,
    supportPrint: 0,
    featured: 0,
    img: '/img/nu/03_cardigan_cream.jpg',
    sizes: ['S', 'M', 'L'],
    colors: ['#FFFFFF', '#E4D8C9'],
  },
  {
    code: 'NU-04',
    catSlug: 'nu-ao-thun',
    name: 'Áo Lệch Vai Tối Giản AURA',
    desc: 'Phom áo lệch vai tinh tế, tôn bờ vai thanh mảnh theo phong cách tối giản.',
    price: 389000,
    supportPrint: 0,
    featured: 0,
    img: '/img/nu/04_ao_lech_vai.jpg',
    sizes: ['S', 'M', 'L'],
    colors: ['#000000', '#FFFFFF'],
  },
  {
    code: 'NU-05',
    catSlug: 'nu-ao-thun',
    name: 'Váy Ngắn Đen AURA Dress',
    desc: 'Đầm đen tối giản đường cắt A-line thanh lịch.',
    price: 499000,
    supportPrint: 0,
    featured: 1,
    img: '/img/nu/05_vay_den.jpg',
    sizes: ['S', 'M', 'L'],
    colors: ['#000000', '#6B3E3E'],
  },
  {
    code: 'NU-06',
    catSlug: 'nu-hoodie',
    name: 'Áo Hoodie Xám Nữ AURA',
    desc: 'Hoodie nỉ mềm phom vừa vặn cho nữ, tông xám trung tính.',
    price: 459000,
    supportPrint: 1,
    featured: 0,
    img: '/img/nu/06_hoodie_xam.jpg',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#71717A', '#000000'],
  },
  {
    code: 'NU-07',
    catSlug: 'nu-ao-khoac',
    name: 'Áo Khoác Đen Dáng Ngắn',
    desc: 'Áo khoác cropped hiện đại, chất vải đứng phom giữ dáng tốt.',
    price: 690000,
    supportPrint: 0,
    featured: 0,
    img: '/img/nu/07_ao_khoac_den.jpg',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#000000', '#71717A'],
  },
  {
    code: 'NU-08',
    catSlug: 'nu-ao-thun',
    name: 'Áo Sơ Mi Nơ Thanh Lịch',
    desc: 'Sơ mi cổ nơ mềm mại, chất liệu rủ nhẹ phù hợp mọi dịp.',
    price: 420000,
    supportPrint: 0,
    featured: 0,
    img: '/img/nu/08_ao_so_mi_no.jpg',
    sizes: ['S', 'M', 'L'],
    colors: ['#FFFFFF', '#E4D8C9'],
  },
  // PHỤ KIỆN (1 cấp - gắn thẳng vào Phụ kiện)
  {
    code: 'PK-01',
    catSlug: 'phu-kien',
    name: 'Túi Hobo Đen AURA',
    desc: 'Túi đeo vai dáng hobo da tổng hợp mịn, ngăn rộng tiện dụng.',
    price: 449000,
    supportPrint: 0,
    featured: 1,
    img: '/img/phu-kien/11_tui_hobo_den.jpg',
    sizes: ['Freesize'],
    colors: ['#000000', '#71717A'],
  },
  {
    code: 'PK-02',
    catSlug: 'phu-kien',
    name: 'Túi Tote Cream AURA',
    desc: 'Túi tote canvas dày dặn tông kem tự nhiên, đựng vừa laptop 14 inch.',
    price: 399000,
    supportPrint: 0,
    featured: 0,
    img: '/img/phu-kien/12_tui_tote_cream.jpg',
    sizes: ['Freesize'],
    colors: ['#FFFFFF', '#E4D8C9'],
  },
  {
    code: 'PK-03',
    catSlug: 'phu-kien',
    name: 'Mũ Lưỡi Trai AURA',
    desc: 'Nón lưỡi trai cotton twill thêu logo tối giản, khóa chỉnh kích thước phía sau.',
    price: 249000,
    supportPrint: 0,
    featured: 0,
    img: '/img/phu-kien/13_mu_luoi_trai.jpg',
    sizes: ['Freesize'],
    colors: ['#000000', '#FFFFFF', '#71717A'],
  },
  {
    code: 'PK-04',
    catSlug: 'phu-kien',
    name: 'Kính Mát Đen AURA Style',
    desc: 'Kính râm gọng acetate đen bóng, tròng chống tia UV400.',
    price: 299000,
    supportPrint: 0,
    featured: 0,
    img: '/img/phu-kien/14_kinh_mat_den.jpg',
    sizes: ['Freesize'],
    colors: ['#000000'],
  },
  {
    code: 'PK-05',
    catSlug: 'phu-kien',
    name: 'Dây Chuyền Bạc AURA',
    desc: 'Dây chuyền hợp kim mạ bạc dáng mảnh tối giản, không gỉ.',
    price: 349000,
    supportPrint: 0,
    featured: 0,
    img: '/img/phu-kien/15_day_chuyen_bac.jpg',
    sizes: ['Freesize'],
    colors: ['#71717A'],
  },
];

async function ensureCategorySchema(conn = pool) {
  const [cols] = await conn.query('SHOW COLUMNS FROM danhmuc');
  const colNames = new Set(cols.map((c) => c.Field));

  if (!colNames.has('MaDanhMucCha')) {
    await conn.query(
      'ALTER TABLE danhmuc ADD COLUMN MaDanhMucCha INT NULL DEFAULT NULL AFTER MaDanhMuc'
    );
  }
  if (!colNames.has('Slug')) {
    await conn.query(
      'ALTER TABLE danhmuc ADD COLUMN Slug VARCHAR(120) NULL AFTER TenDanhMuc'
    );
  }
  if (!colNames.has('ThuTu')) {
    await conn.query(
      'ALTER TABLE danhmuc ADD COLUMN ThuTu INT NOT NULL DEFAULT 0 AFTER MoTa'
    );
  }
  if (!colNames.has('AnhDaiDien')) {
    await conn.query(
      'ALTER TABLE danhmuc ADD COLUMN AnhDaiDien VARCHAR(300) NULL DEFAULT NULL AFTER MoTa'
    );
  }

  // Bỏ unique index cũ trên TenDanhMuc để cho phép "Áo thun" xuất hiện dưới cả Nam & Nữ
  const [indexes] = await conn.query('SHOW INDEX FROM danhmuc');
  const indexNames = new Set(indexes.map((i) => i.Key_name));

  if (indexNames.has('TenDanhMuc')) {
    await conn.query('ALTER TABLE danhmuc DROP INDEX TenDanhMuc');
  }

  // Điền slug còn thiếu trước khi tạo unique index trên Slug
  const [existingRows] = await conn.query(
    'SELECT MaDanhMuc, MaDanhMucCha, TenDanhMuc, Slug FROM danhmuc ORDER BY MaDanhMuc ASC'
  );
  const usedSlugs = new Set();
  for (const r of existingRows) {
    let s = (r.Slug || toSlug(r.TenDanhMuc) || `danh-muc-${r.MaDanhMuc}`).trim();
    if (usedSlugs.has(s)) {
      s = `${s}-${r.MaDanhMuc}`;
    }
    usedSlugs.add(s);
    if (r.Slug !== s) {
      await conn.query('UPDATE danhmuc SET Slug = ? WHERE MaDanhMuc = ?', [
        s,
        r.MaDanhMuc,
      ]);
    }
  }

  await conn.query('ALTER TABLE danhmuc MODIFY COLUMN Slug VARCHAR(120) NOT NULL');

  if (!indexNames.has('uq_danhmuc_slug')) {
    await conn.query('ALTER TABLE danhmuc ADD UNIQUE KEY uq_danhmuc_slug (Slug)');
  }
  if (!indexNames.has('idx_danhmuc_cha')) {
    await conn.query('ALTER TABLE danhmuc ADD INDEX idx_danhmuc_cha (MaDanhMucCha)');
  }
}

function classifyLegacyProductTarget(prod, oldCatName = '') {
  const catLower = (oldCatName || '').toLowerCase();
  const prodLower = (prod.TenSanPham || '').toLowerCase();

  if (
    catLower.includes('phụ kiện') ||
    catLower.includes('túi') ||
    catLower.includes('mũ') ||
    catLower.includes('kính') ||
    catLower.includes('trang sức') ||
    catLower.includes('balo') ||
    prodLower.includes('túi') ||
    prodLower.includes('mũ') ||
    prodLower.includes('kính') ||
    prodLower.includes('dây chuyền')
  ) {
    return 'phu-kien';
  }

  const isNu =
    catLower.includes('nữ') ||
    prodLower.includes('nữ') ||
    prodLower.includes('peplum') ||
    prodLower.includes('cardigan') ||
    prodLower.includes('lệch vai') ||
    prodLower.includes('váy');

  if (isNu) {
    if (prodLower.includes('hoodie')) return 'nu-hoodie';
    if (prodLower.includes('áo khoác') && !prodLower.includes('cardigan')) return 'nu-ao-khoac';
    if (prodLower.includes('áo thun') || prodLower.includes('sơ mi') || prodLower.includes('polo')) {
      return 'nu-ao-thun';
    }
    return 'nu';
  }

  if (prodLower.includes('hoodie')) return 'nam-hoodie';
  if (prodLower.includes('áo khoác') || prodLower.includes('áo gió')) return 'nam-ao-khoac';
  return 'nam-ao-thun';
}

async function seedCategoriesAndProducts() {
  const conn = await pool.getConnection();
  try {
    await ensureCategorySchema(conn);
    await conn.beginTransaction();

    // 1. Tạo/cập nhật cây danh mục chuẩn theo Slug
    const slugToId = {};

    for (const root of DEFAULT_CATEGORY_TREE) {
      const [existingRoot] = await conn.query(
        'SELECT MaDanhMuc FROM danhmuc WHERE Slug = ? LIMIT 1',
        [root.slug]
      );
      let rootId;
      if (existingRoot.length > 0) {
        rootId = existingRoot[0].MaDanhMuc;
        await conn.query(
          `UPDATE danhmuc
           SET MaDanhMucCha = NULL, TenDanhMuc = ?, MoTa = ?, AnhDaiDien = COALESCE(AnhDaiDien, ?), ThuTu = ?, HienThi = 1
           WHERE MaDanhMuc = ?`,
          [root.tenDanhMuc, root.moTa, root.anhDaiDien || null, root.thuTu, rootId]
        );
      } else {
        const [ins] = await conn.query(
          `INSERT INTO danhmuc (MaDanhMucCha, TenDanhMuc, Slug, MoTa, AnhDaiDien, ThuTu, HienThi)
           VALUES (NULL, ?, ?, ?, ?, ?, 1)`,
          [root.tenDanhMuc, root.slug, root.moTa, root.anhDaiDien || null, root.thuTu]
        );
        rootId = ins.insertId;
      }
      slugToId[root.slug] = rootId;

      for (const child of root.children) {
        const [existingChild] = await conn.query(
          'SELECT MaDanhMuc FROM danhmuc WHERE Slug = ? LIMIT 1',
          [child.slug]
        );
        let childId;
        if (existingChild.length > 0) {
          childId = existingChild[0].MaDanhMuc;
          await conn.query(
            `UPDATE danhmuc
             SET MaDanhMucCha = ?, TenDanhMuc = ?, MoTa = ?, ThuTu = ?, HienThi = 1
             WHERE MaDanhMuc = ?`,
            [rootId, child.tenDanhMuc, child.moTa, child.thuTu, childId]
          );
        } else {
          const [ins] = await conn.query(
            `INSERT INTO danhmuc (MaDanhMucCha, TenDanhMuc, Slug, MoTa, ThuTu, HienThi)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [rootId, child.tenDanhMuc, child.slug, child.moTa, child.thuTu]
          );
          childId = ins.insertId;
        }
        slugToId[child.slug] = childId;
      }
    }

    // 2. Chuyển toàn bộ sản phẩm cũ (nếu có) sang danh mục chuẩn mới để không mất dữ liệu
    const validSlugs = Object.keys(slugToId);
    const validIdSet = new Set(Object.values(slugToId));

    const [existingProducts] = await conn.query(
      `SELECT sp.MaSanPham, sp.MaDanhMuc, sp.TenSanPham, dm.TenDanhMuc
       FROM sanpham sp
       LEFT JOIN danhmuc dm ON dm.MaDanhMuc = sp.MaDanhMuc`
    );

    for (const p of existingProducts) {
      if (!validIdSet.has(Number(p.MaDanhMuc))) {
        const targetSlug = classifyLegacyProductTarget(p, p.TenDanhMuc);
        const targetCatId = slugToId[targetSlug] || slugToId['nam-ao-thun'];
        await conn.query('UPDATE sanpham SET MaDanhMuc = ? WHERE MaSanPham = ?', [
          targetCatId,
          p.MaSanPham,
        ]);
      } else if (p.MaSanPham === 2 && Number(p.MaDanhMuc) === slugToId['nam-ao-thun']) {
        // SP-002 là Áo Hoodie Form Rộng -> đặt đúng về Nam > Hoodie
        await conn.query('UPDATE sanpham SET MaDanhMuc = ? WHERE MaSanPham = ?', [
          slugToId['nam-hoodie'],
          p.MaSanPham,
        ]);
      }
    }

    // Đảm bảo SP-001, SP-002, SP-003 gắn đúng danh mục
    await conn.query(
      `UPDATE sanpham SET MaDanhMuc = ? WHERE MaHienThi IN ('SP-001', 'SP-003')`,
      [slugToId['nam-ao-thun']]
    );
    await conn.query(
      `UPDATE sanpham SET MaDanhMuc = ? WHERE MaHienThi = 'SP-002'`,
      [slugToId['nam-hoodie']]
    );

    // 3. Xóa các danh mục cũ không nằm trong cây mới
    const placeholders = validSlugs.map(() => '?').join(',');
    await conn.query(
      `DELETE FROM danhmuc WHERE Slug NOT IN (${placeholders})`,
      validSlugs
    );

    // 4. Đảm bảo bảng KichThuoc & MauSac đủ giá trị chuẩn (bao gồm Freesize & #6B3E3E)
    await conn.query(
      `INSERT INTO kichthuoc (MaKichThuoc, TenKichThuoc, ThuTu)
       VALUES (6, 'Freesize', 6)
       ON DUPLICATE KEY UPDATE TenKichThuoc = VALUES(TenKichThuoc), ThuTu = VALUES(ThuTu)`
    );
    await conn.query(
      `INSERT INTO mausac (MaMauSac, TenMau, MaHex)
       VALUES (6, 'Nâu Đỏ', '#6B3E3E')
       ON DUPLICATE KEY UPDATE TenMau = VALUES(TenMau), MaHex = VALUES(MaHex)`
    );

    const [sizeRows] = await conn.query('SELECT MaKichThuoc, TenKichThuoc FROM kichthuoc');
    const sizeMap = new Map(sizeRows.map((s) => [s.TenKichThuoc, s.MaKichThuoc]));
    const [colorRows] = await conn.query('SELECT MaMauSac, MaHex FROM mausac');
    const colorMap = new Map(colorRows.map((c) => [c.MaHex.toUpperCase(), c.MaMauSac]));

    // 5. Nạp 23 sản phẩm cửa hàng vào SanPham + AnhSanPham + BienTheSanPham
    for (const item of STOREFRONT_PRODUCTS) {
      const catId = slugToId[item.catSlug];
      if (!catId) continue;

      const [existingProd] = await conn.query(
        'SELECT MaSanPham FROM sanpham WHERE MaHienThi = ? LIMIT 1',
        [item.code]
      );

      let prodId;
      if (existingProd.length > 0) {
        prodId = existingProd[0].MaSanPham;
        await conn.query(
          `UPDATE sanpham
           SET MaDanhMuc = ?, TenSanPham = ?, MoTa = ?, GiaBan = ?, HoTroIn = ?, NoiBat = ?, DangKinhDoanh = 1
           WHERE MaSanPham = ?`,
          [catId, item.name, item.desc, item.price, item.supportPrint, item.featured, prodId]
        );
      } else {
        const [ins] = await conn.query(
          `INSERT INTO sanpham (MaDanhMuc, MaHienThi, TenSanPham, MoTa, GiaBan, HoTroIn, NoiBat, DangKinhDoanh)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [catId, item.code, item.name, item.desc, item.price, item.supportPrint, item.featured]
        );
        prodId = ins.insertId;
      }

      const [existingImg] = await conn.query(
        'SELECT MaAnh FROM anhsanpham WHERE MaSanPham = ? AND ThuTu = 1 LIMIT 1',
        [prodId]
      );
      if (existingImg.length > 0) {
        await conn.query('UPDATE anhsanpham SET DuongDan = ? WHERE MaAnh = ?', [
          item.img,
          existingImg[0].MaAnh,
        ]);
      } else {
        await conn.query(
          'INSERT INTO anhsanpham (MaSanPham, DuongDan, ThuTu) VALUES (?, ?, 1)',
          [prodId, item.img]
        );
      }

      for (const szName of item.sizes) {
        const sizeId = sizeMap.get(szName);
        if (!sizeId) continue;
        for (const hex of item.colors) {
          const colorId = colorMap.get(hex.toUpperCase());
          if (!colorId) continue;
          const sku = `${item.code}-${szName.toUpperCase()}-C${colorId}`;
          const [existingVar] = await conn.query(
            'SELECT MaBienThe FROM bienthesanpham WHERE SKU = ? LIMIT 1',
            [sku]
          );
          if (existingVar.length === 0) {
            await conn.query(
              `INSERT INTO bienthesanpham (MaSanPham, MaKichThuoc, MaMauSac, SKU, SoLuongTon, DangKinhDoanh)
               VALUES (?, ?, ?, ?, 25, 1)`,
              [prodId, sizeId, colorId, sku]
            );
          }
        }
      }
    }

    await conn.commit();
    return slugToId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

if (require.main === module) {
  seedCategoriesAndProducts()
    .then((slugToId) => {
      console.log('Seed danh mục cây & sản phẩm thành công:', slugToId);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Lỗi seed danh mục:', err);
      process.exit(1);
    });
}

module.exports = {
  DEFAULT_CATEGORY_TREE,
  ensureCategorySchema,
  seedCategoriesAndProducts,
};
