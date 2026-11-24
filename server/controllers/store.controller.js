const pool = require('../db');

// 1. Lấy danh sách sản phẩm hiển thị trên Storefront
async function getProducts(req, res) {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;
    const featured = req.query.featured === '1' || req.query.featured === 'true';

    const whereClauses = ['sp.DangKinhDoanh = 1'];
    const params = [];

    if (categoryId) {
      whereClauses.push('sp.MaDanhMuc = ?');
      params.push(categoryId);
    }

    if (featured) {
      whereClauses.push('sp.NoiBat = 1');
    }

    const whereSql = whereClauses.join(' AND ');

    const sql = `
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
        anh.DuongDan AS AnhDaiDien,
        COALESCE(bt.TongTonKho, 0) AS TongTonKho,
        COALESCE(bt.SoBienThe, 0) AS SoBienThe
      FROM SanPham sp
      LEFT JOIN DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
      LEFT JOIN (
        SELECT a1.MaSanPham, a1.DuongDan
        FROM AnhSanPham a1
        INNER JOIN (
          SELECT MaSanPham, MIN(ThuTu) AS MinThuTu
          FROM AnhSanPham
          GROUP BY MaSanPham
        ) a2 ON a1.MaSanPham = a2.MaSanPham AND a1.ThuTu = a2.MinThuTu
      ) anh ON anh.MaSanPham = sp.MaSanPham
      LEFT JOIN (
        SELECT MaSanPham, COUNT(*) AS SoBienThe, SUM(SoLuongTon) AS TongTonKho
        FROM BienTheSanPham
        WHERE DangKinhDoanh = 1
        GROUP BY MaSanPham
      ) bt ON bt.MaSanPham = sp.MaSanPham
      WHERE ${whereSql}
      ORDER BY sp.NoiBat DESC, sp.MaSanPham DESC
    `;

    const [products] = await pool.query(sql, params);

    res.json({
      success: true,
      data: products.map((p) => ({
        ...p,
        GiaBan: Number(p.GiaBan),
        TongTonKho: Number(p.TongTonKho),
        SoBienThe: Number(p.SoBienThe),
        HetHang: Number(p.TongTonKho) <= 0,
      })),
    });
  } catch (err) {
    console.error('[store.controller > getProducts]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách sản phẩm', error: err.message });
  }
}

// 2. Chi tiết 1 sản phẩm kèm ảnh, ma trận biến thể Size/Màu/Tồn kho & Mẫu in
async function getProductDetail(req, res) {
  try {
    const productId = Number(req.params.id);
    if (!productId || productId <= 0) {
      return res.status(400).json({ success: false, message: 'Mã sản phẩm không hợp lệ' });
    }

    // Thông tin sản phẩm
    const productSql = `
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
        sp.DangKinhDoanh
      FROM SanPham sp
      LEFT JOIN DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
      WHERE sp.MaSanPham = ? AND sp.DangKinhDoanh = 1
    `;
    const [[product]] = await pool.query(productSql, [productId]);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
    }

    // Danh sách ảnh sản phẩm
    const imagesSql = `
      SELECT MaAnh, DuongDan, ThuTu
      FROM AnhSanPham
      WHERE MaSanPham = ?
      ORDER BY ThuTu ASC
    `;
    const [images] = await pool.query(imagesSql, [productId]);

    // Danh sách biến thể (Size x Màu) kèm số lượng tồn kho
    const variantsSql = `
      SELECT
        bt.MaBienThe,
        bt.SKU,
        bt.SoLuongTon,
        bt.DangKinhDoanh,
        kt.MaKichThuoc,
        kt.TenKichThuoc,
        kt.ThuTu AS ThuTuSize,
        ms.MaMauSac,
        ms.TenMau,
        ms.MaHex
      FROM BienTheSanPham bt
      JOIN KichThuoc kt ON kt.MaKichThuoc = bt.MaKichThuoc
      JOIN MauSac ms ON ms.MaMauSac = bt.MaMauSac
      WHERE bt.MaSanPham = ? AND bt.DangKinhDoanh = 1
      ORDER BY kt.ThuTu ASC, ms.MaMauSac ASC
    `;
    const [variants] = await pool.query(variantsSql, [productId]);

    // Danh sách vị trí in
    const [printLocations] = await pool.query(
      'SELECT MaViTriIn, MaViTri, TenViTri, LoaiMau FROM ViTriIn ORDER BY MaViTriIn ASC'
    );

    // Danh sách mẫu in PNG trong suốt phục vụ bộ tùy biến
    const [printTemplates] = await pool.query(
      `SELECT MaMauIn, TenMauIn, DuongDanPNG, LoaiMau, NhanKieuIn, ViTriChoPhep, KichThuocPx
       FROM MauIn
       WHERE HienThi = 1
       ORDER BY MaMauIn DESC`
    );

    res.json({
      success: true,
      data: {
        ...product,
        GiaBan: Number(product.GiaBan),
        images,
        variants: variants.map((v) => ({
          ...v,
          SoLuongTon: Number(v.SoLuongTon),
        })),
        printLocations,
        printTemplates,
      },
    });
  } catch (err) {
    console.error('[store.controller > getProductDetail]', err);
    res.status(500).json({ success: false, message: 'Lỗi lấy chi tiết sản phẩm', error: err.message });
  }
}

// 3. Lấy kho mẫu in PNG công khai
async function getTemplates(req, res) {
  try {
    const type = req.query.type; // 'MAU_LON' | 'LOGO'
    let sql = 'SELECT * FROM MauIn WHERE HienThi = 1';
    const params = [];

    if (type) {
      sql += ' AND LoaiMau = ?';
      params.push(type);
    }
    sql += ' ORDER BY MaMauIn DESC';

    const [templates] = await pool.query(sql, params);
    res.json({ success: true, data: templates });
  } catch (err) {
    console.error('[store.controller > getTemplates]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách mẫu in', error: err.message });
  }
}

// 4. Lấy danh mục hiển thị
async function getCategories(req, res) {
  try {
    const sql = `
      SELECT
        dm.MaDanhMuc,
        dm.TenDanhMuc,
        dm.MoTa,
        COUNT(sp.MaSanPham) AS SoSanPham
      FROM DanhMuc dm
      LEFT JOIN SanPham sp ON sp.MaDanhMuc = dm.MaDanhMuc AND sp.DangKinhDoanh = 1
      WHERE dm.HienThi = 1
      GROUP BY dm.MaDanhMuc, dm.TenDanhMuc, dm.MoTa
      ORDER BY dm.MaDanhMuc ASC
    `;
    const [categories] = await pool.query(sql);
    res.json({ success: true, data: categories });
  } catch (err) {
    console.error('[store.controller > getCategories]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh mục', error: err.message });
  }
}

// 5. Đặt hàng Transaction ACID & Trừ tồn kho & Snapshot in ấn
async function createOrder(req, res) {
  const conn = await pool.getConnection();
  try {
    const {
      tenNguoiNhan,
      dienThoaiNhan,
      diaChiGiao,
      ghiChu,
      phuongThuc = 'COD',
      items = [],
    } = req.body;

    if (!tenNguoiNhan || !dienThoaiNhan || !diaChiGiao) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin giao nhận (Tên, SĐT, Địa chỉ)',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Giỏ hàng đang trống. Vui lòng chọn ít nhất 1 sản phẩm để đặt hàng.',
      });
    }

    const validMethods = ['COD', 'QR'];
    const chosenMethod = validMethods.includes(phuongThuc) ? phuongThuc : 'COD';

    // Xác định tài khoản đặt hàng (từ token nếu có hoặc tài khoản mặc định/guest)
    let accountId = req.user?.maTaiKhoan;
    if (!accountId) {
      const [[guest]] = await conn.query("SELECT MaTaiKhoan FROM TaiKhoan WHERE VaiTro = 'KHACH_HANG' AND BiKhoa = 0 LIMIT 1");
      accountId = guest ? guest.MaTaiKhoan : 2;
    } else {
      const [[user]] = await conn.query('SELECT BiKhoa FROM TaiKhoan WHERE MaTaiKhoan = ?', [accountId]);
      if (user && user.BiKhoa) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ care@aura.vn.',
          code: 'ACCOUNT_LOCKED',
        });
      }
    }

    await conn.beginTransaction();

    // 1. Gom nhóm tổng số lượng theo từng MaBienThe để kiểm tra tồn kho
    const requestedQuantities = new Map();
    for (const item of items) {
      const vId = Number(item.variantId);
      const qty = Math.max(1, Number(item.soLuong) || 1);
      if (!vId) continue;
      const current = requestedQuantities.get(vId) || 0;
      requestedQuantities.set(vId, current + qty);
    }

    // 2. Khóa dòng tồn kho SELECT ... FOR UPDATE và xác minh số lượng tồn
    for (const [vId, totalReqQty] of requestedQuantities.entries()) {
      const [[variant]] = await conn.query(
        `SELECT bt.MaBienThe, bt.SoLuongTon, bt.DangKinhDoanh, sp.TenSanPham, kt.TenKichThuoc, ms.TenMau
         FROM BienTheSanPham bt
         JOIN SanPham sp ON sp.MaSanPham = bt.MaSanPham
         JOIN KichThuoc kt ON kt.MaKichThuoc = bt.MaKichThuoc
         JOIN MauSac ms ON ms.MaMauSac = bt.MaMauSac
         WHERE bt.MaBienThe = ? FOR UPDATE`,
        [vId]
      );

      if (!variant) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Biến thể sản phẩm (mã #${vId}) không còn tồn tại trong hệ thống.`,
        });
      }

      if (!variant.DangKinhDoanh) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${variant.TenSanPham} - ${variant.TenMau} / Size ${variant.TenKichThuoc}" đã tạm ngưng kinh doanh.`,
        });
      }

      if (variant.SoLuongTon < totalReqQty) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Rất tiếc! Sản phẩm "${variant.TenSanPham} - ${variant.TenMau} / Size ${variant.TenKichThuoc}" chỉ còn ${variant.SoLuongTon} sản phẩm trong kho (Bạn yêu cầu: ${totalReqQty}). Vui lòng điều chỉnh số lượng.`,
          code: 'OUT_OF_STOCK',
        });
      }

      // Trừ tồn kho biến thể
      await conn.query(
        'UPDATE BienTheSanPham SET SoLuongTon = SoLuongTon - ? WHERE MaBienThe = ?',
        [totalReqQty, vId]
      );
    }

    // 3. Tính toán tiền hàng và phí vận chuyển
    let tienHang = 0;
    for (const item of items) {
      const price = Math.max(0, Number(item.donGia) || 0);
      const qty = Math.max(1, Number(item.soLuong) || 1);
      tienHang += price * qty;
    }

    const phiGiaoHang = tienHang >= 999000 ? 0 : 30000;
    const tongThanhToan = tienHang + phiGiaoHang;

    // Sinh mã hiển thị ngẫu nhiên duy nhất
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const maHienThi = `#AURA-ORD-${randomSuffix}`;
    const maYeuCau = `REQ-${Date.now()}-${randomSuffix}`;

    // 4. Tạo bản ghi DonHang
    const [orderResult] = await conn.query(
      `INSERT INTO DonHang (
        MaHienThi, MaTaiKhoan, MaYeuCau, TenNguoiNhan, DienThoaiNhan, DiaChiGiao, GhiChu,
        TienHang, PhiGiaoHang, PhuongThuc, TrangThaiThanhToan, TrangThai
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CHUA_THANH_TOAN', 'CHO_XAC_NHAN')`,
      [
        maHienThi,
        accountId,
        maYeuCau,
        tenNguoiNhan.trim(),
        dienThoaiNhan.trim(),
        diaChiGiao.trim(),
        ghiChu?.trim() || null,
        tienHang,
        phiGiaoHang,
        chosenMethod,
      ]
    );

    const orderId = orderResult.insertId;

    // 5. Thêm ChiTietDonHang & Snapshot MauInDonHang
    for (const item of items) {
      const vId = Number(item.variantId);
      const qty = Math.max(1, Number(item.soLuong) || 1);
      const price = Math.max(0, Number(item.donGia) || 0);

      const [itemResult] = await conn.query(
        `INSERT INTO ChiTietDonHang (
          MaDonHang, MaBienThe, TenSanPhamLucMua, SKULucMua, KichThuocLucMua, MauSacLucMua, DonGia, SoLuong
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          vId,
          item.tenSanPham || 'Áo thun AURA',
          item.sku || 'SKU-AURA',
          item.kichThuoc || 'M',
          item.mauSac || 'Đen',
          price,
          qty,
        ]
      );

      const dongDonId = itemResult.insertId;

      // Nếu có in ấn theo mẫu, lưu snapshot vào MauInDonHang
      if (item.hasPrint && item.printTemplateId && item.printLocationId) {
        await conn.query(
          `INSERT INTO MauInDonHang (MaDongDon, MaViTriIn, MaMauIn)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE MaMauIn = VALUES(MaMauIn)`,
          [dongDonId, Number(item.printLocationId), Number(item.printTemplateId)]
        );
      }
    }

    await conn.commit();

    // Dữ liệu chuyển khoản VietQR nếu chọn QR
    const vietqrData =
      chosenMethod === 'QR'
        ? {
            bankId: 'MB',
            bankName: 'MBBank (Ngân hàng Quân Đội)',
            accountNo: '0900000001',
            accountName: 'AURA STUDIO',
            amount: tongThanhToan,
            description: maHienThi,
            qrImageUrl: `https://img.vietqr.io/image/MB-0900000001-compact2.png?amount=${tongThanhToan}&addInfo=${encodeURIComponent(maHienThi)}&accountName=AURA%20STUDIO`,
          }
        : null;

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công!',
      data: {
        orderId,
        maHienThi,
        tenNguoiNhan,
        dienThoaiNhan,
        diaChiGiao,
        phuongThuc: chosenMethod,
        tienHang,
        phiGiaoHang,
        tongThanhToan,
        vietqr: vietqrData,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('[store.controller > createOrder]', err);
    res.status(500).json({ success: false, message: 'Lỗi xử lý đặt hàng: ' + err.message });
  } finally {
    conn.release();
  }
}

// 6. Lấy danh sách đơn hàng của khách hàng đang đăng nhập (Screens 15-18 Figma)
async function getMyOrders(req, res) {
  try {
    const accountId = req.user?.maTaiKhoan || req.user?.MaTaiKhoan || req.user?.id;
    if (!accountId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }

    const { status } = req.query;
    const whereClauses = ['dh.MaTaiKhoan = ?'];
    const params = [accountId];

    if (status && status !== 'ALL' && status !== 'TAT_CA') {
      whereClauses.push('dh.TrangThai = ?');
      params.push(status);
    }

    const whereSql = whereClauses.join(' AND ');

    const orderSql = `
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
        (dh.TienHang + dh.PhiGiaoHang) AS TongTien,
        dh.PhuongThuc,
        dh.TrangThaiThanhToan,
        dh.TrangThai,
        dh.NgayDat
      FROM DonHang dh
      WHERE ${whereSql}
      ORDER BY dh.NgayDat DESC
    `;

    const [orders] = await pool.query(orderSql, params);

    if (orders.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const orderIds = orders.map((o) => o.MaDonHang);

    // Lấy chi tiết các món trong đơn hàng kèm thông tin phôi in
    const itemsSql = `
      SELECT
        ct.MaDongDon,
        ct.MaDonHang,
        ct.MaBienThe,
        ct.TenSanPhamLucMua,
        ct.SKULucMua,
        ct.KichThuocLucMua,
        ct.MauSacLucMua,
        ct.DonGia,
        ct.SoLuong,
        ct.ThanhTien,
        ms.MaHex AS MaMauHex,
        COALESCE(anh.DuongDan, '/img/sp1.png') AS AnhSanPham,
        m.MaMauIn,
        m.TenMauIn,
        m.DuongDanPNG AS DuongDanMauIn,
        vt.MaViTriIn,
        vt.TenViTri
      FROM ChiTietDonHang ct
      LEFT JOIN BienTheSanPham bt ON bt.MaBienThe = ct.MaBienThe
      LEFT JOIN MauSac ms ON ms.MaMauSac = bt.MaMauSac
      LEFT JOIN (
        SELECT a1.MaSanPham, a1.DuongDan
        FROM AnhSanPham a1
        INNER JOIN (
          SELECT MaSanPham, MIN(ThuTu) AS MinThuTu
          FROM AnhSanPham
          GROUP BY MaSanPham
        ) a2 ON a1.MaSanPham = a2.MaSanPham AND a1.ThuTu = a2.MinThuTu
      ) anh ON anh.MaSanPham = bt.MaSanPham
      LEFT JOIN MauInDonHang mi ON mi.MaDongDon = ct.MaDongDon
      LEFT JOIN MauIn m ON m.MaMauIn = mi.MaMauIn
      LEFT JOIN ViTriIn vt ON vt.MaViTriIn = mi.MaViTriIn
      WHERE ct.MaDonHang IN (?)
      ORDER BY ct.MaDongDon ASC
    `;

    const [items] = await pool.query(itemsSql, [orderIds]);

    // Gom items theo từng đơn hàng
    const itemsByOrder = {};
    for (const item of items) {
      if (!itemsByOrder[item.MaDonHang]) {
        itemsByOrder[item.MaDonHang] = [];
      }
      itemsByOrder[item.MaDonHang].push({
        maChiTiet: item.MaDongDon,
        maBienThe: item.MaBienThe,
        tenSanPham: item.TenSanPhamLucMua,
        sku: item.SKULucMua,
        kichThuoc: item.KichThuocLucMua,
        mauSac: item.MauSacLucMua,
        maMauHex: item.MaMauHex || '#000000',
        donGia: Number(item.DonGia),
        soLuong: Number(item.SoLuong),
        thanhTien: Number(item.ThanhTien),
        anhSanPham: item.AnhSanPham,
        hasPrint: Boolean(item.MaMauIn),
        printInfo: item.MaMauIn
          ? {
              maMauIn: item.MaMauIn,
              tenMauIn: item.TenMauIn,
              duongDanTep: item.DuongDanMauIn,
              tenViTri: item.TenViTri || 'Trước ngực',
            }
          : null,
      });
    }

    const result = orders.map((o) => ({
      maDonHang: o.MaDonHang,
      maHienThi: o.MaHienThi,
      tenNguoiNhan: o.TenNguoiNhan,
      dienThoaiNhan: o.DienThoaiNhan,
      diaChiGiao: o.DiaChiGiao,
      ghiChu: o.GhiChu,
      tienHang: Number(o.TienHang),
      phiGiaoHang: Number(o.PhiGiaoHang),
      tongTien: Number(o.TongTien),
      phuongThuc: o.PhuongThuc,
      trangThaiThanhToan: o.TrangThaiThanhToan,
      trangThai: o.TrangThai,
      ngayTao: o.NgayDat,
      canCancel: o.TrangThai === 'CHO_XAC_NHAN',
      items: itemsByOrder[o.MaDonHang] || [],
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[store.controller > getMyOrders]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách đơn hàng: ' + err.message });
  }
}

// 7. Lấy chi tiết 1 đơn hàng của khách hàng
async function getMyOrderDetail(req, res) {
  try {
    const accountId = req.user?.maTaiKhoan || req.user?.MaTaiKhoan || req.user?.id;
    const orderId = Number(req.params.id);

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Mã đơn hàng không hợp lệ' });
    }

    const orderSql = `
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
        (dh.TienHang + dh.PhiGiaoHang) AS TongTien,
        dh.PhuongThuc,
        dh.TrangThaiThanhToan,
        dh.TrangThai,
        dh.NgayDat
      FROM DonHang dh
      WHERE dh.MaDonHang = ? AND dh.MaTaiKhoan = ?
      LIMIT 1
    `;

    const [[order]] = await pool.query(orderSql, [orderId, accountId]);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    // Lấy danh sách mặt hàng
    const itemsSql = `
      SELECT
        ct.MaDongDon,
        ct.MaDonHang,
        ct.MaBienThe,
        ct.TenSanPhamLucMua,
        ct.SKULucMua,
        ct.KichThuocLucMua,
        ct.MauSacLucMua,
        ct.DonGia,
        ct.SoLuong,
        ct.ThanhTien,
        ms.MaHex AS MaMauHex,
        COALESCE(anh.DuongDan, '/img/sp1.png') AS AnhSanPham,
        m.MaMauIn,
        m.TenMauIn,
        m.DuongDanPNG AS DuongDanMauIn,
        vt.MaViTriIn,
        vt.TenViTri
      FROM ChiTietDonHang ct
      LEFT JOIN BienTheSanPham bt ON bt.MaBienThe = ct.MaBienThe
      LEFT JOIN MauSac ms ON ms.MaMauSac = bt.MaMauSac
      LEFT JOIN (
        SELECT a1.MaSanPham, a1.DuongDan
        FROM AnhSanPham a1
        INNER JOIN (
          SELECT MaSanPham, MIN(ThuTu) AS MinThuTu
          FROM AnhSanPham
          GROUP BY MaSanPham
        ) a2 ON a1.MaSanPham = a2.MaSanPham AND a1.ThuTu = a2.MinThuTu
      ) anh ON anh.MaSanPham = bt.MaSanPham
      LEFT JOIN MauInDonHang mi ON mi.MaDongDon = ct.MaDongDon
      LEFT JOIN MauIn m ON m.MaMauIn = mi.MaMauIn
      LEFT JOIN ViTriIn vt ON vt.MaViTriIn = mi.MaViTriIn
      WHERE ct.MaDonHang = ?
      ORDER BY ct.MaDongDon ASC
    `;

    const [items] = await pool.query(itemsSql, [orderId]);

    const formattedItems = items.map((item) => ({
      maChiTiet: item.MaDongDon,
      maBienThe: item.MaBienThe,
      tenSanPham: item.TenSanPhamLucMua,
      sku: item.SKULucMua,
      kichThuoc: item.KichThuocLucMua,
      mauSac: item.MauSacLucMua,
      maMauHex: item.MaMauHex || '#000000',
      donGia: Number(item.DonGia),
      soLuong: Number(item.SoLuong),
      thanhTien: Number(item.ThanhTien),
      anhSanPham: item.AnhSanPham,
      hasPrint: Boolean(item.MaMauIn),
      printInfo: item.MaMauIn
        ? {
            maMauIn: item.MaMauIn,
            tenMauIn: item.TenMauIn,
            duongDanTep: item.DuongDanMauIn,
            tenViTri: item.TenViTri || 'Trước ngực',
          }
        : null,
    }));

    res.json({
      success: true,
      data: {
        maDonHang: order.MaDonHang,
        maHienThi: order.MaHienThi,
        tenNguoiNhan: order.TenNguoiNhan,
        dienThoaiNhan: order.DienThoaiNhan,
        diaChiGiao: order.DiaChiGiao,
        ghiChu: order.GhiChu,
        tienHang: Number(order.TienHang),
        phiGiaoHang: Number(order.PhiGiaoHang),
        tongTien: Number(order.TongTien),
        phuongThuc: order.PhuongThuc,
        trangThaiThanhToan: order.TrangThaiThanhToan,
        trangThai: order.TrangThai,
        ngayTao: order.NgayDat,
        canCancel: order.TrangThai === 'CHO_XAC_NHAN',
        items: formattedItems,
      },
    });
  } catch (err) {
    console.error('[store.controller > getMyOrderDetail]', err);
    res.status(500).json({ success: false, message: 'Lỗi tải chi tiết đơn hàng: ' + err.message });
  }
}

// 8. Khách hàng hủy đơn hàng (Chỉ khi ở trạng thái Chờ xác nhận)
async function cancelMyOrder(req, res) {
  const accountId = req.user?.maTaiKhoan || req.user?.MaTaiKhoan || req.user?.id;
  const orderId = Number(req.params.id);

  if (!orderId) {
    return res.status(400).json({ success: false, message: 'Mã đơn hàng không hợp lệ' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query(
      'SELECT MaDonHang, MaHienThi, TrangThai, MaTaiKhoan FROM DonHang WHERE MaDonHang = ? AND MaTaiKhoan = ? FOR UPDATE',
      [orderId, accountId]
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }

    if (order.TrangThai !== 'CHO_XAC_NHAN') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể hủy đơn hàng khi đơn đang ở trạng thái Chờ xác nhận.',
      });
    }

    // Hoàn trả số lượng tồn kho cho từng biến thể
    const [items] = await conn.query(
      'SELECT MaBienThe, SoLuong FROM ChiTietDonHang WHERE MaDonHang = ?',
      [orderId]
    );

    for (const item of items) {
      if (item.MaBienThe) {
        await conn.query(
          'UPDATE BienTheSanPham SET SoLuongTon = SoLuongTon + ? WHERE MaBienThe = ?',
          [Number(item.SoLuong), Number(item.MaBienThe)]
        );
      }
    }

    // Cập nhật trạng thái hủy
    await conn.query('UPDATE DonHang SET TrangThai = "HUY" WHERE MaDonHang = ?', [orderId]);

    await conn.commit();

    res.json({
      success: true,
      message: `Đơn hàng ${order.MaHienThi} đã được hủy thành công. Số lượng sản phẩm đã được hoàn trả lại kho.`,
      data: { orderId, maHienThi: order.MaHienThi, trangThai: 'HUY' },
    });
  } catch (err) {
    await conn.rollback();
    console.error('[store.controller > cancelMyOrder]', err);
    res.status(500).json({ success: false, message: 'Lỗi khi hủy đơn hàng: ' + err.message });
  } finally {
    conn.release();
  }
}

module.exports = {
  getProducts,
  getProductDetail,
  getTemplates,
  getCategories,
  createOrder,
  getMyOrders,
  getMyOrderDetail,
  cancelMyOrder,
};

