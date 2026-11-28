import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Upload,
    Layers,
    UploadCloud,
    Search,
    MoreVertical,
    ImageOff,
    Pencil,
    ExternalLink,
    Trash2,
    X,
    AlertTriangle,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import {
    API_BASE,
    adminFetch,
    getAuthToken,
    triggerUnauthorizedLogout,
} from '../../utils/api';
import '../css/adminTemplates.css';

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

    // Khu vực tải lên PNG mới (mặc định thu gọn)
    const [showUploadPanel, setShowUploadPanel] = useState(false);
    const uploadSectionRef = useRef(null);
    const cardRefs = useRef(new Map());
    const [highlightId, setHighlightId] = useState(null);

    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [detectedPx, setDetectedPx] = useState('');
    const [dragging, setDragging] = useState(false);

    const [tenMau, setTenMau] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');

    // Modal Đổi tên & Xóa mẫu in
    const [renameTarget, setRenameTarget] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const handleSwitchType = (nextType) => {
        setActiveType(nextType);
    };

    const handleOpenUpload = () => {
        setShowUploadPanel(true);
        setError('');
        setUploadMsg('');
        setTimeout(() => {
            uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 40);
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
            formData.append('kichThuocPx', detectedPx || '3600 × 4800 px · 300 DPI');

            const token = getAuthToken();
            const res = await fetch(`${API_BASE}/api/admin/templates`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json().catch(() => ({}));
            if (res.status === 401) {
                triggerUnauthorizedLogout(data.message);
                return;
            }
            if (!res.ok) {
                throw new Error(data.message || 'Tải tệp thất bại');
            }

            const createdId = data.maMauIn;
            setTenMau('');
            setSelectedFile(null);
            setPreviewUrl('');
            setDetectedPx('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            setShowUploadPanel(false);
            setUploadMsg('Đã nạp tệp mẫu in vào kho thành công.');
            await fetchTemplates();

            if (createdId) {
                setHighlightId(createdId);
                setTimeout(() => {
                    cardRefs.current
                        .get(createdId)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
                setTimeout(() => {
                    setHighlightId((prev) => (prev === createdId ? null : prev));
                }, 2400);
            }
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

    const handleOpenRename = (item) => {
        setOpenMenuId(null);
        setRenameTarget(item);
        setRenameValue(item.TenMau || '');
    };

    const handleConfirmRename = async (e) => {
        e.preventDefault();
        if (!renameTarget || !renameValue.trim()) return;
        setRenaming(true);
        setError('');
        try {
            await adminFetch(`/api/admin/templates/${renameTarget.MaMauIn}`, {
                method: 'PUT',
                body: JSON.stringify({
                    tenMau: renameValue.trim(),
                    nhanKieuIn: renameTarget.NhanKieuIn,
                    viTriChoPhep: renameTarget.ViTriChoPhep,
                }),
            });
            setRenameTarget(null);
            setRenameValue('');
            fetchTemplates();
        } catch (err) {
            setError(err.message);
        } finally {
            setRenaming(false);
        }
    };

    const handleViewOriginal = (item) => {
        setOpenMenuId(null);
        if (!item.DuongDanAnh) {
            setError('Mẫu in này chưa có đường dẫn ảnh gốc.');
            return;
        }
        window.open(item.DuongDanAnh, '_blank', 'noopener,noreferrer');
    };

    const handleRequestDelete = (item) => {
        setOpenMenuId(null);
        setError('');
        setDeleteTarget(item);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await adminFetch(`/api/admin/templates/${deleteTarget.MaMauIn}`, {
                method: 'DELETE',
            });
            setDeleteTarget(null);
            fetchTemplates();
        } catch (err) {
            setError(err.message);
            setDeleteTarget(null);
        } finally {
            setDeleting(false);
        }
    };

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

            <div className="at-header">
                <div>
                    <p className="at-eyebrow">KHO NGUYÊN BẢN · STUDIO ARCHIVE</p>
                    <h1 className="aura-page-title">Quản lý mẫu in</h1>
                </div>

                <div className="at-header-controls">
                    <button
                        type="button"
                        className="at-upload-cta"
                        onClick={handleOpenUpload}
                    >
                        <Upload size={14} />
                        <span>Tải tệp mới</span>
                    </button>
                </div>
            </div>

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

            {/* Khu vực tải lên tệp in trong suốt (mặc định thu gọn) */}
            {showUploadPanel && (
                <section ref={uploadSectionRef} className="at-upload-card">
                    <div className="at-upload-head">
                        <span className="at-upload-head-title">
                            <UploadCloud size={15} />
                            KHU VỰC TẢI LÊN TỆP IN TRONG SUỐT
                        </span>
                        <div className="at-upload-head-right">
                            <span className="at-upload-head-note">
                                Yêu cầu kênh Alpha (Transparent Channel) sạch 100%
                            </span>
                            <button
                                type="button"
                                className="at-upload-close"
                                aria-label="Thu gọn khu tải lên"
                                onClick={() => setShowUploadPanel(false)}
                            >
                                <X size={16} />
                            </button>
                        </div>
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
                                        Chỉ chấp nhận PNG nền trong suốt, tối đa 25MB.
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Cột cấu hình tên mẫu in bên phải */}
                        <div className="at-upload-form">
                            <div>
                                <label className="ap-field-label">TÊN MẪU IN HIỂN THỊ</label>
                                <input
                                    className="ap-field-input"
                                    placeholder="Ví dụ: AURA Brutalist Vector #09"
                                    value={tenMau}
                                    onChange={(e) => setTenMau(e.target.value)}
                                />
                                <p className="at-upload-type-note">
                                    Nhóm hiện tại:{' '}
                                    <strong>{activeType === 'LOGO' ? 'Logo nhỏ' : 'Mẫu lớn'}</strong>
                                </p>
                            </div>

                            <button type="submit" className="at-submit-btn" disabled={uploading}>
                                <UploadCloud size={15} />
                                <span>{uploading ? 'ĐANG NẠP VÀO KHO...' : 'XÁC NHẬN NẠP VÀO KHO'}</span>
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {/* Thanh tab chuyển Mẫu lớn / Logo nhỏ + bộ lọc */}
            <div className="at-gallery-bar">
                <div className="at-tab-group" role="tablist" aria-label="Phân loại mẫu in">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeType === 'MAU_LON'}
                        className={`at-tab-btn ${activeType === 'MAU_LON' ? 'active' : ''}`}
                        onClick={() => handleSwitchType('MAU_LON')}
                    >
                        <span>Mẫu lớn</span>
                        <span className="at-tab-count">{stats.soMauLon}</span>
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeType === 'LOGO'}
                        className={`at-tab-btn ${activeType === 'LOGO' ? 'active' : ''}`}
                        onClick={() => handleSwitchType('LOGO')}
                    >
                        <span>Logo nhỏ</span>
                        <span className="at-tab-count">{stats.soLogoNho}</span>
                    </button>
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
                    {activeType === 'MAU_LON' ? 'Mẫu lớn' : 'Logo nhỏ'}. Hãy bấm &ldquo;Tải tệp mới&rdquo; để nạp file PNG.
                </div>
            ) : (
                <section className="at-grid">
                    {templates.map((item) => (
                        <article
                            key={item.MaMauIn}
                            ref={(el) => {
                                if (el) cardRefs.current.set(item.MaMauIn, el);
                                else cardRefs.current.delete(item.MaMauIn);
                            }}
                            className={`at-art-card ${highlightId === item.MaMauIn ? 'is-highlighted' : ''}`}
                        >
                            <div className="at-art-stage">
                                <div
                                    style={{ position: 'absolute', top: 8, right: 8 }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        type="button"
                                        className="at-art-menu-btn"
                                        style={{ position: 'static' }}
                                        aria-label={`Thao tác ${item.TenMau}`}
                                        onClick={() =>
                                            setOpenMenuId((prev) =>
                                                prev === item.MaMauIn ? null : item.MaMauIn
                                            )
                                        }
                                    >
                                        <MoreVertical size={15} />
                                    </button>

                                    {openMenuId === item.MaMauIn && (
                                        <div className="at-card-menu">
                                            <button
                                                type="button"
                                                className="at-card-menu-item"
                                                onClick={() => handleOpenRename(item)}
                                            >
                                                <Pencil size={14} />
                                                <span>Đổi tên</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="at-card-menu-item"
                                                onClick={() => handleViewOriginal(item)}
                                            >
                                                <ExternalLink size={14} />
                                                <span>Xem ảnh gốc</span>
                                            </button>
                                            <div className="at-card-menu-divider" />
                                            <button
                                                type="button"
                                                className="at-card-menu-item danger"
                                                onClick={() => handleRequestDelete(item)}
                                            >
                                                <Trash2 size={14} />
                                                <span>Xóa</span>
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

            {/* Modal Đổi tên mẫu in */}
            {renameTarget && (
                <div className="aura-modal-backdrop" onClick={() => !renaming && setRenameTarget(null)}>
                    <div className="aura-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="aura-modal-header">
                            <h3>Đổi tên mẫu in</h3>
                            <button
                                type="button"
                                className="aura-icon-btn"
                                disabled={renaming}
                                onClick={() => setRenameTarget(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form className="aura-modal-body" onSubmit={handleConfirmRename}>
                            <div>
                                <label className="ap-field-label">Tên mẫu in mới *</label>
                                <input
                                    className="ap-field-input"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="ap-modal-actions">
                                <button
                                    type="button"
                                    className="ap-btn-cancel"
                                    disabled={renaming}
                                    onClick={() => setRenameTarget(null)}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="ap-btn-save"
                                    disabled={renaming || !renameValue.trim()}
                                >
                                    {renaming ? 'Đang lưu...' : 'Lưu tên mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Xác nhận xóa mẫu in */}
            {deleteTarget && (
                <div className="aura-modal-backdrop" onClick={() => !deleting && setDeleteTarget(null)}>
                    <div className="aura-modal at-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="aura-modal-header">
                            <h3>Xác nhận xóa mẫu in</h3>
                            <button
                                type="button"
                                className="aura-icon-btn"
                                disabled={deleting}
                                onClick={() => setDeleteTarget(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="aura-modal-body">
                            <div className="at-confirm-box">
                                <span className="at-confirm-icon">
                                    <AlertTriangle size={20} />
                                </span>
                                <p>
                                    Bạn có chắc chắn muốn xóa mẫu in{' '}
                                    <strong>&ldquo;{deleteTarget.TenMau}&rdquo;</strong> khỏi kho? Hành động này không thể hoàn tác.
                                </p>
                            </div>
                            <div className="ap-modal-actions">
                                <button
                                    type="button"
                                    className="ap-btn-cancel"
                                    disabled={deleting}
                                    onClick={() => setDeleteTarget(null)}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    className="at-btn-danger"
                                    disabled={deleting}
                                    onClick={handleConfirmDelete}
                                >
                                    {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
}