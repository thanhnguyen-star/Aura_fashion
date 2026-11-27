import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Backpack,
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
import {
  cauHinhTrangDanhMuc,
  sanPhamTheoDanhMuc,
} from '../../data/duLieu.js';
import '../css/trangDanhMuc.css';

const DANH_SACH_SIZE = ['S', 'M', 'L', 'XL', 'XXL'];
const DANH_SACH_MAU = [
  { hex: '#111111', ten: 'Đen' },
  { hex: '#f5f5f4', ten: 'Trắng' },
  { hex: '#71717a', ten: 'Xám' },
  { hex: '#d6ccc2', ten: 'Be' },
  { hex: '#6b3e3e', ten: 'Nâu' },
];

function dinhDangTien(gia) {
  return `${Number(gia || 0).toLocaleString('vi-VN')}đ`;
}

function IconDanhMucCon({ icon }) {
  switch (icon) {
    case 'shirt':
    case 'jacket':
    case 'dress':
      return <Shirt size={15} strokeWidth={1.7} />;
    case 'bag':
      return <ShoppingBag size={15} strokeWidth={1.7} />;
    case 'backpack':
      return <Backpack size={15} strokeWidth={1.7} />;
    case 'gem':
      return <Gem size={15} strokeWidth={1.7} />;
    case 'layers':
    case 'trousers':
      return <Layers size={15} strokeWidth={1.7} />;
    case 'cap':
    case 'sparkles':
      return <Sparkles size={15} strokeWidth={1.7} />;
    default:
      return <LayoutGrid size={15} strokeWidth={1.7} />;
  }
}

export default function TrangDanhMuc({
  categorySlug = 'nam',
  onChangeCategory,
  onBackToStore,
  onSelectProduct,
  themVaoGio,
}) {
  const config = cauHinhTrangDanhMuc[categorySlug] || cauHinhTrangDanhMuc.nam;

  const [selectedSub, setSelectedSub] = useState('all');
  // Draft filters (chỉ áp dụng khi bấm "Áp dụng" hoặc đổi trực tiếp)
  const [draftSize, setDraftSize] = useState('');
  const [draftColor, setDraftColor] = useState('');
  const [draftPrice, setDraftPrice] = useState('all');

  const [appliedSize, setAppliedSize] = useState('');
  const [appliedColor, setAppliedColor] = useState('');
  const [appliedPrice, setAppliedPrice] = useState('all');

  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');
  const [favorites, setFavorites] = useState(() => new Set());

  const resetFilters = () => {
    setSelectedSub('all');
    setDraftSize('');
    setDraftColor('');
    setDraftPrice('all');
    setAppliedSize('');
    setAppliedColor('');
    setAppliedPrice('all');
  };

  const handleSwitchCategory = (slug) => {
    resetFilters();
    onChangeCategory?.(slug);
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
      config.mucGia.find((m) => m.id === appliedPrice) || config.mucGia[0];

    let list = sanPhamTheoDanhMuc.filter((sp) => sp.danhMuc === config.slug);

    if (selectedSub !== 'all') {
      list = list.filter((sp) => sp.loai === selectedSub);
    }

    if (config.coKichCo && appliedSize) {
      list = list.filter((sp) => sp.sizes.includes(appliedSize));
    }

    if (appliedColor) {
      list = list.filter((sp) => sp.colors.includes(appliedColor));
    }

    list = list.filter(
      (sp) => sp.gia >= priceRule.min && sp.gia <= priceRule.max
    );

    const sorted = [...list];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.gia - b.gia);
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.gia - a.gia);
    } else if (sortBy === 'newest') {
      sorted.sort((a, b) => (b.nhan === 'Mới' ? 1 : 0) - (a.nhan === 'Mới' ? 1 : 0));
    } else {
      sorted.sort((a, b) => (b.phoBien || 0) - (a.phoBien || 0));
    }

    return sorted;
  }, [config, selectedSub, appliedSize, appliedColor, appliedPrice, sortBy]);

  const hasActiveFilter =
    selectedSub !== 'all' ||
    Boolean(appliedSize) ||
    Boolean(appliedColor) ||
    appliedPrice !== 'all';

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
              <span className="tdm-bc-active">{config.breadcrumb}</span>
            </div>

            <h1 className="tdm-banner-title">{config.tieuDe}</h1>
            <p className="tdm-banner-desc">{config.moTa}</p>

            <div className="tdm-banner-actions">
              <a href="#tdm-catalog" className="tdm-cta-btn">
                KHÁM PHÁ NGAY <ArrowRight size={15} />
              </a>

              <div className="tdm-cat-switcher" role="tablist" aria-label="Chuyển danh mục">
                {[
                  { slug: 'nam', label: 'Nam' },
                  { slug: 'nu', label: 'Nữ' },
                  { slug: 'phu-kien', label: 'Phụ kiện' },
                ].map((tab) => (
                  <button
                    key={tab.slug}
                    type="button"
                    role="tab"
                    aria-selected={config.slug === tab.slug}
                    className={`tdm-cat-tab ${config.slug === tab.slug ? 'active' : ''}`}
                    onClick={() => handleSwitchCategory(tab.slug)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="tdm-banner-visual">
            <img src={config.anhBanner} alt={config.tieuDe} />
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
          {/* Danh mục con */}
          <div className="tdm-filter-block">
            <h2 className="tdm-sidebar-heading">DANH MỤC</h2>
            <ul className="tdm-subcat-list">
              {config.danhMucCon.map((sub) => (
                <li key={sub.id}>
                  <button
                    type="button"
                    className={`tdm-subcat-btn ${selectedSub === sub.id ? 'active' : ''}`}
                    onClick={() => setSelectedSub(sub.id)}
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

            {config.coKichCo && (
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
                {config.mucGia.map((m) => (
                  <label key={m.id} className="tdm-price-option">
                    <input
                      type="radio"
                      name={`price-${config.slug}`}
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

          {/* Promo banner nhỏ */}
          <div className="tdm-promo-card">
            <img src={config.promo.anh} alt={config.promo.title} />
            <div className="tdm-promo-text">
              <span>{config.promo.title}</span>
              <strong>{config.promo.highlight}</strong>
              <small>{config.promo.cta}</small>
            </div>
          </div>
        </aside>

        {/* LƯỚI SẢN PHẨM */}
        <div className="tdm-main">
          <div className="tdm-toolbar">
            <p className="tdm-count">
              Hiển thị <strong>1 – {danhSachLoc.length}</strong> / {danhSachLoc.length} sản phẩm
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

          {danhSachLoc.length === 0 ? (
            <div className="tdm-empty">
              <p>Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.</p>
              <button type="button" onClick={resetFilters}>
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className={`tdm-grid ${viewMode === 'list' ? 'tdm-grid-list' : ''}`}>
              {danhSachLoc.map((sp) => {
                const isFav = favorites.has(sp.id);
                return (
                  <article
                    key={sp.id}
                    className="tdm-card"
                    onClick={() => onSelectProduct?.(sp.productId || 1)}
                  >
                    <div className="tdm-card-img-wrap">
                      <img src={sp.anh} alt={sp.ten} />

                      {sp.nhan && (
                        <span
                          className={`tdm-badge ${
                            sp.nhan === 'Mới' ? 'tdm-badge-new' : ''
                          }`}
                        >
                          {sp.nhan}
                        </span>
                      )}

                      <button
                        type="button"
                        className={`tdm-fav-btn ${isFav ? 'active' : ''}`}
                        onClick={(e) => toggleFavorite(e, sp.id)}
                        aria-label="Yêu thích"
                      >
                        <Heart size={15} fill={isFav ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <div className="tdm-card-body">
                      <h3 className="tdm-card-title">{sp.ten}</h3>

                      <div className="tdm-card-price">
                        <strong>{dinhDangTien(sp.gia)}</strong>
                        {sp.giaGoc && (
                          <span className="tdm-card-old-price">
                            {dinhDangTien(sp.giaGoc)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        className="tdm-add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          themVaoGio?.({
                            id: sp.id,
                            productId: sp.productId || 1,
                            ten: sp.ten,
                            gia: sp.gia,
                            anh: sp.anh,
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
