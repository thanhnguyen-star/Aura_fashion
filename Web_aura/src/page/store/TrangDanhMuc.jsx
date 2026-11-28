import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Gem,
  Heart,
  Layers,
  LayoutGrid,
  List,
  RotateCcw,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { API_BASE, resolveImageUrl } from '../../utils/api.js';
import '../css/trangDanhMuc.css';

const EMPTY_ARRAY = [];
const DANH_SACH_SIZE = ['S', 'M', 'L', 'XL', 'XXL'];
const DANH_SACH_MAU = [
  { hex: '#000000', aliases: ['#000000', '#111111'], ten: 'Đen' },
  { hex: '#FFFFFF', aliases: ['#FFFFFF', '#F5F5F4'], ten: 'Trắng' },
  { hex: '#71717A', aliases: ['#71717A'], ten: 'Xám' },
  { hex: '#E4D8C9', aliases: ['#E4D8C9', '#D6CCC2'], ten: 'Be' },
  { hex: '#6B3E3E', aliases: ['#6B3E3E'], ten: 'Nâu' },
];

const BANNER_BY_ROOT = {
  nam: '/img/nam/banner-nam.jpg',
  nu: '/img/nu/banner-nu.jpg',
  'phu-kien': '/img/phu-kien/banner-phu-kien.jpg',
};

const PRICE_RANGES_DEFAULT = [
  { id: 'all', label: 'Tất cả mức giá', min: 0, max: Infinity },
  { id: 'under-500', label: 'Dưới 500.000đ', min: 0, max: 499999 },
  { id: '500-1000', label: '500.000đ – 1.000.000đ', min: 500000, max: 1000000 },
  { id: 'over-1000', label: 'Trên 1.000.000đ', min: 1000001, max: Infinity },
];

const PRICE_RANGES_ACCESSORIES = [
  { id: 'all', label: 'Tất cả mức giá', min: 0, max: Infinity },
  { id: 'under-300', label: 'Dưới 300.000đ', min: 0, max: 299999 },
  { id: '300-600', label: '300.000đ – 600.000đ', min: 300000, max: 600000 },
  { id: 'over-600', label: 'Trên 600.000đ', min: 600001, max: Infinity },
];

function dinhDangTien(gia) {
  return `${Number(gia || 0).toLocaleString('vi-VN')}đ`;
}

function inferIcon(slug = '', name = '') {
  const txt = `${slug} ${name}`.toLowerCase();
  if (txt.includes('hoodie')) return 'layers';
  if (txt.includes('túi')) return 'bag';
  if (txt.includes('mũ') || txt.includes('nón')) return 'sparkles';
  if (txt.includes('kính') || txt.includes('trang sức')) return 'gem';
  if (txt.includes('thun') || txt.includes('khoác') || txt.includes('áo')) return 'shirt';
  return 'grid';
}

function IconDanhMucCon({ icon }) {
  switch (icon) {
    case 'shirt':
      return <Shirt size={15} strokeWidth={1.7} />;
    case 'bag':
      return <ShoppingBag size={15} strokeWidth={1.7} />;
    case 'gem':
      return <Gem size={15} strokeWidth={1.7} />;
    case 'layers':
      return <Layers size={15} strokeWidth={1.7} />;
    case 'sparkles':
      return <Sparkles size={15} strokeWidth={1.7} />;
    default:
      return <LayoutGrid size={15} strokeWidth={1.7} />;
  }
}

function collectSubtreeIds(node) {
  const ids = new Set([Number(node.MaDanhMuc)]);
  for (const child of node.children || []) {
    for (const cid of collectSubtreeIds(child)) {
      ids.add(cid);
    }
  }
  return ids;
}

function resolveCatalogContext(tree, categorySlug) {
  if (!categorySlug || categorySlug === 'all') {
    return { rootNode: null, targetNode: null, childSlugFromRoute: null };
  }

  for (const root of tree) {
    if (root.Slug === categorySlug) {
      return { rootNode: root, targetNode: root, childSlugFromRoute: null };
    }
    for (const child of root.children || []) {
      if (child.Slug === categorySlug) {
        return {
          rootNode: root,
          targetNode: child,
          childSlugFromRoute: child.Slug,
        };
      }
    }
  }

  return { rootNode: null, targetNode: null, childSlugFromRoute: null };
}

export default function TrangDanhMuc({
  categorySlug = 'all',
  initialSub = 'all',
  initialSort = 'popular',
  categoryTree: propTree = EMPTY_ARRAY,
  refreshKey = 0,
  onChangeCategory,
  onBackToStore,
  onSelectProduct,
  themVaoGio,
}) {
  const [localTree, setLocalTree] = useState(propTree);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedSub, setSelectedSub] = useState(initialSub);
  const [draftSize, setDraftSize] = useState('');
  const [draftColor, setDraftColor] = useState('');
  const [draftPrice, setDraftPrice] = useState('all');

  const [appliedSize, setAppliedSize] = useState('');
  const [appliedColor, setAppliedColor] = useState('');
  const [appliedPrice, setAppliedPrice] = useState('all');

  const [sortBy, setSortBy] = useState(initialSort);
  const [viewMode, setViewMode] = useState('grid');
  const [favorites, setFavorites] = useState(() => new Set());

  const tree = useMemo(
    () => (propTree.length > 0 ? propTree : localTree),
    [propTree, localTree],
  );

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [prodRes, catRes] = await Promise.all([
          fetch(`${API_BASE}/api/store/products`),
          propTree.length === 0
            ? fetch(`${API_BASE}/api/store/categories`)
            : Promise.resolve(null),
        ]);

        const prodJson = await prodRes.json().catch(() => ({}));
        if (isMounted && prodRes.ok && prodJson.success) {
          setProducts(prodJson.data || []);
        }

        if (catRes) {
          const catJson = await catRes.json().catch(() => ({}));
          if (isMounted && catRes.ok && catJson.success) {
            setLocalTree(catJson.tree || []);
          }
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu trang danh mục:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [refreshKey, propTree.length]);

  // Xác định danh mục gốc / con đang xem từ DB tree (hỗ trợ cả link trực tiếp vào slug con)
  const resolvedContext = resolveCatalogContext(tree, categorySlug);

  const activeRoot = resolvedContext.rootNode;
  const effectiveSub =
    selectedSub !== 'all'
      ? selectedSub
      : resolvedContext.childSlugFromRoute || 'all';

  const activeSubNode = useMemo(() => {
    if (!effectiveSub || effectiveSub === 'all') return null;
    for (const root of tree) {
      if (root.Slug === effectiveSub) return root;
      for (const child of root.children || []) {
        if (child.Slug === effectiveSub) return child;
      }
    }
    return null;
  }, [tree, effectiveSub]);

  const rootTabs = useMemo(
    () => [
      { slug: 'all', label: 'Tất cả' },
      ...tree.map((r) => ({ slug: r.Slug, label: r.TenDanhMuc })),
    ],
    [tree],
  );

  const sidebarItems = useMemo(() => {
    if (activeRoot) {
      const children = activeRoot.children || [];
      return [
        {
          id: 'all',
          ten:
            children.length > 0
              ? 'Tất cả sản phẩm'
              : `Tất cả ${activeRoot.TenDanhMuc.toLowerCase()}`,
          icon: 'grid',
          isChild: false,
        },
        ...children.map((c) => ({
          id: c.Slug,
          ten: c.TenDanhMuc,
          icon: inferIcon(c.Slug, c.TenDanhMuc),
          isChild: false,
        })),
      ];
    }

    // Ở trang "Tất cả sản phẩm": hiện toàn bộ cây danh mục đang hiển thị từ DB
    const items = [{ id: 'all', ten: 'Tất cả sản phẩm', icon: 'grid', isChild: false }];
    for (const root of tree) {
      items.push({
        id: root.Slug,
        ten: root.TenDanhMuc,
        icon: inferIcon(root.Slug, root.TenDanhMuc),
        isChild: false,
      });
      for (const child of root.children || []) {
        items.push({
          id: child.Slug,
          ten: child.TenDanhMuc,
          icon: inferIcon(child.Slug, child.TenDanhMuc),
          isChild: true,
        });
      }
    }
    return items;
  }, [activeRoot, tree]);

  const isAccessoryCategory = activeRoot?.Slug === 'phu-kien';
  const showSizes = !isAccessoryCategory;
  const priceOptions = isAccessoryCategory
    ? PRICE_RANGES_ACCESSORIES
    : PRICE_RANGES_DEFAULT;

  const resetFilters = () => {
    setSelectedSub('all');
    setDraftSize('');
    setDraftColor('');
    setDraftPrice('all');
    setAppliedSize('');
    setAppliedColor('');
    setAppliedPrice('all');
    if (resolvedContext.childSlugFromRoute && activeRoot) {
      onChangeCategory?.(activeRoot.Slug);
    }
  };

  const handleSwitchCategory = (slug) => {
    setSelectedSub('all');
    setDraftSize('');
    setDraftColor('');
    setDraftPrice('all');
    setAppliedSize('');
    setAppliedColor('');
    setAppliedPrice('all');
    onChangeCategory?.(slug);
  };

  const handleSelectSidebarItem = (itemId) => {
    if (itemId === 'all' && resolvedContext.childSlugFromRoute && activeRoot) {
      setSelectedSub('all');
      onChangeCategory?.(activeRoot.Slug);
      return;
    }
    setSelectedSub(itemId);
  };

  const handleApplyFilter = () => {
    setAppliedSize(draftSize);
    setAppliedColor(draftColor);
    setAppliedPrice(draftPrice);
  };

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const danhSachLoc = useMemo(() => {
    const priceRule =
      priceOptions.find((m) => m.id === appliedPrice) || priceOptions[0];

    let allowedCatIds = null;
    if (activeSubNode) {
      allowedCatIds = collectSubtreeIds(activeSubNode);
    } else if (activeRoot) {
      allowedCatIds = collectSubtreeIds(activeRoot);
    }

    let list = allowedCatIds
      ? products.filter((sp) => allowedCatIds.has(Number(sp.MaDanhMuc)))
      : [...products];

    if (showSizes && appliedSize) {
      list = list.filter((sp) => (sp.sizes || []).includes(appliedSize));
    }

    if (appliedColor) {
      const colorMeta = DANH_SACH_MAU.find((c) => c.hex === appliedColor);
      const validHexes = new Set(
        (colorMeta?.aliases || [appliedColor]).map((h) => h.toUpperCase()),
      );
      list = list.filter((sp) =>
        (sp.colors || []).some((hex) => validHexes.has(String(hex).toUpperCase())),
      );
    }

    list = list.filter(
      (sp) => Number(sp.GiaBan) >= priceRule.min && Number(sp.GiaBan) <= priceRule.max,
    );

    const sorted = [...list];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => Number(a.GiaBan) - Number(b.GiaBan));
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => Number(b.GiaBan) - Number(a.GiaBan));
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => Number(b.MaSanPham) - Number(a.MaSanPham));
    } else {
      sorted.sort(
        (a, b) =>
          (b.NoiBat ? 1 : 0) - (a.NoiBat ? 1 : 0) ||
          Number(b.MaSanPham) - Number(a.MaSanPham),
      );
    }

    return sorted;
  }, [
    products,
    priceOptions,
    appliedPrice,
    activeSubNode,
    activeRoot,
    showSizes,
    appliedSize,
    appliedColor,
    sortBy,
  ]);

  const hasActiveFilter =
    effectiveSub !== 'all' ||
    Boolean(appliedSize) ||
    Boolean(appliedColor) ||
    appliedPrice !== 'all';

  const displayCategory = activeSubNode || activeRoot;
  const bannerTitle = displayCategory
    ? displayCategory.TenDanhMuc.toUpperCase()
    : 'TẤT CẢ SẢN PHẨM';
  const bannerDesc =
    displayCategory?.MoTa ||
    'Toàn bộ thiết kế tối giản Nam, Nữ và Phụ kiện từ AURA Studio';
  const bannerImg =
    (activeRoot && BANNER_BY_ROOT[activeRoot.Slug]) || '/img/nam/banner-nam.jpg';

  return (
    <div className="tdm-page">
      {/* 1. HERO BANNER */}
      <section className="tdm-banner">
        <div className="khung-noi-dung tdm-banner-inner">
          <div className="tdm-banner-content">
            <div className="tdm-breadcrumb">
              <button
                type="button"
                className="tdm-bc-btn"
                onClick={onBackToStore}
              >
                AURA
              </button>
              <span>&gt;</span>
              {activeRoot && activeSubNode && activeSubNode.MaDanhMuc !== activeRoot.MaDanhMuc ? (
                <>
                  <button
                    type="button"
                    className="tdm-bc-btn"
                    onClick={() => handleSwitchCategory(activeRoot.Slug)}
                  >
                    {activeRoot.TenDanhMuc}
                  </button>
                  <span>&gt;</span>
                  <span className="tdm-bc-active">{activeSubNode.TenDanhMuc}</span>
                </>
              ) : (
                <span className="tdm-bc-active">
                  {displayCategory ? displayCategory.TenDanhMuc : 'Tất cả sản phẩm'}
                </span>
              )}
            </div>

            <h1 className="tdm-banner-title">{bannerTitle}</h1>
            <p className="tdm-banner-desc">{bannerDesc}</p>

            <div className="tdm-banner-actions">
              <a href="#tdm-catalog" className="tdm-cta-btn">
                KHÁM PHÁ NGAY <ArrowRight size={15} />
              </a>

              <div className="tdm-cat-switcher" role="tablist" aria-label="Chuyển danh mục">
                {rootTabs.map((tab) => (
                  <button
                    key={tab.slug}
                    type="button"
                    role="tab"
                    aria-selected={(activeRoot?.Slug || 'all') === tab.slug}
                    className={`tdm-cat-tab ${(activeRoot?.Slug || 'all') === tab.slug ? 'active' : ''}`}
                    onClick={() => handleSwitchCategory(tab.slug)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="tdm-banner-visual">
            <img src={bannerImg} alt={bannerTitle} />
            <div className="tdm-watermark">
              <strong>AURA</strong>
              <span>WEAR YOUR STYLE</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. NỘI DUNG CHÍNH: SIDEBAR TRÁI + LƯỚI SẢN PHẨM PHẢI */}
      <section className="khung-noi-dung tdm-body" id="tdm-catalog">
        {/* SIDEBAR */}
        <aside className="tdm-sidebar">
          <div className="tdm-filter-block">
            <h2 className="tdm-sidebar-heading">DANH MỤC</h2>
            <div className="tdm-main-cat-pills">
              {rootTabs.map((tab) => (
                <button
                  key={tab.slug}
                  type="button"
                  className={`tdm-main-cat-pill ${(activeRoot?.Slug || 'all') === tab.slug ? 'active' : ''}`}
                  onClick={() => handleSwitchCategory(tab.slug)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <ul className="tdm-subcat-list">
              {sidebarItems.map((sub) => (
                <li key={sub.id}>
                  <button
                    type="button"
                    className={`tdm-subcat-btn ${sub.isChild ? 'is-child' : ''} ${effectiveSub === sub.id ? 'active' : ''}`}
                    onClick={() => handleSelectSidebarItem(sub.id)}
                  >
                    <IconDanhMucCon icon={sub.icon} />
                    <span>{sub.ten}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="tdm-divider" />

          {/* Lọc theo */}
          <div className="tdm-filter-block">
            <div className="tdm-filter-header">
              <h2 className="tdm-sidebar-heading">LỌC THEO</h2>
              {hasActiveFilter && (
                <button
                  type="button"
                  className="tdm-reset-btn"
                  onClick={resetFilters}
                  title="Đặt lại bộ lọc"
                >
                  <RotateCcw size={12} />
                  Đặt lại
                </button>
              )}
            </div>

            {showSizes && (
              <div className="tdm-filter-group">
                <span className="tdm-filter-label">Kích cỡ</span>
                <div className="tdm-size-row">
                  {DANH_SACH_SIZE.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={`tdm-size-pill ${draftSize === sz ? 'active' : ''}`}
                      onClick={() => setDraftSize((prev) => (prev === sz ? '' : sz))}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="tdm-filter-group">
              <span className="tdm-filter-label">Màu sắc</span>
              <div className="tdm-color-row">
                {DANH_SACH_MAU.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={c.ten}
                    aria-label={c.ten}
                    className={`tdm-color-dot ${draftColor === c.hex ? 'active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() =>
                      setDraftColor((prev) => (prev === c.hex ? '' : c.hex))
                    }
                  />
                ))}
              </div>
            </div>

            <div className="tdm-filter-group">
              <span className="tdm-filter-label">Giá tiền</span>
              <div className="tdm-price-list">
                {priceOptions.map((m) => (
                  <label key={m.id} className="tdm-price-option">
                    <input
                      type="radio"
                      name={`price-${activeRoot?.Slug || 'all'}`}
                      checked={draftPrice === m.id}
                      onChange={() => setDraftPrice(m.id)}
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="tdm-apply-btn"
              onClick={handleApplyFilter}
            >
              Áp dụng
            </button>
          </div>
        </aside>

        {/* LƯỚI SẢN PHẨM */}
        <div className="tdm-main">
          <div className="tdm-toolbar">
            <p className="tdm-count">
              Hiển thị <strong>{danhSachLoc.length > 0 ? 1 : 0} – {danhSachLoc.length}</strong> / {danhSachLoc.length} sản phẩm
            </p>

            <div className="tdm-toolbar-right">
              <label className="tdm-sort-label">
                <span>Sắp xếp theo:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="tdm-sort-select"
                >
                  <option value="popular">Phổ biến nhất</option>
                  <option value="newest">Mới nhất</option>
                  <option value="price-asc">Giá: Thấp đến Cao</option>
                  <option value="price-desc">Giá: Cao đến Thấp</option>
                </select>
              </label>

              <div className="tdm-view-toggle">
                <button
                  type="button"
                  className={viewMode === 'grid' ? 'active' : ''}
                  onClick={() => setViewMode('grid')}
                  aria-label="Xem dạng lưới"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                  aria-label="Xem dạng danh sách"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="tdm-empty">
              <p>Đang tải danh sách sản phẩm...</p>
            </div>
          ) : danhSachLoc.length === 0 ? (
            <div className="tdm-empty">
              <p>Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.</p>
              <button type="button" onClick={resetFilters}>
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className={`tdm-grid ${viewMode === 'list' ? 'tdm-grid-list' : ''}`}>
              {danhSachLoc.map((sp) => {
                const isFav = favorites.has(sp.MaSanPham);
                return (
                  <article
                    key={sp.MaSanPham}
                    className="tdm-card"
                    onClick={() => onSelectProduct?.(sp.MaSanPham)}
                  >
                    <div className="tdm-card-img-wrap">
                      <img
                        src={resolveImageUrl(sp.AnhDaiDien) || '/img/sp1.png'}
                        alt={sp.TenSanPham}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/img/sp1.png';
                        }}
                      />

                      {sp.HoTroIn ? (
                        <span className="tdm-badge tdm-badge-new">In theo mẫu</span>
                      ) : sp.NoiBat ? (
                        <span className="tdm-badge tdm-badge-new">Nổi bật</span>
                      ) : null}

                      <button
                        type="button"
                        className={`tdm-fav-btn ${isFav ? 'active' : ''}`}
                        aria-label="Yêu thích"
                        onClick={(e) => toggleFavorite(e, sp.MaSanPham)}
                      >
                        <Heart size={15} fill={isFav ? '#ef4444' : 'none'} />
                      </button>
                    </div>

                    <div className="tdm-card-body">
                      <h3 className="tdm-card-title">{sp.TenSanPham}</h3>
                      <div className="tdm-card-prices">
                        <span className="tdm-price">{dinhDangTien(sp.GiaBan)}</span>
                      </div>

                      <button
                        type="button"
                        className="tdm-add-cart-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          themVaoGio({
                            id: sp.MaSanPham,
                            productId: sp.MaSanPham,
                            ten: sp.TenSanPham,
                            gia: sp.GiaBan,
                            anh: resolveImageUrl(sp.AnhDaiDien) || '/img/sp1.png',
                            size: sp.sizes?.[0] || null,
                          });
                        }}
                      >
                        <ShoppingCart size={14} />
                        <span>Thêm vào giỏ</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
