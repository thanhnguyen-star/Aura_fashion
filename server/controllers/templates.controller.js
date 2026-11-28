const fs = require('fs');
const path = require('path');
const pool = require('../db');

function parsePositions(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function getPublicBaseUrl(req) {
    const fromEnv = (process.env.PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
    return fromEnv || `${req.protocol}://${req.get('host')}`;
}

function removeUploadedFile(file) {
    if (file?.path) fs.unlink(file.path, () => { });
}

// 1. Lấy danh sách mẫu in + thống kê KPI
async function getTemplates(req, res) {
    try {
        const type = req.query.type === 'LOGO' ? 'LOGO' : 'MAU_LON';
        const search = (req.query.search || '').trim().toLowerCase();
        const sort = req.query.sort || 'newest';

        const statsSql = `
      SELECT
        COUNT(*) AS tongArtwork,
        COALESCE(SUM(CASE WHEN HienThi = 1 THEN 1 ELSE 0 END), 0) AS dangKichHoat,
        COALESCE(SUM(DungLuongBytes), 0) AS tongDungLuongBytes,
        COALESCE(SUM(CASE WHEN LoaiMau = 'MAU_LON' THEN 1 ELSE 0 END), 0) AS soMauLon,
        COALESCE(SUM(CASE WHEN LoaiMau = 'LOGO' THEN 1 ELSE 0 END), 0) AS soLogoNho
      FROM MauIn
    `;

        const listSql = `
      SELECT
        MaMauIn,
        TenMauIn,
        DuongDanPNG,
        LoaiMau,
        HienThi,
        NhanKieuIn,
        ViTriChoPhep,
        KichThuocPx,
        DungLuongBytes
      FROM MauIn
      WHERE LoaiMau = ?
      ORDER BY MaMauIn DESC
    `;

        const [[[stats]], [rows]] = await Promise.all([
            pool.query(statsSql),
            pool.query(listSql, [type]),
        ]);

        let templates = rows.map((row) => ({
            MaMauIn: row.MaMauIn,
            MaHienThi: `#${String(row.MaMauIn).padStart(4, '0')}`,
            TenMau: row.TenMauIn,
            DuongDanAnh: row.DuongDanPNG,
            LoaiMau: row.LoaiMau,
            NhanKieuIn:
                row.NhanKieuIn || (row.LoaiMau === 'MAU_LON' ? 'A3 FRONT' : 'NGỰC TRÁI'),
            ViTriChoPhep: parsePositions(row.ViTriChoPhep),
            KichThuocPx: row.KichThuocPx || '3000 × 4000 px · 300 DPI',
            DungLuongBytes: Number(row.DungLuongBytes || 0),
            HienThi: Boolean(row.HienThi),
        }));

        if (search) {
            templates = templates.filter(
                (t) =>
                    t.TenMau.toLowerCase().includes(search) ||
                    t.MaHienThi.toLowerCase().includes(search)
            );
        }

        if (sort === 'name_asc') {
            templates.sort((a, b) => a.TenMau.localeCompare(b.TenMau, 'vi'));
        } else if (sort === 'active_first') {
            templates.sort((a, b) => Number(b.HienThi) - Number(a.HienThi));
        }

        const totalMB =
            Math.round((Number(stats.tongDungLuongBytes) / (1024 * 1024)) * 10) / 10;

        res.json({
            stats: {
                tongArtwork: Number(stats.tongArtwork),
                dangKichHoat: Number(stats.dangKichHoat),
                dungLuongMB: totalMB,
                gioiHanGB: 5,
                soMauLon: Number(stats.soMauLon),
                soLogoNho: Number(stats.soLogoNho),
            },
            templates,
        });
    } catch (err) {
        console.error('[templates.controller > getTemplates]', err);
        res.status(500).json({ message: 'Lỗi lấy danh sách mẫu in', error: err.message });
    }
}

// 2. Tải lên & nạp mẫu in PNG mới vào kho
async function createTemplate(req, res) {
    try {
        const tenMauIn = (req.body.tenMau || '').trim();
        const loaiMau = req.body.loaiMau === 'LOGO' ? 'LOGO' : 'MAU_LON';
        const kichThuocPx =
            (req.body.kichThuocPx || '').trim() || '3000 × 4000 px · 300 DPI';
        const viTriChoPhep = parsePositions(req.body.viTriChoPhep);

        if (!tenMauIn) {
            removeUploadedFile(req.file);
            return res.status(400).json({ message: 'Vui lòng nhập tên mẫu in hiển thị' });
        }

        let duongDanPNG = (req.body.duongDanAnh || '').trim();
        let dungLuongBytes = 0;

        if (req.file) {
            duongDanPNG = `${getPublicBaseUrl(req)}/uploads/templates/${req.file.filename}`;
            dungLuongBytes = req.file.size;
        }

        if (!duongDanPNG) {
            removeUploadedFile(req.file);
            return res.status(400).json({
                message: 'Vui lòng chọn tệp PNG trong suốt hoặc nhập đường dẫn ảnh',
            });
        }

        const nhanKieuIn =
            (req.body.nhanKieuIn || '').trim() ||
            (viTriChoPhep[0]
                ? viTriChoPhep[0].toUpperCase()
                : loaiMau === 'MAU_LON'
                    ? 'A3 FRONT'
                    : 'LOGO NHỎ');

        const sql = `
      INSERT INTO MauIn
        (TenMauIn, DuongDanPNG, LoaiMau, HienThi, NhanKieuIn, ViTriChoPhep, KichThuocPx, DungLuongBytes)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?)
    `;

        const [result] = await pool.query(sql, [
            tenMauIn,
            duongDanPNG,
            loaiMau,
            nhanKieuIn,
            JSON.stringify(viTriChoPhep),
            kichThuocPx,
            dungLuongBytes,
        ]);

        res.status(201).json({
            message: 'Đã nạp mẫu in vào kho thành công',
            maMauIn: result.insertId,
        });
    } catch (err) {
        console.error('[templates.controller > createTemplate]', err);
        removeUploadedFile(req.file);
        res.status(500).json({ message: 'Lỗi nạp mẫu in vào kho', error: err.message });
    }
}

// 3. Bật / tắt trạng thái Hoạt động
async function toggleTemplateStatus(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'Mã mẫu in không hợp lệ' });
        }

        const hienThi = req.body.hienThi ? 1 : 0;
        const [result] = await pool.query(
            `UPDATE MauIn SET HienThi = ? WHERE MaMauIn = ?`,
            [hienThi, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy mẫu in' });
        }

        res.json({ maMauIn: id, hienThi: Boolean(hienThi) });
    } catch (err) {
        console.error('[templates.controller > toggleTemplateStatus]', err);
        res.status(500).json({ message: 'Lỗi cập nhật trạng thái mẫu in' });
    }
}

// 4. Cập nhật thông tin mẫu in
async function updateTemplate(req, res) {
    try {
        const id = Number(req.params.id);
        const tenMauIn = (req.body.tenMau || '').trim();
        const nhanKieuIn = (req.body.nhanKieuIn || '').trim();
        const viTriChoPhep = parsePositions(req.body.viTriChoPhep);

        if (!Number.isInteger(id) || id <= 0 || !tenMauIn) {
            return res.status(400).json({ message: 'Thông tin cập nhật không hợp lệ' });
        }

        const [result] = await pool.query(
            `UPDATE MauIn
       SET TenMauIn = ?, NhanKieuIn = ?, ViTriChoPhep = ?
       WHERE MaMauIn = ?`,
            [tenMauIn, nhanKieuIn || 'A3 FRONT', JSON.stringify(viTriChoPhep), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy mẫu in' });
        }

        res.json({ message: 'Cập nhật mẫu in thành công' });
    } catch (err) {
        console.error('[templates.controller > updateTemplate]', err);
        res.status(500).json({ message: 'Lỗi cập nhật mẫu in' });
    }
}

// 5. Xóa mẫu in khỏi kho
async function deleteTemplate(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'Mã mẫu in không hợp lệ' });
        }

        const [[existing]] = await pool.query(
            `SELECT DuongDanPNG FROM MauIn WHERE MaMauIn = ?`,
            [id]
        );
        if (!existing) {
            return res.status(404).json({ message: 'Không tìm thấy mẫu in' });
        }

        await pool.query(`DELETE FROM MauIn WHERE MaMauIn = ?`, [id]);

        if (existing.DuongDanPNG?.includes('/uploads/templates/')) {
            const filename = path.basename(existing.DuongDanPNG.split('/uploads/templates/').pop());
            const filePath = path.join(__dirname, '..', 'uploads', 'templates', filename);
            fs.unlink(filePath, () => { });
        }

        res.json({ message: 'Đã xóa mẫu in khỏi kho' });
    } catch (err) {
        console.error('[templates.controller > deleteTemplate]', err);
        res.status(500).json({
            message: 'Không thể xóa mẫu in (có thể đang được gắn trong đơn hàng)',
        });
    }
}

module.exports = {
    getTemplates,
    createTemplate,
    updateTemplate,
    toggleTemplateStatus,
    deleteTemplate,
};