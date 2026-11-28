import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  ImageOff,
  Pencil,
  Plus,
  Search,
  Shapes,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import AdminLayout from './AdminLayout';
import { adminFetch, adminUpload, resolveImageUrl } from '../../utils/api';
import '../css/adminCategories.css';

const PAGE_LIMIT = 6;

const SORT_OPTIONS = [
  { id: 'order_asc', label: 'Thứ tự cửa hàng (Mặc định)' },
  { id: 'id_desc', label: 'Mới nhất trước' },
  { id: 'name_asc', label: 'Tên danh mục (A → Z)' },
  { id: 'products_desc', label: 'Số sản phẩm nhiều nhất' },
];

const EMPTY_FORM = {
  maDanhMucCha: '',
  tenDanhMuc: '',
  slug: '',
  moTa: '',
  anhDaiDien: '',
  hienThi: true,
};

function toSlug(text = '') {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function padTwo(n) {
  return String(Number(n) || 0).padStart(2, '0');
}

function getInitialLetter(name) {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'A';
}

function CategoryThumb({ src, name, size = 'sm' }) {
  const [failedSrc, setFailedSrc] = useState('');
  const resolvedSrc = resolveImageUrl(src);
  const showImage = Boolean(resolvedSrc) && failedSrc !== resolvedSrc;
  const cls = size === 'lg' ? 'ac-thumb ac-thumb-lg' : 'ac-thumb';

  if (showImage) {
    return (
      <div className={cls}>
        <img
          src={resolvedSrc}
          alt={name}
          onError={() => setFailedSrc(resolvedSrc)}
        />
      </div>
    );
  }

  return (
    <div className={`${cls} ac-thumb-fallback`} aria-label={name}>
      <span>{getInitialLetter(name)}</span>
    </div>
  );
}

export default function AdminCategories({
  adminUser,
  onNavigate,
  onLogout,
  onBackToStore,
  onViewCategoryOnStore,
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | hidden | empty
  const [sortBy, setSortBy] = useState('order_asc');
  const [page, setPage] = useState(1);

  const [showSortMenu, setShowSortMenu] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState(() => new Set());

  const [stats, setStats] = useState({
    tongDanhMuc: 0,
    dangKichHoat: 0,
    tamAn: 0,
    tyLeTrucTuyen: 0,
    tongSanPham: 0,
    danhMucChuaCoSanPham: 0,
  });
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [isTreeMode, setIsTreeMode] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Modal Thêm / Sửa danh mục
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [originalSlug, setOriginalSlug] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugEdited, setSlugEdited] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Dialog xác nhận xóa danh mục
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Modal chuyển sản phẩm sang danh mục khác
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferDestId, setTransferDestId] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 3800);
    return () => clearTimeout(t);
  }, [notice]);

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
      setAllCategories(data.allCategories || []);
      setIsTreeMode(Boolean(data.isTreeMode));
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
    const timer = setTimeout(fetchCategories, 180);
    return () => clearTimeout(timer);
  }, [fetchCategories]);

  useEffect(() => {
    const closeMenus = () => {
      setShowSortMenu(false);
    };
    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  const siblingBounds = useMemo(() => {
    const groups = new Map();
    for (const item of allCategories) {
      const key = item.MaDanhMucCha ?? 'root';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item.MaDanhMuc);
    }
    const bounds = new Map();
    for (const list of groups.values()) {
      list.forEach((id, idx) => {
        bounds.set(id, { isFirst: idx === 0, isLast: idx === list.length - 1 });
      });
    }
    return bounds;
  }, [allCategories]);

  const disallowedParentIds = useMemo(() => {
    if (!editingId) return new Set();
    const blocked = new Set([editingId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const item of allCategories) {
        if (item.MaDanhMucCha && blocked.has(item.MaDanhMucCha) && !blocked.has(item.MaDanhMuc)) {
          blocked.add(item.MaDanhMuc);
          changed = true;
        }
      }
    }
    return blocked;
  }, [editingId, allCategories]);

  const computeAutoSlug = (name, parentId, currentId = null) => {
    const base = toSlug(name);
    if (!base) return '';
    const parent = parentId
      ? allCategories.find((c) => Number(c.MaDanhMuc) === Number(parentId))
      : null;
    const candidate = parent?.Slug ? `${parent.Slug}-${base}` : base;

    const existingSlugs = new Set(
      allCategories
        .filter((c) => Number(c.MaDanhMuc) !== Number(currentId))
        .map((c) => c.Slug)
    );
    if (!existingSlugs.has(candidate)) return candidate;

    let idx = 2;
    while (existingSlugs.has(`${candidate}-${idx}`)) {
      idx += 1;
    }
    return `${candidate}-${idx}`;
  };

  const handleSelectFilter = (nextFilter) => {
    setStatusFilter(nextFilter);
    setPage(1);
  };

  const toggleCollapse = (parentId) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

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

  const handleMoveOrder = async (cat, direction) => {
    try {
      await adminFetch('/api/admin/categories/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ id: cat.MaDanhMuc, direction }),
      });
      fetchCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setOriginalSlug('');
    setForm(EMPTY_FORM);
    setSlugEdited(false);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingId(cat.MaDanhMuc);
    setOriginalSlug(cat.Slug || '');
    setForm({
      maDanhMucCha: cat.MaDanhMucCha ? String(cat.MaDanhMucCha) : '',
      tenDanhMuc: cat.TenDanhMuc,
      slug: cat.Slug || '',
      moTa: cat.MoTa || '',
      anhDaiDien: cat.AnhDaiDien || '',
      hienThi: cat.HienThi,
    });
    setSlugEdited(true);
    setFormError('');
    setModalOpen(true);
  };

  const handleUploadCategoryImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingImg(true);
    setFormError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminUpload('/api/admin/categories/upload-image', fd);
      setForm((f) => ({ ...f, anhDaiDien: res.url }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setUploadingImg(false);
    }
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
      const res = await adminFetch(path, {
        method,
        body: JSON.stringify({
          maDanhMucCha: form.maDanhMucCha ? Number(form.maDanhMucCha) : null,
          tenDanhMuc: form.tenDanhMuc,
          slug: form.slug,
          moTa: form.moTa,
          anhDaiDien: form.anhDaiDien,
          hienThi: form.hienThi,
        }),
      });
      setModalOpen(false);
      setNotice(res.message || 'Đã lưu danh mục');
      fetchCategories();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openTransferModal = (cat) => {
    const leafTargets = allCategories.filter(
      (c) => c.isLeaf && Number(c.MaDanhMuc) !== Number(cat.MaDanhMuc)
    );
    setTransferTarget(cat);
    setTransferDestId(leafTargets[0]?.MaDanhMuc ? String(leafTargets[0].MaDanhMuc) : '');
    setTransferError('');
  };

  const handleConfirmTransfer = async (e) => {
    e.preventDefault();
    if (!transferTarget || !transferDestId) return;
    setTransferError('');
    setTransferring(true);
    try {
      const res = await adminFetch(
        `/api/admin/categories/${transferTarget.MaDanhMuc}/transfer-products`,
        {
          method: 'POST',
          body: JSON.stringify({ targetCategoryId: Number(transferDestId) }),
        }
      );
      setTransferTarget(null);
      setNotice(res.message || 'Đã chuyển sản phẩm sang danh mục mới');
      fetchCategories();
    } catch (err) {
      setTransferError(err.message);
    } finally {
      setTransferring(false);
    }
  };

  const handleRequestDelete = (cat) => {
    if (cat.SoSanPham > 0 || cat.ChildrenCount > 0) {
      return;
    }
    setError('');
    setDeleteTarget(cat);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/categories/${deleteTarget.MaDanhMuc}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      fetchCategories();
    } catch (err) {
      setError(err.message);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Mã', 'Cấp cha', 'Tên danh mục', 'Đường dẫn', 'Mô tả ngắn', 'Số lượng SP', 'Trạng thái'];
    const rows = categories.map((c) => [
      c.MaDanhMuc,
      c.ParentName || 'Cấp 1',
      c.TenDanhMuc,
      c.DuongDan || `/danh-muc/${c.Slug}`,
      c.MoTa,
      c.SoSanPham,
      c.HienThi ? 'Hiển thị' : 'Ẩn',
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

  const visibleRows = useMemo(() => {
    if (!isTreeMode) return categories;
    return categories.filter(
      (cat) => !(cat.MaDanhMucCha && collapsedIds.has(cat.MaDanhMucCha))
    );
  }, [categories, isTreeMode, collapsedIds]);

  const startItem =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(startItem + visibleRows.length - 1, pagination.total);

  const totalCount = Number(stats.tongDanhMuc) || 0;
  const activeCount = Number(stats.dangKichHoat) || 0;
  const hiddenCount = Number(stats.tamAn) || 0;
  const emptyCount = Number(stats.danhMucChuaCoSanPham) || 0;

  const activePercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
  const hiddenPercent = totalCount > 0 ? Math.round((hiddenCount / totalCount) * 100) : 0;
  const emptyPercent = totalCount > 0 ? Math.round((emptyCount / totalCount) * 100) : 0;

  const filterTabs = [
    { id: 'all', label: `Tất cả (${totalCount})` },
    { id: 'active', label: `Đang hiển thị (${activeCount})` },
    { id: 'hidden', label: `Tạm ẩn (${hiddenCount})` },
  ];

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
            Kho lưu trữ và phân loại · Aura Catalogue
          </p>
          <h1 className="aura-page-title">Danh mục sản phẩm</h1>
          <p className="ac-subtitle">
            Một nguồn dữ liệu duy nhất đồng bộ cây danh mục với Mega Menu, Sidebar lọc và sản phẩm cửa hàng.
          </p>
        </div>

        <div className="ac-header-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="ac-btn-outline"
            onClick={() => setShowSortMenu((prev) => !prev)}
          >
            <ArrowUpDown size={14} />
            <span>Sắp xếp thứ tự</span>
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
            <span>Thêm danh mục mới</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI tính từ dữ liệu thật */}
      <section className="ac-kpi-grid">
        <div
          role="button"
          tabIndex={0}
          className={`ac-kpi-card ac-kpi-clickable ${statusFilter === 'all' ? 'is-selected' : ''}`}
          onClick={() => handleSelectFilter('all')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelectFilter('all');
            }
          }}
        >
          <div className="ac-kpi-top">
            <p className="ac-kpi-label">Tổng số danh mục</p>
            <span className="ac-kpi-icon-box ac-icon-brand">
              <Shapes size={17} />
            </span>
          </div>
          <div className="ac-kpi-mid">
            <span className="ac-kpi-value">{padTwo(totalCount)}</span>
            <span className="ac-kpi-chip ac-chip-brand">Tất cả ngành hàng</span>
          </div>
          <div className="ac-progress-track">
            <div
              className={`ac-progress-bar ${totalCount === 0 ? 'gray' : 'brand'}`}
              style={{ width: totalCount > 0 ? '100%' : '0%' }}
            />
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          className={`ac-kpi-card ac-kpi-clickable ${statusFilter === 'active' ? 'is-selected' : ''}`}
          onClick={() => handleSelectFilter('active')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelectFilter('active');
            }
          }}
        >
          <div className="ac-kpi-top">
            <p className="ac-kpi-label">Đang kích hoạt</p>
            <span className="ac-kpi-icon-box ac-icon-green">
              <Eye size={17} />
            </span>
          </div>
          <div className="ac-kpi-mid">
            <span className="ac-kpi-value">{padTwo(activeCount)}</span>
            <span className={`ac-kpi-chip ${activeCount > 0 ? 'ac-chip-green' : 'ac-chip-gray'}`}>
              {activePercent}% trực tuyến
            </span>
          </div>
          <div className="ac-progress-track">
            <div
              className={`ac-progress-bar ${activeCount > 0 ? 'green' : 'gray'}`}
              style={{ width: `${activePercent}%` }}
            />
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          className={`ac-kpi-card ac-kpi-clickable ${hiddenCount === 0 ? 'is-muted' : ''} ${statusFilter === 'hidden' ? 'is-selected' : ''}`}
          onClick={() => handleSelectFilter('hidden')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelectFilter('hidden');
            }
          }}
        >
          <div className="ac-kpi-top">
            <p className="ac-kpi-label">Tạm ẩn</p>
            <span className="ac-kpi-icon-box ac-icon-gray">
              <EyeOff size={17} />
            </span>
          </div>
          <div className="ac-kpi-mid">
            <span className="ac-kpi-value">{padTwo(hiddenCount)}</span>
            <span className={`ac-kpi-chip ${hiddenCount > 0 ? 'ac-chip-amber' : 'ac-chip-gray'}`}>
              {hiddenCount > 0 ? 'Đang ẩn' : 'Không có mục ẩn'}
            </span>
          </div>
          <div className="ac-progress-track">
            <div
              className={`ac-progress-bar ${hiddenCount > 0 ? 'amber' : 'gray'}`}
              style={{ width: `${hiddenPercent}%` }}
            />
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          className={`ac-kpi-card ac-kpi-clickable ${statusFilter === 'empty' ? 'is-selected' : ''}`}
          onClick={() => handleSelectFilter('empty')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleSelectFilter('empty');
            }
          }}
        >
          <div className="ac-kpi-top">
            <p className="ac-kpi-label">Danh mục chưa có sản phẩm</p>
            <span
              className={`ac-kpi-icon-box ${emptyCount > 0 ? 'ac-icon-amber' : 'ac-icon-green'}`}
            >
              <FolderOpen size={17} />
            </span>
          </div>
          <div className="ac-kpi-mid">
            <span className="ac-kpi-value">
              {emptyCount}/{totalCount}
            </span>
            <span className={`ac-kpi-chip ${emptyCount > 0 ? 'ac-chip-amber' : 'ac-chip-green'}`}>
              {emptyCount > 0 ? 'Cần bổ sung' : 'Đã đủ sản phẩm'}
            </span>
          </div>
          <div className="ac-progress-track">
            <div
              className={`ac-progress-bar ${emptyCount > 0 ? 'amber' : 'gray'}`}
              style={{ width: `${emptyPercent}%` }}
            />
          </div>
        </div>
      </section>

      {notice && (
        <div className="ac-alert-success">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={15} />
            <span>{notice}</span>
          </span>
          <button
            type="button"
            className="ac-alert-close"
            onClick={() => setNotice('')}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="ac-alert-error">
          <span>{error}</span>
          <button
            type="button"
            className="ac-alert-close"
            onClick={() => setError('')}
            aria-label="Đóng thông báo"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Thanh công cụ bảng */}
      <div className="ac-toolbar">
        <div className="ac-filter-tabs" role="tablist" aria-label="Lọc danh mục theo trạng thái">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.id}
              className={`ac-filter-tab ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => handleSelectFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          {statusFilter === 'empty' && (
            <span className="ac-active-empty-chip">
              <span>Chưa có sản phẩm ({emptyCount})</span>
              <button
                type="button"
                onClick={() => handleSelectFilter('all')}
                aria-label="Xóa lọc danh mục trống"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>

        <div className="ac-toolbar-right">
          <div className="ac-search-box">
            <Search size={15} className="ac-search-icon" />
            <input
              type="text"
              className="ac-search-input"
              placeholder="Tìm theo tên danh mục hoặc slug..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <button
            type="button"
            className="ac-btn-outline"
            onClick={handleExportCSV}
          >
            <Download size={14} />
            <span>Xuất dữ liệu</span>
          </button>
        </div>
      </div>

      {/* Bảng danh mục dạng cây */}
      <section className="aura-card ac-table-card">
        <div className="aura-table-wrap">
          <table className="aura-table ac-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>TÊN DANH MỤC</th>
                <th className="ac-col-desc">MÔ TẢ NGẮN</th>
                <th>SỐ LƯỢNG SP</th>
                <th>TRẠNG THÁI</th>
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
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="aura-empty-cell">
                    Không có danh mục nào phù hợp.
                  </td>
                </tr>
              ) : (
                visibleRows.map((cat, idx) => {
                  const hasProducts = cat.SoSanPham > 0;
                  const hasChildren = cat.ChildrenCount > 0;
                  const cannotDelete = hasProducts || hasChildren;
                  const isChild = Boolean(cat.MaDanhMucCha);
                  const isCollapsed = collapsedIds.has(cat.MaDanhMuc);
                  const bounds = siblingBounds.get(cat.MaDanhMuc) || {
                    isFirst: true,
                    isLast: true,
                  };

                  const deleteTooltip = hasProducts
                    ? `Không thể xóa vì đang có ${cat.SoSanPham} sản phẩm`
                    : hasChildren
                      ? `Không thể xóa danh mục cha khi đang có ${cat.ChildrenCount} danh mục con`
                      : 'Xóa danh mục';

                  return (
                    <tr
                      key={cat.MaDanhMuc}
                      className={isChild ? 'ac-row-child' : 'ac-row-parent'}
                    >
                      <td className="ac-index" data-label="STT">
                        {padTwo(startItem + idx)}
                      </td>
                      <td data-label="Danh mục">
                        <div className={`ac-cat-cell ${isChild ? 'is-child' : ''}`}>
                          {isTreeMode && hasChildren ? (
                            <button
                              type="button"
                              className="ac-tree-toggle"
                              onClick={() => toggleCollapse(cat.MaDanhMuc)}
                              title={isCollapsed ? 'Mở rộng danh mục con' : 'Thu gọn danh mục con'}
                              aria-label={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                            >
                              {isCollapsed ? (
                                <ChevronRight size={15} />
                              ) : (
                                <ChevronDown size={15} />
                              )}
                            </button>
                          ) : isChild ? (
                            <span className="ac-tree-branch" aria-hidden="true">
                              <CornerDownRight size={14} />
                            </span>
                          ) : (
                            <span className="ac-tree-spacer" aria-hidden="true" />
                          )}

                          <CategoryThumb src={cat.AnhBia} name={cat.TenDanhMuc} />

                          <div className="ac-cat-meta">
                            <div className="ac-cat-name-row">
                              <span className="ac-cat-name">{cat.TenDanhMuc}</span>
                              {cat.ParentName && (
                                <span className="ac-level-badge">
                                  {cat.ParentName}
                                </span>
                              )}
                            </div>
                            <div className="ac-cat-slug">
                              {cat.DuongDan || `/danh-muc/${cat.Slug}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="ac-col-desc" data-label="Mô tả">
                        <div className="ac-cat-desc">
                          {cat.MoTa || `Danh mục ${cat.TenDanhMuc} chính hãng từ AURA Studio.`}
                        </div>
                      </td>
                      <td data-label="Số lượng SP">
                        <button
                          type="button"
                          className={`ac-count-pill ac-count-link ${hasProducts ? 'has-items' : 'empty'}`}
                          title={`Mở trang Sản phẩm lọc theo "${cat.TenDanhMuc}"`}
                          onClick={() =>
                            onNavigate?.('products', { categoryId: cat.MaDanhMuc })
                          }
                        >
                          {cat.SoSanPham} sp
                        </button>
                      </td>
                      <td data-label="Trạng thái">
                        <div className="ac-status-wrap">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={cat.HienThi}
                            aria-label={`Chuyển trạng thái ${cat.TenDanhMuc}`}
                            className={`ac-switch ${cat.HienThi ? 'on' : ''}`}
                            onClick={() => handleToggleStatus(cat)}
                          >
                            <span className="ac-switch-knob" />
                          </button>
                          <span className={`ac-status-text ${cat.HienThi ? '' : 'muted'}`}>
                            {cat.HienThi ? 'Hiển thị' : 'Ẩn'}
                          </span>
                          {!cat.ParentHienThi && (
                            <span className="ac-parent-hidden-note" title="Danh mục cha đang tạm ẩn">
                              (Cha ẩn)
                            </span>
                          )}
                        </div>
                      </td>
                      <td data-label="Thao tác">
                        <div className="ac-action-btns">
                          {isTreeMode && sortBy === 'order_asc' && (
                            <>
                              <button
                                type="button"
                                className="ac-action-icon-btn"
                                title="Đưa lên trên"
                                aria-label={`Đưa ${cat.TenDanhMuc} lên trên`}
                                disabled={bounds.isFirst}
                                onClick={() => handleMoveOrder(cat, 'up')}
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                className="ac-action-icon-btn"
                                title="Đưa xuống dưới"
                                aria-label={`Đưa ${cat.TenDanhMuc} xuống dưới`}
                                disabled={bounds.isLast}
                                onClick={() => handleMoveOrder(cat, 'down')}
                              >
                                <ArrowDown size={14} />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className="ac-action-icon-btn"
                            title="Xem trên cửa hàng"
                            aria-label={`Xem ${cat.TenDanhMuc} trên cửa hàng`}
                            onClick={() => onViewCategoryOnStore?.(cat)}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            className="ac-action-icon-btn"
                            title="Chỉnh sửa"
                            aria-label={`Chỉnh sửa ${cat.TenDanhMuc}`}
                            onClick={() => openEditModal(cat)}
                          >
                            <Pencil size={15} />
                          </button>
                          {hasProducts && (
                            <button
                              type="button"
                              className="ac-action-icon-btn"
                              title="Chuyển sản phẩm sang danh mục khác"
                              aria-label={`Chuyển sản phẩm khỏi ${cat.TenDanhMuc}`}
                              onClick={() => openTransferModal(cat)}
                            >
                              <ArrowRightLeft size={14} />
                            </button>
                          )}
                          <span className="ac-tooltip-wrap" title={deleteTooltip}>
                            <button
                              type="button"
                              className={`ac-action-icon-btn danger ${cannotDelete ? 'disabled' : ''}`}
                              disabled={cannotDelete}
                              aria-label={`Xóa ${cat.TenDanhMuc}`}
                              onClick={() => handleRequestDelete(cat)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </span>
                        </div>
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
            Hiển thị <strong>{startItem} - {endItem > 0 ? endItem : 0}</strong> trên{' '}
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
                  className={`ap-page-btn ${pagination.page === pageNum ? 'active' : ''}`}
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

      {/* Dialog xác nhận xóa danh mục */}
      {deleteTarget && (
        <div className="aura-modal-backdrop" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="aura-modal ac-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aura-modal-header">
              <h3>Xác nhận xóa danh mục</h3>
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
                  Bạn có chắc chắn muốn xóa danh mục <strong>&ldquo;{deleteTarget.TenDanhMuc}&rdquo;</strong>? Hành động này không thể hoàn tác.
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
                  {deleting ? 'Đang xóa...' : 'Xác nhận xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chuyển sản phẩm sang danh mục khác */}
      {transferTarget && (
        <div
          className="aura-modal-backdrop"
          onClick={() => !transferring && setTransferTarget(null)}
        >
          <div className="aura-modal ac-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aura-modal-header">
              <h3>Chuyển sản phẩm sang danh mục khác</h3>
              <button
                type="button"
                className="aura-icon-btn"
                disabled={transferring}
                onClick={() => setTransferTarget(null)}
              >
                <X size={18} />
              </button>
            </div>
            <form className="aura-modal-body" onSubmit={handleConfirmTransfer}>
              {transferError && <div className="aura-login-error">{transferError}</div>}
              <p style={{ margin: 0, fontSize: 13.5, color: '#374151', lineHeight: 1.55 }}>
                Chuyển toàn bộ <strong>{transferTarget.SoSanPham} sản phẩm</strong> hiện thuộc danh mục{' '}
                <strong>&ldquo;{transferTarget.TenDanhMuc}&rdquo;</strong> sang danh mục lá đích bên dưới:
              </p>

              <div>
                <label className="ap-field-label">Danh mục đích *</label>
                <select
                  className="ap-field-select"
                  value={transferDestId}
                  onChange={(e) => setTransferDestId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn danh mục lá đích --</option>
                  {allCategories
                    .filter(
                      (c) =>
                        c.isLeaf && Number(c.MaDanhMuc) !== Number(transferTarget.MaDanhMuc)
                    )
                    .map((c) => (
                      <option key={c.MaDanhMuc} value={c.MaDanhMuc}>
                        {c.ParentName ? `${c.ParentName} — ${c.TenDanhMuc}` : c.TenDanhMuc}
                      </option>
                    ))}
                </select>
              </div>

              <div className="ap-modal-actions">
                <button
                  type="button"
                  className="ap-btn-cancel"
                  disabled={transferring}
                  onClick={() => setTransferTarget(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="ap-btn-save"
                  disabled={transferring || !transferDestId}
                >
                  {transferring ? 'Đang chuyển...' : 'Xác nhận chuyển'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <label className="ap-field-label">Danh mục cha</label>
                <select
                  className="ap-field-select"
                  value={form.maDanhMucCha}
                  onChange={(e) => {
                    const nextParentId = e.target.value;
                    setForm((f) => ({
                      ...f,
                      maDanhMucCha: nextParentId,
                      slug: slugEdited ? f.slug : computeAutoSlug(f.tenDanhMuc, nextParentId, editingId),
                    }));
                  }}
                >
                  <option value="">— Không (Danh mục cấp 1) —</option>
                  {allCategories
                    .filter((c) => !disallowedParentIds.has(c.MaDanhMuc))
                    .map((c) => (
                      <option key={c.MaDanhMuc} value={c.MaDanhMuc}>
                        {c.level > 0 ? `↳ ${c.TenDanhMuc} (${c.ParentName})` : c.TenDanhMuc}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="ap-field-label">Tên danh mục *</label>
                <input
                  className="ap-field-input"
                  placeholder="Ví dụ: Áo thun in theo mẫu"
                  value={form.tenDanhMuc}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setForm((f) => ({
                      ...f,
                      tenDanhMuc: nextName,
                      slug: slugEdited ? f.slug : computeAutoSlug(nextName, f.maDanhMucCha, editingId),
                    }));
                  }}
                  required
                />
              </div>

              <div>
                <label className="ap-field-label">Đường dẫn (Slug) *</label>
                <input
                  className="ap-field-input"
                  placeholder="vi-du-ao-thun"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setForm((f) => ({ ...f, slug: toSlug(e.target.value) }));
                  }}
                  required
                />
                <p className="ac-field-hint">
                  URL cửa hàng: <code>/danh-muc/{form.slug || '...'}</code>
                </p>
                {editingId && originalSlug && form.slug && form.slug !== originalSlug && (
                  <div className="ac-slug-warning">
                    <AlertTriangle size={14} />
                    <span>
                      Cảnh báo: Đổi slug sẽ thay đổi đường dẫn lọc của danh mục từ{' '}
                      <code>/danh-muc/{originalSlug}</code> sang{' '}
                      <code>/danh-muc/{form.slug}</code>.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="ap-field-label">Ảnh đại diện danh mục (Trang chủ)</label>
                <div className="ac-upload-row">
                  <div className="ac-upload-preview">
                    {form.anhDaiDien ? (
                      <img src={resolveImageUrl(form.anhDaiDien)} alt="Xem trước" />
                    ) : (
                      <ImageOff size={16} />
                    )}
                  </div>
                  <div className="ac-upload-controls">
                    <label className="ac-upload-btn">
                      <Upload size={13} />
                      <span>{uploadingImg ? 'Đang tải...' : 'Chọn ảnh từ máy'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        disabled={uploadingImg}
                        onChange={handleUploadCategoryImage}
                      />
                    </label>
                    <input
                      className="ap-field-input"
                      placeholder="Hoặc đường dẫn (/img/...)"
                      value={form.anhDaiDien}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, anhDaiDien: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="ap-field-label">Mô tả ngắn</label>
                <textarea
                  rows={3}
                  className="ap-field-textarea"
                  placeholder="Để trống sẽ tự động điền mô tả mặc định theo tên danh mục..."
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
