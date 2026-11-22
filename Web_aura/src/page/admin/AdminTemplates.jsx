import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Upload,
    Layers,
    CheckCircle2,
    Cloud,
    Printer,
    UploadCloud,
    Search,
    MoreVertical,
    ImageOff,
    Sliders,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { adminFetch } from '../../utils/api';
import '../css/adminTemplates.css';

const API_BASE = 'http://localhost:5000';

const POSITIONS_BY_TYPE = {
    MAU_LON: [
        { id: 'A3 FRONT', label: 'Mặt trước lớn (A3 Front)', dim: '28 x 36 cm' },
        { id: 'BACK PRINT', label: 'Mặt sau lớn (Back Print)', dim: '30 x 40 cm' },
        { id: 'A3+ MASTER', label: 'Khổ đại A3+ Master', dim: '32 x 45 cm' },
        { id: 'ALL-OVER', label: 'In toàn thân (All-Over)', dim: 'Full panel' },
    ],
    LOGO: [
        { id: 'Ngực trái', label: 'Ngực trái', dim: '8 x 8 cm' },
        { id: 'Ngực phải', label: 'Ngực phải', dim: '8 x 8 cm' },
        { id: 'Tay áo trái', label: 'Tay áo trái', dim: '6 x 6 cm' },
        { id: 'Tay áo phải', label: 'Tay áo phải', dim: '6 x 6 cm' },
        { id: 'Gáy cổ sau', label: 'Gáy cổ sau', dim: '5 x 5 cm' },
    ],
};

export default function AdminTemplates({
    adminUser,
    onNavigate,
    onLogout,
    onBackToStore,
}) {
    const [activeType, setActiveType] = useState('MAU_LON'); // 'MAU_LON' | 'LOGO'
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    const [stats, setStats] = useState({
        tongArtwork: 0,
        dangKichHoat: 0,
        dungLuongMB: 0,
        gioiHanGB: 5,
        soMauLon: 0,
        soLogoNho: 0,
    });
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openMenuId, setOpenMenuId] = useState(null);

    // Form tải lên PNG mới
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [detectedPx, setDetectedPx] = useState('');
    const [dragging, setDragging] = useState(false);

    const [tenMau, setTenMau] = useState('');
    const [selectedPositions, setSelectedPositions] = useState(['A3 FRONT', 'BACK PRINT']);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');

    // Tự cập nhật danh sách vị trí mặc định khi đổi tab Mẫu lớn / Logo nhỏ
    const handleSwitchType = (nextType) => {
        setActiveType(nextType);
        setSelectedPositions(
            nextType === 'LOGO'
                ? ['Ngực trái', 'Ngực phải', 'Gáy cổ sau']
                : ['A3 FRONT', 'BACK PRINT']
        );
    };

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({
            type: activeType,
            sort: sortBy,
        });
        if (search.trim()) params.set('search', search.trim());

        try {
            const data = await adminFetch(`/api/admin/templates?${params}`);
            setStats(data.stats);
            setTemplates(data.templates || []);
            setError('');
        } catch (err) {
            if (err.status === 401 || err.status === 403) {
                onLogout?.();
                return;
            }
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [activeType, sortBy, search, onLogout]);

    useEffect(() => {
        const timer = setTimeout(fetchTemplates, 200);
        return () => clearTimeout(timer);
    }, [fetchTemplates]);

    useEffect(() => {
        const closeMenu = () => setOpenMenuId(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    // Xử lý chọn / kéo thả file PNG + đọc kích thước pixel thực tế
    const handleSelectFile = (file) => {
        if (!file) return;
        setUploadMsg('');
        setError('');

        if (file.type !== 'image/png') {
            setError('Chỉ chấp nhận file .PNG nền trong suốt.');
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            setError('Dung lượng tệp vượt quá giới hạn tối đa 25MB.');
            return;
        }

        const url = URL.createObjectURL(file);
        setSelectedFile(file);
        setPreviewUrl(url);

        if (!tenMau.trim()) {
            setTenMau(file.name.replace(/\.png$/i, '').replace(/[_-]+/g, ' '));
        }

        const img = new window.Image();
        img.onload = () => {
            setDetectedPx(`${img.naturalWidth} × ${img.naturalHeight} px · 300 DPI`);
        };
        img.src = url;
    };

    const handleTogglePosition = (posId) => {
        setSelectedPositions((prev) =>
            prev.includes(posId) ? prev.filter((p) => p !== posId) : [...prev, posId]
        );
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setUploadMsg('');

        if (!selectedFile) {
            setError('Vui lòng chọn hoặc kéo thả tệp PNG vào khung tải lên.');
            return;
        }
        if (!tenMau.trim()) {
            setError('Vui lòng nhập tên mẫu in hiển thị.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('tenMau', tenMau.trim());
            formData.append('loaiMau', activeType);
            formData.append(
                'nhanKieuIn',
                selectedPositions[0] || (activeType === 'MAU_LON' ? 'A3 FRONT' : 'NGỰC TRÁI')
            );
            formData.append('viTriChoPhep', JSON.stringify(selectedPositions));
            formData.append('kichThuocPx', detectedPx || '3600 × 4800 px · 300 DPI');

            const token = localStorage.getItem('aura_admin_token');
            const res = await fetch(`${API_BASE}/api/admin/templates`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'Tải tệp thất bại');
            }

            setTenMau('');
            setSelectedFile(null);
            setPreviewUrl('');
            setDetectedPx('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            setUploadMsg('Đã nạp tệp mẫu in vào kho thành công.');
            fetchTemplates();
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleToggleStatus = async (item) => {
        const nextValue = !item.HienThi;
        setTemplates((prev) =>
            prev.map((t) =>
                t.MaMauIn === item.MaMauIn ? { ...t, HienThi: nextValue } : t
            )
        );

        try {
            await adminFetch(`/api/admin/templates/${item.MaMauIn}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ hienThi: nextValue }),
            });
            fetchTemplates();
        } catch {
            fetchTemplates();
        }
    };

    const handleDeleteTemplate = async (item) => {
        setOpenMenuId(null);
        if (!window.confirm(`Xóa mẫu in "${item.TenMau}" khỏi kho?`)) return;

        try {
            await adminFetch(`/api/admin/templates/${item.MaMauIn}`, {
                method: 'DELETE',
            });
            fetchTemplates();
        } catch (err) {
            setError(err.message);
        }
    };

    const activePercent =
        stats.tongArtwork > 0
            ? Math.round((stats.dangKichHoat / stats.tongArtwork) * 100)
            : 0;
    const storagePercent = Math.min(
        100,
        Math.round((stats.dungLuongMB / (stats.gioiHanGB * 1024)) * 100)
    );
    const currentPositions = POSITIONS_BY_TYPE[activeType];

    return (
        <AdminLayout
            activeMenu="print-templates"
            adminUser={adminUser}
            onSelectMenu={onNavigate}
            onLogout={onLogout}
            onBackToStore={onBackToStore}
            searchQuery={search}
            onSearchChange={setSearch}
        >
            {/* Header + 2 Tab Mẫu lớn / Logo nhỏ */}
            <div className="at-header">
                <div>
                    <p className="at-eyebrow">KHO NGUYÊN BẢN · STUDIO ARCHIVE</p>
                    <h1 className="aura-page-title">Quản lý mẫu in</h1>
                    <p className="at-subtitle">
                        Hệ thống lưu trữ và chuẩn hóa tệp in độ phân giải cao phục vụ công nghệ in DTG và In lụa thủ công.
                    </p>
                </div>

                <div className="at-header-controls">
                    <div className="at-tab-group">
                        <button
                            type="button"
                            className={`at-tab-btn ${activeType === 'MAU_LON' ? 'active' : ''}`}
                            onClick={() => handleSwitchType('MAU_LON')}
                        >
                            MẪU LỚN (FULL PRINT)
                        </button>
                        <button
                            type="button"
                            className={`at-tab-btn ${activeType === 'LOGO' ? 'active' : ''}`}
                            onClick={() => handleSwitchType('LOGO')}
                        >
                            LOGO NHỎ (BADGE &amp; POCKET)
                        </button>
                    </div>

                    <button
                        type="button"
                        className="at-upload-cta"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={14} />
                        <span>TẢI TỆP MỚI</span>
                    </button>
                </div>
            </div>

            {/* 4 Thẻ KPI */}
            <section className="at-kpi-grid">
                <div className="at-kpi-card">
                    <div className="at-kpi-top">
                        <p className="at-kpi-label">TỔNG SỐ ARTWORK</p>
                        <Layers size={15} color="#4b5563" />
                    </div>
                    <div className="at-kpi-value-row">
                        <span className="at-kpi-num">{stats.tongArtwork}</span>
                        <span className="at-kpi-unit">tệp đạt chuẩn</span>
                    </div>
                    <div className="ac-progress-track">
                        <div className="ac-progress-bar" style={{ width: '100%' }} />
                    </div>
                </div>

                <div className="at-kpi-card">
                    <div className="at-kpi-top">
                        <p className="at-kpi-label">ĐANG KÍCH HOẠT</p>
                        <CheckCircle2 size={15} color="#4b5563" />
                    </div>
                    <div className="at-kpi-value-row">
                        <span className="at-kpi-num">{stats.dangKichHoat}</span>
                        <span className="at-kpi-unit">sẵn sàng custom</span>
                    </div>
                    <div className="ac-progress-track">
                        <div className="ac-progress-bar" style={{ width: `${activePercent}%` }} />
                    </div>
                </div>

                <div className="at-kpi-card">
                    <div className="at-kpi-top">
                        <p className="at-kpi-label">DUNG LƯỢNG KHO PNG</p>
                        <Cloud size={15} color="#4b5563" />
                    </div>
                    <div className="at-kpi-value-row">
                        <span className="at-kpi-num">{stats.dungLuongMB} MB</span>
                        <span className="at-kpi-unit">/ {stats.gioiHanGB} GB Cloud</span>
                    </div>
                    <div className="ac-progress-track">
                        <div className="ac-progress-bar" style={{ width: `${Math.max(4, storagePercent)}%` }} />
                    </div>
                </div>

                <div className="at-kpi-card">
                    <div className="at-kpi-top">
                        <p className="at-kpi-label">PHƯƠNG THỨC IN TỐI ƯU</p>
                        <Printer size={15} color="#4b5563" />
                    </div>
                    <div className="at-method-rows">
                        <div className="at-method-row">
                            <span>Direct-to-Garment</span>
                            <span className="at-method-badge">DTG 1200 DPI</span>
                        </div>
                        <div className="at-method-row">
                            <span>In lụa 4 bản phim</span>
                            <span className="at-method-badge">In decal ép nhiệt</span>
                        </div>
                    </div>
                </div>
            </section>

            {error && (
                <div className="aura-login-error" style={{ marginBottom: 16 }}>
                    {error}
                </div>
            )}
            {uploadMsg && (
                <div
                    style={{
                        marginBottom: 16,
                        padding: '10px 14px',
                        borderRadius: 6,
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#065f46',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 13,
                    }}
                >
                    {uploadMsg}
                </div>
            )}

            {/* Khu vực tải lên tệp in trong suốt */}
            <section className="at-upload-card">
                <div className="at-upload-head">
                    <span className="at-upload-head-title">
                        <UploadCloud size={15} />
                        KHU VỰC TẢI LÊN TỆP IN TRONG SUỐT
                    </span>
                    <span className="at-upload-head-note">
                        Yêu cầu kênh Alpha (Transparent Channel) sạch 100%
                    </span>
                </div>

                <form className="at-upload-body" onSubmit={handleUploadSubmit}>
                    {/* Ô kéo thả PNG bên trái */}
                    <div
                        className={`at-dropzone ${dragging ? 'dragging' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragging(false);
                            handleSelectFile(e.dataTransfer.files?.[0]);
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png"
                            hidden
                            onChange={(e) => handleSelectFile(e.target.files?.[0])}
                        />

                        {previewUrl ? (
                            <div className="at-preview-stage">
                                <div className="at-preview-checker">
                                    <img src={previewUrl} alt="Xem trước PNG" />
                                </div>
                                <p className="at-dropzone-title">{selectedFile?.name}</p>
                                <p className="at-art-dim">
                                    {detectedPx} · {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB (Bấm để đổi tệp)
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="at-dropzone-icon">
                                    <Layers size={20} />
                                </div>
                                <p className="at-dropzone-title">
                                    Kéo thả hoặc tải lên file PNG trong suốt
                                </p>
                                <p className="at-dropzone-desc">
                                    Chỉ chấp nhận PNG nền trong suốt, tối đa 25MB, chuẩn màu sRGB / Adobe RGB, độ phân giải tối thiểu 300 DPI.
                                </p>
                                <div className="at-spec-pills">
                                    <span className="at-spec-pill">.PNG TRANSPARENT</span>
                                    <span className="at-spec-pill">MAX 25MB</span>
                                    <span className="at-spec-pill">ALPHA CHANNEL ONLY</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Cột cấu hình tên & vị trí in bên phải */}
                    <div className="at-upload-form">
                        <div>
                            <label className="ap-field-label">TÊN MẪU IN HIỂN THỊ</label>
                            <input
                                className="ap-field-input"
                                placeholder="Ví dụ: AURA Brutalist Vector #09"
                                value={tenMau}
                                onChange={(e) => setTenMau(e.target.value)}
                            />
                        </div>

                        <div>
                            <div className="at-pos-head">
                                <span className="ap-field-label" style={{ marginBottom: 0 }}>
                                    VỊ TRÍ ÉP / THÊU CHO PHÉP
                                </span>
                                <span className="at-pos-badge">
                                    {activeType === 'LOGO' ? 'LOGO NHỎ' : 'MẪU LỚN'}
                                </span>
                            </div>
                            <p className="at-pos-note">
                                Chọn các tọa độ mockup được phép áp dụng mẫu in này trên áo:
                            </p>

                            <div className="at-pos-list">
                                {currentPositions.map((pos) => (
                                    <label key={pos.id} className="at-pos-item">
                                        <span className="at-pos-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedPositions.includes(pos.id)}
                                                onChange={() => handleTogglePosition(pos.id)}
                                            />
                                            <span>{pos.label}</span>
                                        </span>
                                        <span className="at-pos-dim">{pos.dim}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="at-submit-btn" disabled={uploading}>
                            <UploadCloud size={15} />
                            <span>{uploading ? 'ĐANG NẠP VÀO KHO...' : 'XÁC NHẬN NẠP VÀO KHO'}</span>
                        </button>
                    </div>
                </form>
            </section>

            {/* Thanh tiêu đề lưới artwork */}
            <div className="at-gallery-bar">
                <div className="at-gallery-title-wrap">
                    <h2 className="at-gallery-title">
                        DANH MỤC:{' '}
                        {activeType === 'MAU_LON'
                            ? 'MẪU LỚN (FULL PRINT)'
                            : 'LOGO NHỎ (BADGE & POCKET)'}
                    </h2>
                    <span className="at-gallery-count">
                        {templates.length} TỆP HIỆN HÀNH
                    </span>
                </div>

                <div className="at-gallery-filters">
                    <div className="at-filter-search">
                        <Search size={14} className="ap-search-icon" />
                        <input
                            type="text"
                            placeholder="Lọc theo tên hoặc mã mẫu..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <select
                        className="ap-status-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="newest">Mới cập nhật</option>
                        <option value="name_asc">Tên A → Z</option>
                        <option value="active_first">Đang hoạt động trước</option>
                    </select>
                </div>
            </div>

            {/* Lưới 4 cột mẫu in */}
            {loading ? (
                <div className="aura-card aura-empty-cell">Đang tải kho mẫu in...</div>
            ) : templates.length === 0 ? (
                <div className="aura-card aura-empty-cell" style={{ marginBottom: 24 }}>
                    Chưa có mẫu in nào trong nhóm{' '}
                    {activeType === 'MAU_LON' ? 'Mẫu lớn' : 'Logo nhỏ'}. Hãy tải lên file PNG ở khung phía trên.
                </div>
            ) : (
                <section className="at-grid">
                    {templates.map((item) => (
                        <article key={item.MaMauIn} className="at-art-card">
                            <div className="at-art-stage">
                                <span className="at-art-badge">{item.NhanKieuIn}</span>

                                <div
                                    style={{ position: 'absolute', top: 8, right: 8 }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        type="button"
                                        className="at-art-menu-btn"
                                        style={{ position: 'static' }}
                                        onClick={() =>
                                            setOpenMenuId((prev) =>
                                                prev === item.MaMauIn ? null : item.MaMauIn
                                            )
                                        }
                                    >
                                        <MoreVertical size={15} />
                                    </button>

                                    {openMenuId === item.MaMauIn && (
                                        <div className="ac-action-menu">
                                            <button
                                                type="button"
                                                className="danger"
                                                onClick={() => handleDeleteTemplate(item)}
                                            >
                                                Xóa mẫu in
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {item.DuongDanAnh ? (
                                    <img src={item.DuongDanAnh} alt={item.TenMau} />
                                ) : (
                                    <ImageOff size={28} color="#9ca3af" />
                                )}
                            </div>

                            <div className="at-art-body">
                                <div className="at-art-meta">
                                    <span>ART-ID: {item.MaHienThi}</span>
                                    <span>PNG ALPHA</span>
                                </div>
                                <h3 className="at-art-name">{item.TenMau}</h3>
                                <p className="at-art-dim">{item.KichThuocPx}</p>
                            </div>

                            <div className="at-art-footer">
                                <span className={`at-art-status ${item.HienThi ? '' : 'muted'}`}>
                                    <span className="at-status-dot" />
                                    <span>{item.HienThi ? 'Hoạt động' : 'Vô hiệu hóa'}</span>
                                </span>

                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={item.HienThi}
                                    className={`ac-switch ${item.HienThi ? 'on' : ''}`}
                                    onClick={() => handleToggleStatus(item)}
                                >
                                    <span className="ac-switch-knob" />
                                </button>
                            </div>
                        </article>
                    ))}
                </section>
            )}

            {/* Banner kiểm soát chuẩn in cuối trang */}
            <section className="at-qc-banner">
                <div className="at-qc-left">
                    <div className="at-qc-icon">
                        <Sliders size={18} />
                    </div>
                    <div>
                        <h3 className="at-qc-title">KIỂM SOÁT CHUẨN IN DTG &amp; LƯỚI LỤA</h3>
                        <p className="at-qc-desc">
                            Tất cả tệp tải lên đều được xử lý qua bộ tiền lọc Alpha-Channel để loại bỏ viền halo màu trắng hoặc xám rác. Đảm bảo mực in bám trực tiếp lên thớ vải 100% Cotton 320 GSM mà không tạo cộm bề mặt.
                        </p>
                    </div>
                </div>

                <div className="at-qc-actions">
                    <button type="button" className="ac-btn-outline">
                        XEM HƯỚNG DẪN CHUẨN FILE
                    </button>
                    <button type="button" className="at-btn-dark" onClick={fetchTemplates}>
                        KIỂM ĐỊNH TOÀN BỘ KHO
                    </button>
                </div>
            </section>
        </AdminLayout>
    );
}