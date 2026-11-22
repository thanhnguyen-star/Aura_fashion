import { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Star,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  X,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { adminFetch } from '../../utils/api';
import '../css/adminProducts.css';

const PAGE_LIMIT = 4;

const STATUS_BADGE = {
  DANG_BAN: { label: 'Đang bán', className: 'selling' },
  HET_HANG: { label: 'Hết hàng', className: 'out' },
  TAM_AN: { label: 'Tạm ẩn', className: 'hidden' },
};

const EMPTY_FORM = {
  maDanhMuc: '',
  maHienThi: '',
  tenSanPham: '',
  moTa: '',
  giaBan: '',
  hoTroIn: true,
  noiBat: false,
  dangKinhDoanh: true,
  anhDaiDien: '',
};

function formatNumber(n) {
  return new Intl.NumberFormat('vi-VN').format(Number(n) || 0);
}

function buildPageNumbers(current, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = [1];
  if (current > 3) pages.push('...');
  for (let p = Math.max(2, current - 1); p <= Math.min(totalPages - 1, current + 1); p += 1) {
    pages.push(p);
  }
  if (current < totalPages - 2) pages.push('...');
  pages.push(totalPages);
  return pages;
}

export default function AdminProducts({
  adminUser,
  onNavigate,
  onLogout,
  onBackToStore,
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [stats, setStats] = useState({ tongSanPham: 0, hoTroIn: 0, hetHang: 0 });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal Thêm / Sửa sản phẩm
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_LIMIT),
      status: statusFilter,
    });
    if (search.trim()) params.set('search', search.trim());
    if (selectedCategory) params.set('categoryId', String(selectedCategory));

    try {
      const data = await adminFetch(`/api/admin/products?${params}`);
      setStats(data.stats);
      setCategories(data.categories || []);
      setProducts(data.products || []);
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
  }, [page, search, selectedCategory, statusFilter, onLogout]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 200);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handleToggleFeatured = async (e, product) => {
    e.stopPropagation();
    const nextValue = !product.NoiBat;

    setProducts((prev) =>
      prev.map((p) =>
        p.MaSanPham === product.MaSanPham ? { ...p, NoiBat: nextValue } : p
      )
    );

    try {
      await adminFetch(`/api/admin/products/${product.MaSanPham}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ noiBat: nextValue }),
      });
    } catch {
      fetchProducts();
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      maDanhMuc: categories[0]?.MaDanhMuc ? String(categories[0].MaDanhMuc) : '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingId(product.MaSanPham);
    setForm({
      maDanhMuc: String(product.MaDanhMuc),
      maHienThi: product.MaHienThi,
      tenSanPham: product.TenSanPham,
      moTa: product.MoTa || '',
      giaBan: String(product.GiaBan),
      hoTroIn: product.HoTroIn,
      noiBat: product.NoiBat,
      dangKinhDoanh: product.DangKinhDoanh,
      anhDaiDien: product.AnhDaiDien || '',
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    const path = editingId
      ? `/api/admin/products/${editingId}`
      : '/api/admin/products';
    const method = editingId ? 'PUT' : 'POST';

    try {
      await adminFetch(path, {
        method,
        body: JSON.stringify({
          ...form,
          maDanhMuc: Number(form.maDanhMuc),
          giaBan: Number(form.giaBan),
        }),
      });
      setModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startItem =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);
  const pageList = buildPageNumbers(pagination.page, pagination.totalPages);

  return (
    <AdminLayout
      activeMenu="products"
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
      {/* Tiêu đề & 3 thẻ KPI */}
      <div className="ap-header-bar">
        <div>
          <p className="ap-eyebrow">
            KHO LƯU TRỮ THIẾT KẾ / <span>BỘ SƯU TẬP GARMENTS</span>
          </p>
          <h1 className="aura-page-title">Quản lý sản phẩm</h1>
          <p className="ap-subtitle">
            Toàn bộ định danh trang phục cơ bản, định mức dệt may và thiết lập in ấn ấn bản DTG cao cấp.
          </p>
        </div>

        <div className="ap-kpi-strip">
          <div className="ap-kpi-mini">
            <p className="ap-kpi-mini-label">TỔNG SẢN PHẨM</p>
            <p className="ap-kpi-mini-value">{formatNumber(stats.tongSanPham)}</p>
          </div>
          <div className="ap-kpi-mini">
            <p className="ap-kpi-mini-label">HỖ TRỢ IN DTG</p>
            <p className="ap-kpi-mini-value">{formatNumber(stats.hoTroIn)}</p>
          </div>
          <div className="ap-kpi-mini">
            <p className="ap-kpi-mini-label">HẾT HÀNG / CHỜ DỆT</p>
            <p className="ap-kpi-mini-value danger">
              {String(stats.hetHang).padStart(2, '0')}
            </p>
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm & lọc */}
      <section className="ap-toolbar">
        <div className="ap-toolbar-top">
          <div className="ap-search-field">
            <Search size={15} className="ap-search-icon" />
            <input
              type="text"
              className="ap-search-input"
              placeholder="Tìm kiếm theo mã SKU, tên mẫu vải, phân loại..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <button type="button" className="ap-add-btn" onClick={openCreateModal}>
            <Plus size={15} strokeWidth={2.2} />
            <span>THÊM SẢN PHẨM MỚI</span>
          </button>
        </div>

        <div className="ap-toolbar-bottom">
          <div className="ap-category-tabs">
            <button
              type="button"
              className={`ap-cat-pill ${selectedCategory === null ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(null);
                setPage(1);
              }}
            >
              Tất cả ({stats.tongSanPham})
            </button>

            {categories.map((cat) => (
              <button
                key={cat.MaDanhMuc}
                type="button"
                className={`ap-cat-pill ${
                  selectedCategory === cat.MaDanhMuc ? 'active' : ''
                }`}
                onClick={() => {
                  setSelectedCategory(cat.MaDanhMuc);
                  setPage(1);
                }}
              >
                {cat.TenDanhMuc} ({cat.soSanPham})
              </button>
            ))}
          </div>

          <div className="ap-status-filter">
            <span className="ap-status-label">TRẠNG THÁI:</span>
            <select
              className="ap-status-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Toàn bộ kho</option>
              <option value="selling">Đang bán</option>
              <option value="out_of_stock">Hết hàng</option>
              <option value="hidden">Tạm ẩn</option>
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div className="aura-login-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Bảng danh sách sản phẩm */}
      <section className="aura-card">
        <div className="aura-table-wrap">
          <table className="aura-table ap-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ẢNH</th>
                <th>TÊN SẢN PHẨM &amp; SKU</th>
                <th>DANH MỤC</th>
                <th>GIÁ NIÊM YẾT</th>
                <th>HỖ TRỢ IN</th>
                <th>NỔI BẬT</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="aura-empty-cell">
                    Đang tải danh sách sản phẩm...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="aura-empty-cell">
                    Không có sản phẩm nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                products.map((product, idx) => {
                  const rowNum = String(startItem + idx).padStart(2, '0');
                  const statusMeta =
                    STATUS_BADGE[product.TrangThai] || STATUS_BADGE.DANG_BAN;

                  return (
                    <tr
                      key={product.MaSanPham}
                      className="ap-row-clickable"
                      onClick={() => openEditModal(product)}
                      title="Bấm để chỉnh sửa sản phẩm"
                    >
                      <td className="ap-index">{rowNum}</td>
                      <td>
                        <div className="ap-thumb">
                          {product.AnhDaiDien ? (
                            <img src={product.AnhDaiDien} alt={product.TenSanPham} />
                          ) : (
                            <ImageOff size={18} />
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="ap-prod-name">{product.TenSanPham}</div>
                        <div className="ap-prod-sku">{product.MaHienThi}</div>
                        <span className="ap-variant-chip">
                          {product.SoMau} Màu / {product.SoKichCo} Kích cỡ
                        </span>
                      </td>
                      <td>
                        <span className="ap-cat-badge">{product.TenDanhMuc}</span>
                      </td>
                      <td className="ap-price-cell">
                        {formatNumber(product.GiaBan)}
                        <span className="ap-price-unit">VND</span>
                      </td>
                      <td>
                        {product.HoTroIn ? (
                          <span className="ap-print-pill dtg">• IN DTG &amp; LỤA</span>
                        ) : (
                          <span className="ap-print-pill plain">ÁO TRƠN</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`ap-star-btn ${product.NoiBat ? 'active' : ''}`}
                          onClick={(e) => handleToggleFeatured(e, product)}
                          aria-label="Đánh dấu nổi bật"
                        >
                          <Star
                            size={17}
                            fill={product.NoiBat ? '#1d53d4' : 'none'}
                            strokeWidth={1.8}
                          />
                        </button>
                      </td>
                      <td>
                        <span className={`ap-stock-pill ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="ap-pagination">
          <span className="ap-pagination-info">
            Hiển thị <strong>{startItem} - {endItem}</strong> trong tổng số{' '}
            <strong>{pagination.total}</strong> sản phẩm
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

            {pageList.map((item, idx) =>
              item === '...' ? (
                <span key={`ellipsis-${idx}`} className="ap-page-ellipsis">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`ap-page-btn ${pagination.page === item ? 'active' : ''}`}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              )
            )}

            <button
              type="button"
              className="ap-page-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* 3 thẻ quy chuẩn kỹ thuật cuối trang */}
      <section className="ap-info-grid">
        <article className="ap-info-card">
          <div>
            <p className="ap-info-eyebrow">QUY CHUẨN DỆT MAY</p>
            <h3 className="ap-info-title">Định lượng sợi 280 - 350 GSM</h3>
            <p className="ap-info-desc">
              Tất cả sản phẩm phôi áo thun và áo nỉ đáp ứng tiêu chuẩn xử lý co rút vải trước khi áp dụng công nghệ in ấn kỹ thuật số DTG nhằm bảo toàn tối đa gam màu.
            </p>
          </div>
          <button type="button" className="ap-info-link">
            XEM TÀI LIỆU TIÊU CHUẨN →
          </button>
        </article>

        <article className="ap-info-card">
          <div>
            <p className="ap-info-eyebrow">MỰC IN &amp; ĐẦU PHUN</p>
            <h3 className="ap-info-title">Hệ màu Kornit NeoPigment™</h3>
            <p className="ap-info-desc">
              Đảm bảo sản phẩm có gắn nhãn &ldquo;Hỗ trợ in DTG&rdquo; hiển thị chuẩn xác độ phủ hạt mực gốc nước, an toàn tuyệt đối với da và bền vững qua nhiều chu kỳ giặt.
            </p>
          </div>
          <button type="button" className="ap-info-link">
            KIỂM TRA HỒ SƠ MÀU ICC →
          </button>
        </article>

        <article className="ap-info-card">
          <div>
            <p className="ap-info-eyebrow">TỐI ƯU HÀNG TỒN KHO</p>
            <h3 className="ap-info-title">Tự động cảnh báo ngưỡng tồn</h3>
            <p className="ap-info-desc">
              Hệ thống sẽ chuyển trạng thái sang &ldquo;Chờ dệt&rdquo; và gửi thông báo khi số lượng biến thể size rơi xuống dưới 10 sản phẩm trong mỗi kho thành phẩm.
            </p>
          </div>
          <button type="button" className="ap-info-link">
            CẤU HÌNH GIỚI HẠN KHO →
          </button>
        </article>
      </section>

      {/* Modal Thêm / Sửa sản phẩm */}
      {modalOpen && (
        <div className="aura-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="aura-modal ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aura-modal-header">
              <h3>{editingId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
              <button
                type="button"
                className="aura-icon-btn"
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form className="aura-modal-body" onSubmit={handleSaveProduct}>
              {formError && <div className="aura-login-error">{formError}</div>}

              <div className="ap-form-grid">
                <div>
                  <label className="ap-field-label">Mã SKU hiển thị *</label>
                  <input
                    className="ap-field-input"
                    placeholder="SKU-AURA-BX01"
                    value={form.maHienThi}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maHienThi: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="ap-field-label">Danh mục *</label>
                  <select
                    className="ap-field-select"
                    value={form.maDanhMuc}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maDanhMuc: e.target.value }))
                    }
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((cat) => (
                      <option key={cat.MaDanhMuc} value={cat.MaDanhMuc}>
                        {cat.TenDanhMuc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ap-form-full">
                  <label className="ap-field-label">Tên sản phẩm *</label>
                  <input
                    className="ap-field-input"
                    placeholder="Áo Thun Boxy Heavyweight 320 GSM"
                    value={form.tenSanPham}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tenSanPham: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="ap-field-label">Giá niêm yết (VND) *</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    className="ap-field-input"
                    placeholder="450000"
                    value={form.giaBan}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, giaBan: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="ap-field-label">Đường dẫn ảnh đại diện</label>
                  <input
                    className="ap-field-input"
                    placeholder="/img/ao-thun-boxy.png"
                    value={form.anhDaiDien}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, anhDaiDien: e.target.value }))
                    }
                  />
                </div>

                <div className="ap-form-full">
                  <label className="ap-field-label">Mô tả sản phẩm</label>
                  <textarea
                    rows={3}
                    className="ap-field-textarea"
                    placeholder="Chất liệu cotton 320 GSM, form boxy..."
                    value={form.moTa}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, moTa: e.target.value }))
                    }
                  />
                </div>

                <div className="ap-form-full ap-checkbox-row">
                  <label className="ap-checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.hoTroIn}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, hoTroIn: e.target.checked }))
                      }
                    />
                    Hỗ trợ in DTG &amp; Lụa
                  </label>

                  <label className="ap-checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.noiBat}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, noiBat: e.target.checked }))
                      }
                    />
                    Sản phẩm nổi bật
                  </label>

                  <label className="ap-checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.dangKinhDoanh}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, dangKinhDoanh: e.target.checked }))
                      }
                    />
                    Đang bán (bỏ chọn để Tạm ẩn)
                  </label>
                </div>
              </div>

              <div className="ap-modal-actions">
                <button
                  type="button"
                  className="ap-btn-cancel"
                  onClick={() => setModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="ap-btn-save" disabled={saving}>
                  {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}