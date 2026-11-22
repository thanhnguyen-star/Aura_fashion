const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./db');

// Trỏ sang thư mục Web_aura/public/img
const PUBLIC_IMG_DIR = path.join(__dirname, '..', 'Web_aura', 'public', 'img');

const FOLDERS = [
  {
    subDir: 'big',
    loaiMau: 'MAU_LON',
    nhanKieuIn: 'A3 FRONT',
    viTriChoPhep: ['A3 FRONT', 'BACK PRINT'],
    kichThuocPx: '2400 × 3000 px · 300 DPI',
  },
  {
    subDir: 'logo',
    loaiMau: 'LOGO',
    nhanKieuIn: 'NGỰC TRÁI',
    viTriChoPhep: ['Ngực trái', 'Tay áo trái', 'Gáy cổ sau'],
    kichThuocPx: '1000 × 1000 px · 300 DPI',
  },
];

const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function formatDisplayName(filename) {
  return path
    .parse(filename)
    .name.replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function seedTemplates() {
  try {
    let added = 0;
    let skipped = 0;

    for (const folder of FOLDERS) {
      const fullDir = path.join(PUBLIC_IMG_DIR, folder.subDir);
      if (!fs.existsSync(fullDir)) {
        console.log(`Bỏ qua (chưa tạo thư mục): ${fullDir}`);
        continue;
      }

      const files = fs.readdirSync(fullDir);

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!ALLOWED_EXT.has(ext)) continue;

        const dbPath = `/img/${folder.subDir}/${file}`;

        // Tránh chèn trùng khi chạy lại script nhiều lần
        const [[existing]] = await pool.query(
          `SELECT MaMauIn FROM MauIn WHERE DuongDanPNG = ? LIMIT 1`,
          [dbPath]
        );

        if (existing) {
          skipped += 1;
          continue;
        }

        const fileStat = fs.statSync(path.join(fullDir, file));
        const tenMauIn = formatDisplayName(file);

        await pool.query(
          `INSERT INTO MauIn
            (TenMauIn, DuongDanPNG, LoaiMau, HienThi, NhanKieuIn, ViTriChoPhep, KichThuocPx, DungLuongBytes)
           VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
          [
            tenMauIn,
            dbPath,
            folder.loaiMau,
            folder.nhanKieuIn,
            JSON.stringify(folder.viTriChoPhep),
            folder.kichThuocPx,
            fileStat.size,
          ]
        );

        console.log(`+ Đã thêm [${folder.loaiMau}]: ${tenMauIn} (${dbPath})`);
        added += 1;
      }
    }

    console.log(`\nHoàn tất: thêm mới ${added} mẫu, bỏ qua ${skipped} mẫu đã có.`);
  } catch (err) {
    console.error('Lỗi đồng bộ mẫu in:', err.message);
  } finally {
    await pool.end();
  }
}

seedTemplates();