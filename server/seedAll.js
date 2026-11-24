const pool = require('./db');
const bcrypt = require('bcryptjs');

async function seedAll() {
  const conn = await pool.getConnection();
  try {
    console.log('🚀 Bắt đầu quá trình nạp dữ liệu mẫu toàn diện (seedAll)...');
    await conn.beginTransaction();

    // 1. KÍCH THƯỚC (kichthuoc)
    console.log('1. Đang nạp Kích Thước (S -> XXL)...');
    const sizes = [
      { id: 1, name: 'S', order: 1 },
      { id: 2, name: 'M', order: 2 },
      { id: 3, name: 'L', order: 3 },
      { id: 4, name: 'XL', order: 4 },
      { id: 5, name: 'XXL', order: 5 },
    ];
    for (const s of sizes) {
      await conn.query(
        `INSERT INTO kichthuoc (MaKichThuoc, TenKichThuoc, ThuTu)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE TenKichThuoc = VALUES(TenKichThuoc), ThuTu = VALUES(ThuTu)`,
        [s.id, s.name, s.order]
      );
    }

    // 2. MÀU SẮC (mausac)
    console.log('2. Đang nạp Màu Sắc chuẩn Design System...');
    const colors = [
      { id: 1, name: 'Đen Basic', hex: '#000000' },
      { id: 2, name: 'Trắng Tinh Khôi', hex: '#FFFFFF' },
      { id: 3, name: 'Xám Tiêu', hex: '#71717A' },
      { id: 4, name: 'Be Trầm', hex: '#E4D8C9' },
      { id: 5, name: 'Xanh Navy', hex: '#1E293B' },
    ];
    for (const c of colors) {
      await conn.query(
        `INSERT INTO mausac (MaMauSac, TenMau, MaHex)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE TenMau = VALUES(TenMau), MaHex = VALUES(MaHex)`,
        [c.id, c.name, c.hex]
      );
    }

    // 3. VỊ TRÍ IN (vitriin)
    console.log('3. Đang nạp Vị Trí In...');
    const printLocations = [
      { id: 1, code: 'MAU_LON', name: 'A3 Front / Back Print', type: 'MAU_LON' },
      { id: 2, code: 'NGUC_TRAI', name: 'Ngực trái áo', type: 'LOGO' },
      { id: 3, code: 'TAY_AO', name: 'Tay áo', type: 'LOGO' },
      { id: 4, code: 'GAY_CO', name: 'Gáy cổ sau', type: 'LOGO' },
    ];
    for (const pl of printLocations) {
      await conn.query(
        `INSERT INTO vitriin (MaViTriIn, MaViTri, TenViTri, LoaiMau)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE TenViTri = VALUES(TenViTri), LoaiMau = VALUES(LoaiMau)`,
        [pl.id, pl.code, pl.name, pl.type]
      );
    }

    // 4. DANH MỤC (danhmuc)
    console.log('4. Đang nạp Danh Mục sản phẩm...');
    const categories = [
      { id: 1, name: 'Áo thun', desc: 'Áo thun cotton dệt compact cao cấp hỗ trợ in DTG', show: 1 },
      { id: 2, name: 'Áo hoodie', desc: 'Áo hoodie nỉ bông 380gsm form rộng hiện đại', show: 1 },
      { id: 3, name: 'Phụ kiện', desc: 'Túi tote canvas, nón và phụ kiện cá nhân hóa', show: 1 },
    ];
    for (const cat of categories) {
      await conn.query(
        `INSERT INTO danhmuc (MaDanhMuc, TenDanhMuc, MoTa, HienThi)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE MoTa = VALUES(MoTa), HienThi = VALUES(HienThi)`,
        [cat.id, cat.name, cat.desc, cat.show]
      );
    }

    // 5. TÀI KHOẢN (taikhoan) - Admin & Khách test
    console.log('5. Đang nạp Tài Khoản và băm bcrypt mật khẩu...');
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin123', salt);
    const userPass = await bcrypt.hash('123456', salt);

    const accounts = [
      {
        id: 1,
        name: 'Quản trị viên',
        email: 'aura.admin@aura-studio.vn',
        phone: '0900000001',
        pass: adminPass,
        role: 'QUAN_TRI',
        locked: 0,
      },
      {
        id: 2,
        name: 'Nguyễn Hoàng Sơn',
        email: 'son.nh@gmail.com',
        phone: '0918.420.899',
        pass: userPass,
        role: 'KHACH_HANG',
        locked: 0,
      },
      {
        id: 3,
        name: 'Trần Thị Minh Trang',
        email: 'trang.ttm@gmail.com',
        phone: '0903.112.554',
        pass: userPass,
        role: 'KHACH_HANG',
        locked: 0,
      },
      {
        id: 4,
        name: 'Lê Văn Khóa',
        email: 'khoa.lv@gmail.com',
        phone: '0988.777.666',
        pass: userPass,
        role: 'KHACH_HANG',
        locked: 1, // Tài khoản bị khóa để test Screen 4 biến thể 2
      },
    ];

    for (const acc of accounts) {
      await conn.query(
        `INSERT INTO taikhoan (MaTaiKhoan, HoTen, Email, SoDienThoai, MatKhauBam, VaiTro, BiKhoa)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            HoTen = VALUES(HoTen),
            SoDienThoai = VALUES(SoDienThoai),
            MatKhauBam = VALUES(MatKhauBam),
            VaiTro = VALUES(VaiTro),
            BiKhoa = VALUES(BiKhoa)`,
        [acc.id, acc.name, acc.email, acc.phone, acc.pass, acc.role, acc.locked]
      );
    }

    // 6. SẢN PHẨM (sanpham)
    console.log('6. Đang nạp Sản Phẩm mẫu...');
    const products = [
      {
        id: 1,
        catId: 1,
        code: 'SP-001',
        name: 'Áo Thun Basic Aura',
        desc: 'Áo thun 100% Cotton Compact 250gsm dệt sợi đôi, cổ bo gân giữ form hoàn hảo. Hỗ trợ in DTG không phai màu.',
        price: 320000,
        supportPrint: 1,
        featured: 1,
        active: 1,
      },
      {
        id: 2,
        catId: 2,
        code: 'SP-002',
        name: 'Áo Hoodie Form Rộng',
        desc: 'Áo hoodie nỉ bông 380gsm dày dặn, mũ 2 lớp đứng form, túi kangaroo tiện lợi.',
        price: 680000,
        supportPrint: 1,
        featured: 1,
        active: 1,
      },
      {
        id: 3,
        catId: 1,
        code: 'SP-003',
        name: 'Áo Thun Regular Fit Lookbook',
        desc: 'Dáng áo suông vừa vặn chuẩn phong cách Minimalist Brutalism Xuân Hè 2025.',
        price: 350000,
        supportPrint: 1,
        featured: 0,
        active: 1,
      },
    ];

    for (const p of products) {
      await conn.query(
        `INSERT INTO sanpham (MaSanPham, MaDanhMuc, MaHienThi, TenSanPham, MoTa, GiaBan, HoTroIn, NoiBat, DangKinhDoanh)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            TenSanPham = VALUES(TenSanPham),
            MoTa = VALUES(MoTa),
            GiaBan = VALUES(GiaBan),
            HoTroIn = VALUES(HoTroIn),
            NoiBat = VALUES(NoiBat),
            DangKinhDoanh = VALUES(DangKinhDoanh)`,
        [p.id, p.catId, p.code, p.name, p.desc, p.price, p.supportPrint, p.featured, p.active]
      );
    }

    // 7. ẢNH SẢN PHẨM (anhsanpham)
    console.log('7. Đang nạp Ảnh Sản Phẩm phôi...');
    const productImages = [
      { prodId: 1, url: '/img/sp1.png', order: 1 },
      { prodId: 2, url: '/img/sp2.png', order: 1 },
      { prodId: 3, url: '/img/sp3.png', order: 1 },
    ];
    for (const img of productImages) {
      await conn.query(
        `INSERT INTO anhsanpham (MaSanPham, DuongDan, ThuTu)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE DuongDan = VALUES(DuongDan)`,
        [img.prodId, img.url, img.order]
      );
    }

    // 8. BIẾN THỂ SẢN PHẨM (bienthesanpham)
    console.log('8. Đang tạo Ma Trận Biến Thể Size x Màu x Tồn Kho...');
    const variants = [
      // SP-001: Áo Thun Basic (Đen: S, M, L, XL - Trắng: M, L, XL)
      { id: 1, prodId: 1, sizeId: 1, colorId: 1, sku: 'SP001-S-BLK', stock: 20 },
      { id: 2, prodId: 1, sizeId: 2, colorId: 1, sku: 'SP001-M-BLK', stock: 50 },
      { id: 3, prodId: 1, sizeId: 3, colorId: 1, sku: 'SP001-L-BLK', stock: 45 },
      { id: 4, prodId: 1, sizeId: 4, colorId: 1, sku: 'SP001-XL-BLK', stock: 30 },
      { id: 5, prodId: 1, sizeId: 2, colorId: 2, sku: 'SP001-M-WHT', stock: 40 },
      { id: 6, prodId: 1, sizeId: 3, colorId: 2, sku: 'SP001-L-WHT', stock: 35 },
      // SP-002: Áo Hoodie (Đen: L, XL - Xám: M, L)
      { id: 7, prodId: 2, sizeId: 3, colorId: 1, sku: 'SP002-L-BLK', stock: 25 },
      { id: 8, prodId: 2, sizeId: 4, colorId: 1, sku: 'SP002-XL-BLK', stock: 15 },
      { id: 9, prodId: 2, sizeId: 2, colorId: 3, sku: 'SP002-M-GRY', stock: 20 },
      { id: 10, prodId: 2, sizeId: 3, colorId: 3, sku: 'SP002-L-GRY', stock: 18 },
      // SP-003: Áo Thun Regular (Trắng: M, L - Be: M, L)
      { id: 11, prodId: 3, sizeId: 2, colorId: 2, sku: 'SP003-M-WHT', stock: 30 },
      { id: 12, prodId: 3, sizeId: 3, colorId: 2, sku: 'SP003-L-WHT', stock: 25 },
      { id: 13, prodId: 3, sizeId: 2, colorId: 4, sku: 'SP003-M-BEI', stock: 20 },
      { id: 14, prodId: 3, sizeId: 3, colorId: 4, sku: 'SP003-L-BEI', stock: 15 },
    ];

    for (const v of variants) {
      await conn.query(
        `INSERT INTO bienthesanpham (MaBienThe, MaSanPham, MaKichThuoc, MaMauSac, SKU, SoLuongTon, DangKinhDoanh)
         VALUES (?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
            SKU = VALUES(SKU),
            SoLuongTon = VALUES(SoLuongTon),
            DangKinhDoanh = 1`,
        [v.id, v.prodId, v.sizeId, v.colorId, v.sku, v.stock]
      );
    }

    // 9. CHI TIẾT ĐƠN HÀNG (chitietdonhang) & MẪU IN ĐƠN HÀNG (mauindonhang)
    console.log('9. Đang nạp Chi Tiết Đơn Hàng cho các đơn mẫu...');
    // Đơn 1: MaDonHang = 1 (#AURA-ORD-8821), TienHang = 1390000, PhiGiaoHang = 30000
    // Item 1: 2 cái SP-001 M Đen (320k * 2 = 640k)
    // Item 2: 1 cái SP-002 L Đen (750k * 1 = 750k) -> Tổng = 1390k
    await conn.query(
      `INSERT INTO chitietdonhang (MaDongDon, MaDonHang, MaBienThe, TenSanPhamLucMua, SKULucMua, KichThuocLucMua, MauSacLucMua, DonGia, SoLuong)
       VALUES
       (1, 1, 2, 'Áo Thun Basic Aura', 'SP001-M-BLK', 'M', 'Đen Basic', 320000, 2),
       (2, 1, 7, 'Áo Hoodie Form Rộng', 'SP002-L-BLK', 'L', 'Đen Basic', 750000, 1)
       ON DUPLICATE KEY UPDATE
          TenSanPhamLucMua = VALUES(TenSanPhamLucMua),
          DonGia = VALUES(DonGia),
          SoLuong = VALUES(SoLuong)`
    );

    // Mẫu in đơn hàng cho Đơn 1:
    // Item 1 in mẫu lớn A3 (MaMauIn = 11: Pop Art Sunglasses, MaViTriIn = 1)
    // Item 2 in Logo ngực trái (MaMauIn = 18: AURA Monogram AR, MaViTriIn = 2)
    await conn.query(
      `INSERT INTO mauindonhang (MaDongDon, MaViTriIn, MaMauIn)
       VALUES
       (1, 1, 11),
       (2, 2, 18)
       ON DUPLICATE KEY UPDATE MaMauIn = VALUES(MaMauIn)`
    );

    // Đơn 2: MaDonHang = 2 (#AURA-ORD-8820), TienHang = 650000, PhiGiaoHang = 30000
    // Item 3: 2 cái SP-001 M Trắng (325k * 2 = 650k)
    await conn.query(
      `INSERT INTO chitietdonhang (MaDongDon, MaDonHang, MaBienThe, TenSanPhamLucMua, SKULucMua, KichThuocLucMua, MauSacLucMua, DonGia, SoLuong)
       VALUES
       (3, 2, 5, 'Áo Thun Basic Aura', 'SP001-M-WHT', 'M', 'Trắng Tinh Khôi', 325000, 2)
       ON DUPLICATE KEY UPDATE
          TenSanPhamLucMua = VALUES(TenSanPhamLucMua),
          DonGia = VALUES(DonGia),
          SoLuong = VALUES(SoLuong)`
    );

    // Mẫu in đơn hàng cho Đơn 2:
    // Item 3 in mẫu A3 Front (MaMauIn = 14: CONTROL BEAR Chenille, MaViTriIn = 1)
    await conn.query(
      `INSERT INTO mauindonhang (MaDongDon, MaViTriIn, MaMauIn)
       VALUES
       (3, 1, 14)
       ON DUPLICATE KEY UPDATE MaMauIn = VALUES(MaMauIn)`
    );

    await conn.commit();
    console.log('✅ Nạp dữ liệu seed thành công 100%! Toàn bộ 15 bảng đã có dữ liệu.');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Lỗi nạp seed data:', err);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

seedAll();
