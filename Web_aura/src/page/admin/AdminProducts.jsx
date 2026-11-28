import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { adminFetch, adminUpload, resolveImageUrl } from '../../utils/api';
import '../css/adminProducts.css';

const PAGE_LIMIT_OPTIONS = [10, 20, 50];

const STATUS_BADGE = {
  DANG_BAN: { label: 'Đang bán', className: 'selling' },
  SAP_HET: { label: 'Sắp hết', className: 'low' },
  HET_HANG: { label: 'Hết hàng', className: 'out' },
  TAM_AN: { label: 'Tạm ẩn', className: 'hidden' },
};

const EMPTY_FORM = {
  maDanhMuc: '',
  maHienThi: '',
  tenSanPham: '',
  moTa: '',
  giaBan: '',
  hoTroIn: false,
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
  initialCategoryId = null,
  onNavigate,
  onLogout,
  onBackToStore,
}) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [pageLimit, setPageLimit] = useState(10);
  const [page, setPage] = useState(1);

  const [stats, setStats] = useState({
    tongSanPham: 0,
    hoTroIn: 0,
    hetHang: 0,
    sapHetHang: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Modal Thêm / Sửa sản phẩm
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [variantRows, setVariantRows] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Dialog xác nhận xóa / ẩn sản phẩm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const leafCategories = useMemo(
    () => categories.filter((c) => c.isLeaf),
    [categories]
  );

  const selectedFormCategory = useMemo(
    () => categories.find((c) => Number(c.MaDanhMuc) === Number(form.maDanhMuc)),
    [categories, form.maDanhMuc]
  );

  const isPrintAllowed = Boolean(selectedFormCategory?.printEligible);

  const showToast = (msg) => {
    setNotice(msg);
  };

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 3800);
    return () => clearTimeout(t);
  }, [notice]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageLimit),
      status: statusFilter,
      sort: sortBy,
    });
    if (search.trim()) params.set('search', search.trim());
    if (selectedCategory) params.set('categoryId', String(selectedCategory));

    try {
      const data = await adminFetch(`/api/admin/products?${params}`);
      setStats(data.stats);
      setLowStockProducts(data.lowStockProducts || []);
      setCategories(data.categories || []);
      setSizes(data.sizes || []);
      setColors(data.colors || []);
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
  }, [page, pageLimit, search, selectedCategory, statusFilter, sortBy, onLogout]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 180);
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

  const makeDefaultVariantRow = () => ({
    key: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    maBienThe: null,
    maMauSac: colors[0]?.MaMauSac ? String(colors[0].MaMauSac) : '',
    maKichThuoc: sizes[0]?.MaKichThuoc ? String(sizes[0].MaKichThuoc) : '',
    soLuongTon: '10',
  });

  const openCreateModal = () => {
    const defaultCat = leafCategories[0];
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      maDanhMuc: defaultCat?.MaDanhMuc ? String(defaultCat.MaDanhMuc) : '',
      hoTroIn: Boolean(defaultCat?.printEligible),
    });
    setVariantRows([makeDefaultVariantRow()]);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = async (product) => {
    const matchedCat = categories.find(
      (c) => Number(c.MaDanhMuc) === Number(product.MaDanhMuc)
    );
    const safeCatId = matchedCat?.isLeaf
      ? String(product.MaDanhMuc)
      : leafCategories[0]?.MaDanhMuc
        ? String(leafCategories[0].MaDanhMuc)
        : '';

    setEditingId(product.MaSanPham);
    setForm({
      maDanhMuc: safeCatId,
      maHienThi: product.MaHienThi,
      tenSanPham: product.TenSanPham,
      moTa: product.MoTa || '',
      giaBan: String(product.GiaBan),
      hoTroIn: Boolean(product.HoTroIn && (matchedCat?.printEligible ?? false)),
      noiBat: product.NoiBat,
      dangKinhDoanh: product.DangKinhDoanh,
      anhDaiDien: product.AnhDaiDien || '',
    });
    setVariantRows([]);
    setFormError('');
    setModalOpen(true);

    setVariantsLoading(true);
    try {
      const data = await adminFetch(`/api/admin/products/${product.MaSanPham}/variants`);
      setVariantRows(
        (data.variants || []).map((v) => ({
          key: `db-${v.MaBienThe}`,
          maBienThe: v.MaBienThe,
          maMauSac: String(v.MaMauSac),
          maKichThuoc: String(v.MaKichThuoc),
          soLuongTon: String(v.SoLuongTon),
        }))
      );
    } catch (err) {
      setFormError(err.message);
    } finally {
      setVariantsLoading(false);
    }
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingImg(true);
    setFormError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminUpload('/api/admin/products/upload-image', fd);
      setForm((f) => ({ ...f, anhDaiDien: res.url }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const handleAddVariantRow = () => {
    setVariantRows((prev) => {
      // Tìm cặp màu x size chưa dùng nếu có
      const used = new Set(prev.map((r) => `${r.maMauSac}-${r.maKichThuoc}`));
      let nextColor = colors[0]?.MaMauSac ? String(colors[0].MaMauSac) : '';
      let nextSize = sizes[0]?.MaKichThuoc ? String(sizes[0].MaKichThuoc) : '';
      outer: for (const sz of sizes) {
        for (const cl of colors) {
          const pair = `${cl.MaMauSac}-${sz.MaKichThuoc}`;
          if (!used.has(pair)) {
            nextColor = String(cl.MaMauSac);
            nextSize = String(sz.MaKichThuoc);
            break outer;
          }
        }
      }
      return [
        ...prev,
        {
          key: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          maBienThe: null,
          maMauSac: nextColor,
          maKichThuoc: nextSize,
          soLuongTon: '10',
        },
      ];
    });
  };

  const handleUpdateVariantRow = (key, field, value) => {
    setVariantRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    );
  };

  const handleRemoveVariantRow = (key) => {
    setVariantRows((prev) => prev.filter((r) => r.key !== key));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setFormError('');

    const seenPairs = new Set();
    for (let i = 0; i < variantRows.length; i += 1) {
      const r = variantRows[i];
      if (!r.maMauSac || !r.maKichThuoc) {
        setFormError(`Biến thể dòng ${i + 1}: Vui lòng chọn đầy đủ Màu sắc và Kích cỡ.`);
        return;
      }
      const pair = `${r.maMauSac}-${r.maKichThuoc}`;
      if (seenPairs.has(pair)) {
        setFormError('Không thể có 2 dòng biến thể trùng cùng Màu sắc và Kích cỡ.');
        return;
      }
      seenPairs.add(pair);
    }

    setSaving(true);
    const path = editingId
      ? `/api/admin/products/${editingId}`
      : '/api/admin/products';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await adminFetch(path, {
        method,
        body: JSON.stringify({
          ...form,
          maDanhMuc: Number(form.maDanhMuc),
          giaBan: Number(form.giaBan),
          hoTroIn: isPrintAllowed ? form.hoTroIn : false,
          variants: variantRows.map((r) => ({
            maBienThe: r.maBienThe || undefined,
            maMauSac: Number(r.maMauSac),
            maKichThuoc: Number(r.maKichThuoc),
            soLuongTon: Math.max(0, Number(r.soLuongTon) || 0),
          })),
        }),
      });
      setModalOpen(false);
      showToast(res.message || 'Đã lưu');
      fetchProducts();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/admin/products/${deleteTarget.MaSanPham}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      showToast(res.message || 'Đã cập nhật sản phẩm');
      fetchProducts();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
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
            Toàn bộ định danh trang phục, biến thể kích cỡ/màu sắc, tồn kho và thiết lập in ấn DTG.
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
          <button
            type="button"
            className={`ap-kpi-mini ap-kpi-btn ${statusFilter === 'out_of_stock' ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter((prev) =>
                prev === 'out_of_stock' ? 'all' : 'out_of_stock'
              );
              setPage(1);
            }}
            title="Bấm để lọc các sản phẩm hết hàng (gồm cả sản phẩm chưa có biến thể)"
          >
            <p className="ap-kpi-mini-label">HẾT HÀNG</p>
            <p className="ap-kpi-mini-value danger">
              {String(stats.hetHang).padStart(2, '0')}
            </p>
          </button>
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
              placeholder="Tìm kiếm theo mã SKU, tên sản phẩm, danh mục..."
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

            {categories
              .filter((cat) => cat.MaDanhMucCha === null)
              .map((cat) => (
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

            {selectedCategory !== null &&
              categories.some(
                (c) =>
                  c.MaDanhMuc === selectedCategory && c.MaDanhMucCha !== null
              ) && (() => {
                const sub = categories.find(
                  (c) => c.MaDanhMuc === selectedCategory
                );
                return (
                  <span className="ap-cat-pill active">
                    {sub.ParentName} · {sub.TenDanhMuc} ({sub.soSanPham})
                  </span>
                );
              })()}
          </div>

          <div className="ap-filter-controls">
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
                <option value="all">Tất cả trạng thái</option>
                <option value="selling">Đang bán</option>
                <option value="low_stock">Sắp hết (≤ 5)</option>
                <option value="out_of_stock">Hết hàng</option>
                <option value="hidden">Tạm ẩn</option>
              </select>
            </div>

            <div className="ap-status-filter">
              <span className="ap-status-label">SẮP XẾP:</span>
              <select
                className="ap-status-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá: Thấp → Cao</option>
                <option value="price_desc">Giá: Cao → Thấp</option>
                <option value="stock_asc">Tồn kho: Thấp → Cao</option>
                <option value="stock_desc">Tồn kho: Cao → Thấp</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {notice && (
        <div className="ap-toast-success">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{notice}</span>
          </div>
          <button
            type="button"
            className="ap-alert-close"
            onClick={() => setNotice('')}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
                <th>TỒN KHO</th>
                <th>HỖ TRỢ IN</th>
                <th>NỔI BẬT</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="aura-empty-cell">
                    Đang tải danh sách sản phẩm...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="aura-empty-cell">
                    Không có sản phẩm nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                products.map((product, idx) => {
                  const rowNum = String(startItem + idx).padStart(2, '0');
                  const statusMeta =
                    STATUS_BADGE[product.TrangThai] || STATUS_BADGE.DANG_BAN;
                  const stockCount = Number(product.TongTonKho || 0);
                  const imgUrl = resolveImageUrl(product.AnhDaiDien);

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
                          {imgUrl ? (
                            <img src={imgUrl} alt={product.TenSanPham} />
                          ) : (
                            <ImageOff size={18} />
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="ap-prod-name">{product.TenSanPham}</div>
                        <div className="ap-prod-sku">{product.MaHienThi}</div>
                        <span className="ap-variant-chip">
                          {product.SoBienThe > 0
                            ? `${product.SoMau} Màu / ${product.SoKichCo} Kích cỡ`
                            : 'Chưa có biến thể'}
                        </span>
                      </td>
                      <td>
                        <span className="ap-cat-badge">
                          {product.TenDanhMucCha
                            ? `${product.TenDanhMucCha} · ${product.TenDanhMuc}`
                            : product.TenDanhMuc}
                        </span>
                      </td>
                      <td className="ap-price-cell">
                        {formatNumber(product.GiaBan)}
                        <span className="ap-price-unit">VND</span>
                      </td>
                      <td>
                        {stockCount === 0 ? (
                          <span className="ap-inv-pill out">0 · Hết hàng</span>
                        ) : stockCount <= 5 ? (
                          <span className="ap-inv-pill low">{stockCount} · Sắp hết</span>
                        ) : (
                          <span className="ap-inv-pill ok">{formatNumber(stockCount)}</span>
                        )}
                      </td>
                      <td>
                        {product.HoTroIn ? (
                          <span className="ap-print-pill dtg">• IN DTG &amp; LỤA</span>
                        ) : (
                          <span className="ap-print-dash">—</span>
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
                      <td>
                        <div
                          className="ap-action-btns"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="ap-icon-btn"
                            title="Chỉnh sửa"
                            aria-label={`Chỉnh sửa ${product.TenSanPham}`}
                            onClick={() => openEditModal(product)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="ap-icon-btn danger"
                            title="Xóa sản phẩm"
                            aria-label={`Xóa ${product.TenSanPham}`}
                            onClick={() => setDeleteTarget(product)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang + chọn số dòng */}
        <div className="ap-pagination">
          <div className="ap-pagination-left">
            <span className="ap-pagination-info">
              Hiển thị <strong>{startItem} - {endItem}</strong> trong tổng số{' '}
              <strong>{pagination.total}</strong> sản phẩm
            </span>

            <label className="ap-limit-picker">
              <span>Hiển thị:</span>
              <select
                className="ap-status-select"
                value={pageLimit}
                onChange={(e) => {
                  setPageLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_LIMIT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} dòng
                  </option>
                ))}
              </select>
            </label>
          </div>

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

      {/* 1 thẻ cảnh báo "Sắp hết hàng" lấy dữ liệu thật */}
      <section className="ap-lowstock-card">
        <div className="ap-lowstock-head">
          <div>
            <p className="ap-info-eyebrow">CẢNH BÁO TỒN KHO THỰC TẾ</p>
            <h3 className="ap-info-title">
              Sản phẩm sắp hết hàng (≤ 5): {stats.sapHetHang} sản phẩm
            </h3>
          </div>
          {stats.sapHetHang > 0 && (
            <button
              type="button"
              className="ap-info-link"
              onClick={() => {
                setStatusFilter('low_stock');
                setPage(1);
              }}
            >
              LỌC DANH SÁCH SẮP HẾT →
            </button>
          )}
        </div>

        {lowStockProducts.length === 0 ? (
          <p className="ap-lowstock-empty">
            Hiện chưa có sản phẩm nào ở ngưỡng tồn kho thấp (1–5 sản phẩm).
          </p>
        ) : (
          <div className="ap-lowstock-list">
            {lowStockProducts.map((item) => (
              <div key={item.MaSanPham} className="ap-lowstock-item">
                <div>
                  <strong>{item.TenSanPham}</strong>
                  <span>
                    {item.MaHienThi} · {item.TenDanhMuc}
                  </span>
                </div>
                <span className="ap-inv-pill low">Còn {item.TongTonKho}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dialog xác nhận xóa / ẩn sản phẩm */}
      {deleteTarget && (
        <div
          className="aura-modal-backdrop"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="aura-modal ac-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aura-modal-header">
              <h3>Xác nhận xóa sản phẩm</h3>
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
              <div className="ac-confirm-box">
                <span className="ac-confirm-icon">
                  <AlertTriangle size={20} />
                </span>
                <p>
                  Bạn có chắc chắn muốn xóa sản phẩm{' '}
                  <strong>&ldquo;{deleteTarget.TenSanPham}&rdquo;</strong>? Nếu sản
                  phẩm đã phát sinh đơn hàng, hệ thống sẽ tự động chuyển sang{' '}
                  <strong>Tạm ẩn</strong> để bảo toàn lịch sử đơn; nếu chưa có đơn sẽ
                  xóa vĩnh viễn.
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
                  className="ac-btn-danger"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                >
                  {deleting ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm / Sửa sản phẩm + Biến thể + Upload ảnh */}
      {modalOpen && (
        <div className="aura-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="aura-modal ap-modal ap-modal-wide" onClick={(e) => e.stopPropagation()}>
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
                  <label className="ap-field-label">Danh mục (chỉ chọn danh mục lá) *</label>
                  <select
                    className="ap-field-select"
                    value={form.maDanhMuc}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const cat = categories.find(
                        (c) => Number(c.MaDanhMuc) === Number(nextId)
                      );
                      setForm((f) => ({
                        ...f,
                        maDanhMuc: nextId,
                        hoTroIn: cat?.printEligible ? f.hoTroIn : false,
                      }));
                    }}
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {leafCategories.map((cat) => (
                      <option key={cat.MaDanhMuc} value={cat.MaDanhMuc}>
                        {cat.ParentName
                          ? `${cat.ParentName} — ${cat.TenDanhMuc}`
                          : cat.TenDanhMuc}
                        {!cat.EffectiveHienThi ? ' [Đang ẩn]' : ''}
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
                    placeholder="349000"
                    value={form.giaBan}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, giaBan: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="ap-field-label">Ảnh đại diện</label>
                  <div className="ap-upload-row">
                    <div className="ap-upload-preview">
                      {form.anhDaiDien ? (
                        <img
                          src={resolveImageUrl(form.anhDaiDien)}
                          alt="Xem trước"
                        />
                      ) : (
                        <ImageOff size={18} />
                      )}
                    </div>
                    <div className="ap-upload-controls">
                      <label className="ap-upload-btn">
                        <Upload size={14} />
                        <span>{uploadingImg ? 'Đang tải...' : 'Chọn ảnh từ máy'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          hidden
                          disabled={uploadingImg}
                          onChange={handleUploadImage}
                        />
                      </label>
                      <input
                        className="ap-field-input ap-path-input"
                        placeholder="Hoặc đường dẫn (/img/...)"
                        value={form.anhDaiDien}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, anhDaiDien: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="ap-form-full">
                  <label className="ap-field-label">Mô tả sản phẩm</label>
                  <textarea
                    rows={2}
                    className="ap-field-textarea"
                    placeholder="Chất liệu cotton 320 GSM, form boxy..."
                    value={form.moTa}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, moTa: e.target.value }))
                    }
                  />
                </div>

                {/* Bảng Biến thể Màu / Kích cỡ / Tồn kho */}
                <div className="ap-form-full ap-variants-box">
                  <div className="ap-variants-head">
                    <span className="ap-field-label" style={{ marginBottom: 0 }}>
                      Biến thể (Màu sắc / Kích cỡ / Tồn kho)
                    </span>
                    <button
                      type="button"
                      className="ap-variant-add-btn"
                      onClick={handleAddVariantRow}
                    >
                      <Plus size={13} />
                      <span>Thêm dòng</span>
                    </button>
                  </div>

                  {variantsLoading ? (
                    <p className="ap-variants-empty">Đang tải danh sách biến thể...</p>
                  ) : variantRows.length === 0 ? (
                    <p className="ap-variants-empty">
                      Chưa có biến thể nào. Sản phẩm không có biến thể sẽ tính là Hết hàng (tồn kho = 0).
                    </p>
                  ) : (
                    <div className="ap-variants-table-wrap">
                      <table className="ap-variants-table">
                        <thead>
                          <tr>
                            <th>Màu sắc</th>
                            <th>Kích cỡ</th>
                            <th>Tồn kho</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {variantRows.map((row) => (
                            <tr key={row.key}>
                              <td>
                                <select
                                  className="ap-field-select"
                                  value={row.maMauSac}
                                  onChange={(e) =>
                                    handleUpdateVariantRow(row.key, 'maMauSac', e.target.value)
                                  }
                                >
                                  <option value="">-- Màu --</option>
                                  {colors.map((c) => (
                                    <option key={c.MaMauSac} value={c.MaMauSac}>
                                      {c.TenMau}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <select
                                  className="ap-field-select"
                                  value={row.maKichThuoc}
                                  onChange={(e) =>
                                    handleUpdateVariantRow(row.key, 'maKichThuoc', e.target.value)
                                  }
                                >
                                  <option value="">-- Size --</option>
                                  {sizes.map((s) => (
                                    <option key={s.MaKichThuoc} value={s.MaKichThuoc}>
                                      {s.TenKichThuoc}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  className="ap-field-input"
                                  value={row.soLuongTon}
                                  onChange={(e) =>
                                    handleUpdateVariantRow(row.key, 'soLuongTon', e.target.value)
                                  }
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="ap-icon-btn danger"
                                  title="Xóa dòng biến thể"
                                  onClick={() => handleRemoveVariantRow(row.key)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="ap-form-full ap-checkbox-row">
                  {isPrintAllowed && (
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
                  )}

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
