import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpDown,
  Plus,
  Shapes,
  Eye,
  EyeOff,
  Layers,
  Search,
  SlidersHorizontal,
  Download,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  X,
  Shirt,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { adminFetch } from '../../utils/api';
import '../css/adminCategories.css';

const PAGE_LIMIT = 5;

const SORT_OPTIONS = [
  { id: 'id_asc', label: 'Mặc định (Thứ tự tạo)' },
  { id: 'id_desc', label: 'Mới nhất trước' },
  { id: 'name_asc', label: 'Tên danh mục (A → Z)' },
  { id: 'products_desc', label: 'Số sản phẩm nhiều nhất' },
];

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tất cả trạng thái' },
  { id: 'active', label: 'Đang hiển thị' },
  { id: 'hidden', label: 'Tạm ẩn' },
];

const EMPTY_FORM = {
  tenDanhMuc: '',
  moTa: '',
  hienThi: true,
};

function padTwo(n) {
  return String(Number(n) || 0).padStart(2, '0');
}

function formatNumber(n) {
  return new Intl.NumberFormat('en-US').format(Number(n) || 0);
}

export default function AdminCategories({
  adminUser,
  onNavigate,
  onLogout,
  onBackToStore,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('id_asc');
  const [page, setPage] = useState(1);

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [openActionId, setOpenActionId] = useState(null);

  const [stats, setStats] = useState({
    tongDanhMuc: 0,
    dangKichHoat: 0,
    tamAn: 0,
    tyLeTrucTuyen: 0,
    tongSanPham: 0,
  });
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal Thêm / Sửa danh mục
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_LIMIT),
      status: statusFilter,
      sort: sortBy,
    });
    if (search.trim()) params.set('search', search.trim());

    try {
      const data = await adminFetch(`/api/admin/categories?${params}`);
      setStats(data.stats);
      setCategories(data.categories || []);
      setPagination(data.pagination);
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
  }, [page, search, statusFilter, sortBy, onLogout]);

  useEffect(() => {
    const timer = setTimeout(fetchCategories, 200);
    return () => clearTimeout(timer);
  }, [fetchCategories]);

  // Đóng menu nổi khi click ra ngoài
  useEffect(() => {
    const closeMenus = () => {
      setShowSortMenu(false);
      setShowFilterMenu(false);
      setOpenActionId(null);
    };
    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  const handleToggleStatus = async (cat) => {
    const nextValue = !cat.HienThi;

    setCategories((prev) =>
      prev.map((item) =>
        item.MaDanhMuc === cat.MaDanhMuc ? { ...item, HienThi: nextValue } : item
      )
    );

    try {
      await adminFetch(`/api/admin/categories/${cat.MaDanhMuc}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ hienThi: nextValue }),
      });
      fetchCategories();
    } catch (err) {
      setError(err.message);
      fetchCategories();
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingId(cat.MaDanhMuc);
    setForm({
      tenDanhMuc: cat.TenDanhMuc,
      moTa: cat.MoTa || '',
      hienThi: cat.HienThi,
    });
    setFormError('');
    setOpenActionId(null);
    setModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const path = editingId
      ? `/api/admin/categories/${editingId}`
      : '/api/admin/categories';
    const method = editingId ? 'PUT' : 'POST';

    try {
      await adminFetch(path, {
        method,
        body: JSON.stringify(form),
      });
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    setOpenActionId(null);
    if (!window.confirm(`Bạn chắc chắn muốn xóa danh mục "${cat.TenDanhMuc}"?`)) {
      return;
    }

    try {
      await adminFetch(`/api/admin/categories/${cat.MaDanhMuc}`, {
        method: 'DELETE',
      });
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Mã', 'Tên danh mục', 'Đường dẫn', 'Mô tả ngắn', 'Số lượng SP', 'Trạng thái'];
    const rows = categories.map((c) => [
      c.MaDanhMuc,
      c.TenDanhMuc,
      c.Slug,
      c.MoTa,
      c.SoSanPham,
      c.HienThi ? 'Đang hiển thị' : 'Tạm ẩn',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'danh-muc-aura.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const startItem =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);
  const hiddenPercent =
    stats.tongDanhMuc > 0 ? Math.round((stats.tamAn / stats.tongDanhMuc) * 100) : 0;

  return (
    <AdminLayout
      activeMenu="categories"
      adminUser={adminUser}
      onSelectMenu={onNavigate}
      onLogout={onLogout}
      onBackToStore={onBackToStore}
      searchQuery={search}
      onSearchChange={(val) => {
        setSearch(val);
        setPage(1);
      }}
    >
      {/* Header trang */}
      <div className="ac-header">
        <div>
          <p className="ac-eyebrow">
            KHO LƯU TRỮ VÀ PHÂN LOẠI • AURA CATALOGUE v2.4
          </p>
          <h1 className="aura-page-title">Danh mục sản phẩm</h1>
          <p className="ac-subtitle">
            Cấu trúc phân tầng bộ sưu tập thời trang, phụ kiện và tác phẩm in giới hạn.
          </p>
        </div>

        <div className="ac-header-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="ac-btn-outline"
            onClick={() => {
              setShowSortMenu((prev) => !prev);
              setShowFilterMenu(false);
            }}
          >
            <ArrowUpDown size={14} />
            <span>SẮP XẾP THỨ TỰ</span>
          </button>

          {showSortMenu && (
            <div className="ac-popover" style={{ right: 175 }}>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={sortBy === opt.id ? 'active' : ''}
                  onClick={() => {
                    setSortBy(opt.id);
                    setShowSortMenu(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <button type="button" className="ac-btn-primary" onClick={openCreateModal}>
            <Plus size={15} strokeWidth={2.2} />
            <span>THÊM DANH MỤC MỚI</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI có thanh tiến độ */}
      <section className="ac-kpi-grid">
        <div className="ac-kpi-card">
          <div className="ac-kpi-top">
            <p className="ac-kpi-label">TỔNG SỐ DANH MỤC</p>
            <Shapes size={16} className="ac-kpi-icon" />
          </div>
          <div className="ac-kpi-mid">
            <span className="ac-kpi-value">{padTwo(stats.tongDanhMuc)}</span>
            <span className="ac-kpi-note">TẤT CẢ NGÀNH HÀNG</span>
          </div>
          <div className="ac-progress-track">
            <div className="ac-progress-bar" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="ac-kpi-card">
          <div className="ac-kpi-top">
            <p className="ac-kpi-label">ĐANG KÍCH HOẠT</p>
            <Eye size={16} className="ac-kpi-icon" />
          </div>
          <div className="ac-kpi-mid">
            <span className="ac-kpi-value">{padTwo(stats.dangKichHoat)}</span>
            <span className="ac-kpi-note">{stats.tyLeTrucTuyen}% TRỰC TUYẾN</span>
          </div>
          <div className="ac-progress-track">
            <div
              className="ac-progress-bar"
              style={{ width: `${stats.tyLeTrucTuyen}%` }}
            />
          </div>
        </div>

        <div className="ac-kpi-card">
          <div className="ac-kpi-top">
            <p className="ac-kpi-label">TẠM ẨN</p>
            <EyeOff size={16} className="ac-kpi-icon" />
          </div>
          <div className="ac-kpi-mid">
            <span className="ac-kpi-value">{padTwo(stats.tamAn)}</span>
            <span className="ac-kpi-note">CHỜ RA MẮT</span>
          </div>
          <div className="ac-progress-track">
            <div
              className="ac-progress-bar muted"
              style={{ width: `${hiddenPercent}%` }}
            />
          </div>
        </div>

        <div className="ac-kpi-card">
          <div className="ac-kpi-top">
            <p className="ac-kpi-label">TỔNG SẢN PHẨM GẮN THẺ</p>
            <Layers size={16} className="ac-kpi-icon" />
          </div>
          <div className="ac-kpi-mid">
            <span className="ac-kpi-value">{formatNumber(stats.tongSanPham)}</span>
            <span className="ac-kpi-note">SKU SẴN SÀNG</span>
          </div>
          <div className="ac-progress-track">
            <div className="ac-progress-bar" style={{ width: '100%' }} />
          </div>
        </div>
      </section>

      {error && (
        <div className="aura-login-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Thanh tìm kiếm + Bộ lọc + Xuất dữ liệu */}
      <div className="ac-toolbar">
        <div className="ac-search-box">
          <Search size={15} className="ac-search-icon" />
          <input
            type="text"
            className="ac-search-input"
            placeholder="Tìm theo tên danh mục hoặc mã liên kết..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="ac-toolbar-right" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="ac-btn-outline"
            onClick={() => {
              setShowFilterMenu((prev) => !prev);
              setShowSortMenu(false);
            }}
          >
            <SlidersHorizontal size={14} />
            <span>BỘ LỌC</span>
          </button>

          {showFilterMenu && (
            <div className="ac-popover" style={{ right: 140 }}>
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={statusFilter === opt.id ? 'active' : ''}
                  onClick={() => {
                    setStatusFilter(opt.id);
                    setPage(1);
                    setShowFilterMenu(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="ac-btn-outline"
            onClick={handleExportCSV}
          >
            <Download size={14} />
            <span>XUẤT DỮ LIỆU</span>
          </button>
        </div>
      </div>

      {/* Bảng danh mục */}
      <section className="aura-card ac-table-card">
        <div className="aura-table-wrap">
          <table className="aura-table ac-table">
            <thead>
              <tr>
                <th>#</th>
                <th>TÊN DANH MỤC</th>
                <th>MÔ TẢ NGẮN</th>
                <th>SỐ LƯỢNG SP</th>
                <th>TRẠNG THÁI KINH DOANH</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="aura-empty-cell">
                    Đang tải danh sách danh mục...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="aura-empty-cell">
                    Không có danh mục nào phù hợp.
                  </td>
                </tr>
              ) : (
                categories.map((cat, idx) => (
                  <tr key={cat.MaDanhMuc}>
                    <td className="ac-index">{padTwo(startItem + idx)}</td>
                    <td>
                      <div className="ac-cat-cell">
                        <div className="ac-thumb">
                          {cat.AnhBia ? (
                            <img src={cat.AnhBia} alt={cat.TenDanhMuc} />
                          ) : (
                            <ImageOff size={16} />
                          )}
                        </div>
                        <div>
                          <div className="ac-cat-name">{cat.TenDanhMuc}</div>
                          <div className="ac-cat-slug">{cat.Slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="ac-cat-desc">
                        {cat.MoTa || 'Chưa có mô tả cho danh mục này.'}
                      </div>
                    </td>
                    <td>
                      <span className="ac-count-pill">{cat.SoSanPham} sp</span>
                    </td>
                    <td>
                      <div className="ac-status-wrap">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={cat.HienThi}
                          className={`ac-switch ${cat.HienThi ? 'on' : ''}`}
                          onClick={() => handleToggleStatus(cat)}
                        >
                          <span className="ac-switch-knob" />
                        </button>
                        <span
                          className={`ac-status-text ${cat.HienThi ? '' : 'muted'}`}
                        >
                          {cat.HienThi ? 'ĐANG HIỂN THỊ' : 'TẠM ẨN'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div
                        className="ac-action-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="aura-icon-btn"
                          aria-label="Thao tác"
                          onClick={() =>
                            setOpenActionId((prev) =>
                              prev === cat.MaDanhMuc ? null : cat.MaDanhMuc
                            )
                          }
                        >
                          <MoreVertical size={16} />
                        </button>

                        {openActionId === cat.MaDanhMuc && (
                          <div className="ac-action-menu">
                            <button
                              type="button"
                              onClick={() => openEditModal(cat)}
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              type="button"
                              className="danger"
                              onClick={() => handleDeleteCategory(cat)}
                            >
                              Xóa danh mục
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="ap-pagination">
          <span className="ap-pagination-info">
            Hiển thị <strong>{startItem} - {endItem}</strong> trên{' '}
            <strong>{pagination.total}</strong> danh mục
          </span>

          <div className="ap-pagination-btns">
            <button
              type="button"
              className="ap-page-btn"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`ap-page-btn ${
                    pagination.page === pageNum ? 'active' : ''
                  }`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            )}

            <button
              type="button"
              className="ap-page-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* 3 Thẻ hướng dẫn cuối trang */}
      <section className="ac-guide-grid">
        <article className="ac-guide-card">
          <div>
            <h3 className="ac-guide-title">
              <Shirt size={15} />
              <span>NGUYÊN TẮC PHÂN TẦNG</span>
            </h3>
            <p className="ac-guide-desc">
              Các danh mục cấp cao được tối ưu hóa cho cấu trúc URL tĩnh chuẩn SEO. Việc đổi đường dẫn (slug) của danh mục đang hoạt động sẽ tự động tạo chuyển hướng 301 nhằm duy trì thứ hạng công cụ tìm kiếm.
            </p>
          </div>
          <p className="ac-guide-foot">
            <span className="ac-guide-dot" />
            <span>Canonical structure: /danh-muc/&#123;slug-danh-muc&#125;</span>
          </p>
        </article>

        <article className="ac-guide-card">
          <div>
            <h3 className="ac-guide-title">
              <ImageIcon size={15} />
              <span>TIÊU CHUẨN ẢNH BÌA</span>
            </h3>
            <p className="ac-guide-desc">
              Ảnh đại diện danh mục yêu cầu tỷ lệ dọc 3:4 hoặc 4:5, độ phân giải tối thiểu 1200x1600px. Ưu tiên tông ảnh đen trắng studio editorial để đồng nhất nhận diện thương hiệu AURA.
            </p>
          </div>
          <p className="ac-guide-foot">
            <span className="ac-guide-dot" />
            <span>Hỗ trợ: WEBP, JPG chất lượng 90+ (Tối đa 4MB)</span>
          </p>
        </article>

        <article className="ac-guide-card">
          <div>
            <h3 className="ac-guide-title">
              <RefreshCw size={15} />
              <span>ĐỒNG BỘ HOÁ TỰ ĐỘNG</span>
            </h3>
            <p className="ac-guide-desc">
              Khi chuyển trạng thái sang &ldquo;Tạm ẩn&rdquo;, toàn bộ sản phẩm con vẫn tồn tại trong kho nhưng sẽ không xuất hiện tại thanh điều hướng và trang mua hàng của khách.
            </p>
          </div>
          <p className="ac-guide-foot">
            <span className="ac-guide-dot" />
            <span>Cập nhật bộ nhớ đệm CDN: tức thì (&lt; 3s)</span>
          </p>
        </article>
      </section>

      {/* Modal Thêm / Sửa danh mục */}
      {modalOpen && (
        <div className="aura-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="aura-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aura-modal-header">
              <h3>{editingId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}</h3>
              <button
                type="button"
                className="aura-icon-btn"
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form className="aura-modal-body" onSubmit={handleSaveCategory}>
              {formError && <div className="aura-login-error">{formError}</div>}

              <div>
                <label className="ap-field-label">Tên danh mục *</label>
                <input
                  className="ap-field-input"
                  placeholder="Ví dụ: Thời trang Nam"
                  value={form.tenDanhMuc}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tenDanhMuc: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label className="ap-field-label">Mô tả ngắn</label>
                <textarea
                  rows={3}
                  className="ap-field-textarea"
                  placeholder="Áo thun heavyweight 280-350 GSM, sơ mi lụa dập ly..."
                  value={form.moTa}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, moTa: e.target.value }))
                  }
                />
              </div>

              <label className="ap-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.hienThi}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hienThi: e.target.checked }))
                  }
                />
                Hiển thị trên cửa hàng (bỏ chọn để đặt Tạm ẩn)
              </label>

              <div className="ap-modal-actions">
                <button
                  type="button"
                  className="ap-btn-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="ap-btn-save" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo danh mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}