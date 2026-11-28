import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  CircleUser,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react'
import './DauTrang.css'

const ROOT_BANNER_IMAGE = {
  nam: '/img/nam/banner-nam.jpg',
  nu: '/img/nu/banner-nu.jpg',
  'phu-kien': '/img/phu-kien/banner-phu-kien.jpg',
}

function IconDonHang() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 5l2 5h14l2-5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
      <line x1="10" y1="14.5" x2="14" y2="14.5" />
    </svg>
  )
}

export default function DauTrang({
  soLuong,
  moGioHang,
  currentUser,
  categoryTree = [],
  onOpenLogin,
  onOpenAdmin,
  onLogout,
  onChonMucTaiKhoan,
  onNavigateStore,
  onSelectCategory,
  onOpenSearch,
}) {
  const [dangMoMenu, setDangMoMenu] = useState(false)
  const [dangMoTaiKhoan, setDangMoTaiKhoan] = useState(false)
  const [megaMenuOpen, setMegaMenuOpen] = useState(false)
  const [hoveredCol, setHoveredCol] = useState('default')
  const [mobileAccordionOpen, setMobileAccordionOpen] = useState(false)
  const [mobileSubCol, setMobileSubCol] = useState('all')
  const hopTaiKhoanRef = useRef(null)
  const headerRef = useRef(null)

  const danhSachMenu = useMemo(() => {
    const rootMenus = categoryTree.map((cat) => ({
      ten: cat.TenDanhMuc,
      duongDan: `#danh-muc-${cat.Slug}`,
      categorySlug: cat.Slug,
    }))
    return [
      { ten: 'Trang chủ', duongDan: '#trang-chu' },
      ...rootMenus,
      { ten: 'Sản phẩm', duongDan: '#san-pham', hasMegaMenu: true },
      { ten: 'Cá nhân hóa', duongDan: '#ca-nhan-hoa' },
    ]
  }, [categoryTree])

  const megaMenuColumns = useMemo(() => {
    return [
      {
        id: 'all',
        title: 'Tất cả sản phẩm',
        slug: 'all',
        items: [
          { label: 'Sản phẩm mới', slug: 'all', sub: 'all', sort: 'newest' },
          { label: 'Bán chạy nhất', slug: 'all', sub: 'all', sort: 'popular' },
        ],
      },
      ...categoryTree.map((cat) => {
        const children = Array.isArray(cat.children) ? cat.children : []
        return {
          id: cat.Slug,
          title: cat.TenDanhMuc,
          slug: cat.Slug,
          items:
            children.length > 0
              ? children.map((child) => ({
                  label: child.TenDanhMuc,
                  slug: cat.Slug,
                  sub: child.Slug,
                }))
              : [
                  {
                    label: `Tất cả ${cat.TenDanhMuc.toLowerCase()}`,
                    slug: cat.Slug,
                    sub: 'all',
                  },
                ],
        }
      }),
    ]
  }, [categoryTree])

  const activeBanners = useMemo(() => {
    const cards = categoryTree.map((cat) => ({
      slug: cat.Slug,
      image:
        ROOT_BANNER_IMAGE[cat.Slug] ||
        cat.AnhBia ||
        '/img/nam/banner-nam.jpg',
      eyebrow: cat.Slug === 'phu-kien' ? 'Điểm nhấn' : 'Bộ sưu tập',
      title:
        cat.Slug === 'nam' || cat.Slug === 'nu'
          ? `Thời trang ${cat.TenDanhMuc}`
          : cat.TenDanhMuc,
    }))
    if (cards.length <= 2) return cards
    if (hoveredCol && hoveredCol !== 'default') {
      const idx = cards.findIndex((c) => c.slug === hoveredCol)
      if (idx !== -1) {
        const primary = cards[idx]
        const secondary = cards[(idx + 1) % cards.length]
        return [primary, secondary]
      }
    }
    return cards.slice(0, 2)
  }, [categoryTree, hoveredCol])

  const dongMenu = () => {
    setDangMoMenu(false)
    setMegaMenuOpen(false)
    setMobileAccordionOpen(false)
  }

  // Đóng dropdown khi bấm ra ngoài
  useEffect(() => {
    const xuLyClickNgoai = (e) => {
      if (
        hopTaiKhoanRef.current &&
        !hopTaiKhoanRef.current.contains(e.target)
      ) {
        setDangMoTaiKhoan(false)
      }
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMegaMenuOpen(false)
      }
    }

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setMegaMenuOpen(false)
        setDangMoTaiKhoan(false)
      }
    }

    document.addEventListener('mousedown', xuLyClickNgoai)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', xuLyClickNgoai)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  const chonSanPhamFilter = (slug, options = {}) => {
    dongMenu()
    onSelectCategory?.(slug, options)
  }

  const xuLyBamTaiKhoan = () => {
    if (!currentUser) {
      onOpenLogin?.()
      return
    }
    setDangMoTaiKhoan((prev) => !prev)
  }

  const chonMuc = (hanhDong) => {
    setDangMoTaiKhoan(false)
    hanhDong?.()
  }

  return (
    <header
      className="dau-trang"
      ref={headerRef}
      onMouseLeave={() => {
        setMegaMenuOpen(false)
        setHoveredCol('default')
      }}
    >

      <div className="khung-noi-dung noi-dung-dau-trang">
        <button
          className="nut-bieu-tuong nut-menu"
          type="button"
          onClick={() => setDangMoMenu(!dangMoMenu)}
          aria-label="Mở menu"
        >
          {dangMoMenu ? <X /> : <Menu />}
        </button>

        <a
          className="thuong-hieu"
          href="#trang-chu"
          onClick={() => {
            dongMenu()
            onNavigateStore?.('#trang-chu')
          }}
        >
          AURA
        </a>

        <nav className={`menu-chinh ${dangMoMenu ? 'dang-mo' : ''}`}>
          {danhSachMenu.map((item) => {
            if (item.hasMegaMenu) {
              return (
                <div
                  key={item.duongDan}
                  className="menu-san-pham-wrap"
                  onMouseEnter={() => setMegaMenuOpen(true)}
                >
                  <div className="menu-san-pham-row">
                    <a
                      href={item.duongDan}
                      onClick={(e) => {
                        e.preventDefault()
                        chonSanPhamFilter('all', { sub: 'all', sort: 'popular' })
                      }}
                    >
                      {item.ten}
                    </a>
                    <button
                      type="button"
                      className={`mobile-acc-toggle ${mobileAccordionOpen ? 'open' : ''}`}
                      aria-label="Mở danh mục sản phẩm"
                      aria-expanded={mobileAccordionOpen}
                      onClick={() => setMobileAccordionOpen((prev) => !prev)}
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  {/* Accordion trên Mobile */}
                  {mobileAccordionOpen && (
                    <div className="mobile-mega-accordion">
                      {megaMenuColumns.map((col) => {
                        const isColOpen = mobileSubCol === col.id
                        return (
                          <div key={col.id} className="mobile-acc-group">
                            <button
                              type="button"
                              className="mobile-acc-head"
                              onClick={() =>
                                setMobileSubCol((prev) => (prev === col.id ? '' : col.id))
                              }
                            >
                              <span>{col.title}</span>
                              <ChevronDown
                                size={14}
                                className={isColOpen ? 'rotate-180' : ''}
                              />
                            </button>
                            {isColOpen && (
                              <div className="mobile-acc-items">
                                <button
                                  type="button"
                                  className="mobile-acc-link mobile-acc-all"
                                  onClick={() => chonSanPhamFilter(col.slug)}
                                >
                                  Xem tất cả {col.title.toLowerCase()}
                                </button>
                                {col.items.map((sub) => (
                                  <button
                                    key={sub.label}
                                    type="button"
                                    className="mobile-acc-link"
                                    onClick={() =>
                                      chonSanPhamFilter(sub.slug, {
                                        sub: sub.sub,
                                        sort: sub.sort || 'popular',
                                      })
                                    }
                                  >
                                    {sub.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <a
                key={item.duongDan}
                href={item.duongDan}
                onMouseEnter={() => setMegaMenuOpen(false)}
                onClick={(e) => {
                  dongMenu()
                  if (item.categorySlug) {
                    e.preventDefault()
                    onSelectCategory?.(item.categorySlug)
                    return
                  }
                  onNavigateStore?.(item.duongDan)
                }}
              >
                {item.ten}
              </a>
            )
          })}
        </nav>

        <div className="nhom-tien-ich">
          <button
            className="nut-bieu-tuong"
            type="button"
            onClick={onOpenSearch}
            aria-label="Tìm kiếm sản phẩm"
          >
            <Search />
          </button>

          {/* Nút tài khoản + Dropdown */}
          <div className="hop-tai-khoan" ref={hopTaiKhoanRef}>
            <button
              className={`nut-bieu-tuong nut-tai-khoan ${currentUser ? 'da-dang-nhap' : ''}`}
              type="button"
              onClick={xuLyBamTaiKhoan}
              aria-label="Tài khoản"
              aria-expanded={dangMoTaiKhoan}
            >
              {currentUser ? (
                <span className="navbar-user-chip">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.hoTen || 'Avatar'}
                      className="navbar-avatar-img"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="navbar-avatar-initial">
                      {(currentUser.hoTen || currentUser.email || 'A').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="navbar-ten-nguoi-dung">
                    {currentUser.hoTen || currentUser.email?.split('@')[0]}
                  </span>
                </span>
              ) : (
                <UserRound size={20} />
              )}
            </button>

            {dangMoTaiKhoan && currentUser && (
              <div className="menu-tai-khoan">
                <div className="dau-menu-tai-khoan">
                  <div className="dropdown-user-header">
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.hoTen || 'Avatar'}
                        className="dropdown-avatar-img"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="dropdown-avatar-initial">
                        {(currentUser.hoTen || currentUser.email || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="dropdown-user-meta">
                      <p className="dropdown-user-name">
                        {currentUser.hoTen || 'Khách hàng AURA'}
                      </p>
                      <p className="email-tai-khoan">{currentUser.email}</p>
                      <span className="dropdown-user-role-badge">
                        {currentUser.vaiTro === 'QUAN_TRI' ? 'QUẢN TRỊ VIÊN' : 'HỘI VIÊN AURA'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="danh-sach-tai-khoan">
                  {currentUser.vaiTro === 'QUAN_TRI' ? (
                    <>
                      <button
                        type="button"
                        className="muc-tai-khoan"
                        onClick={() =>
                          chonMuc(() => onOpenAdmin?.('customers'))
                        }
                      >
                        <span className="icon-muc-tai-khoan">
                          <CircleUser size={18} strokeWidth={1.8} />
                        </span>
                        <span>Hồ sơ khách hàng</span>
                      </button>

                      <button
                        type="button"
                        className="muc-tai-khoan"
                        onClick={() =>
                          chonMuc(() => onChonMucTaiKhoan?.('thiet-ke-png'))
                        }
                      >
                        <span className="icon-muc-tai-khoan">
                          <SlidersHorizontal size={18} strokeWidth={1.8} />
                        </span>
                        <span>Tùy chỉnh thiết kế PNG</span>
                      </button>

                      <button
                        type="button"
                        className="muc-tai-khoan muc-quan-tri"
                        onClick={() => chonMuc(() => onOpenAdmin?.('dashboard'))}
                      >
                        <span className="icon-muc-tai-khoan">
                          <LayoutGrid size={18} strokeWidth={1.8} />
                        </span>
                        <span>Vào trang quản trị</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="muc-tai-khoan"
                        onClick={() =>
                          chonMuc(() => onChonMucTaiKhoan?.('ho-so'))
                        }
                      >
                        <span className="icon-muc-tai-khoan">
                          <CircleUser size={18} strokeWidth={1.8} />
                        </span>
                        <span>Hồ sơ của tôi</span>
                      </button>

                      <button
                        type="button"
                        className="muc-tai-khoan"
                        onClick={() =>
                          chonMuc(() => onChonMucTaiKhoan?.('don-hang'))
                        }
                      >
                        <span className="icon-muc-tai-khoan">
                          <IconDonHang />
                        </span>
                        <span>Đơn hàng của tôi</span>
                      </button>

                      <button
                        type="button"
                        className="muc-tai-khoan"
                        onClick={() =>
                          chonMuc(() => onChonMucTaiKhoan?.('thiet-ke-png'))
                        }
                      >
                        <span className="icon-muc-tai-khoan">
                          <SlidersHorizontal size={18} strokeWidth={1.8} />
                        </span>
                        <span>Tùy chỉnh thiết kế PNG</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="chan-menu-tai-khoan">
                  <button
                    type="button"
                    className="muc-dang-xuat"
                    onClick={() => chonMuc(onLogout)}
                  >
                    <LogOut size={18} strokeWidth={1.8} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            className="nut-bieu-tuong nut-gio-hang"
            type="button"
            onClick={moGioHang}
            aria-label="Mở giỏ hàng"
          >
            <ShoppingBag />

            {soLuong > 0 && (
              <span className="so-luong-gio-hang">{soLuong}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mega menu Desktop khi hover nút "Sản phẩm" */}
      {megaMenuOpen && (
        <div
          className="mega-menu-san-pham"
          onMouseEnter={() => setMegaMenuOpen(true)}
        >
          <div className="khung-noi-dung mega-menu-inner">
            <div className="mega-menu-cols">
              {megaMenuColumns.map((col) => (
                <div
                  key={col.id}
                  className="mega-menu-col"
                  onMouseEnter={() =>
                    setHoveredCol(col.id === 'all' ? 'default' : col.id)
                  }
                >
                  <button
                    type="button"
                    className="mega-col-title"
                    onClick={() => chonSanPhamFilter(col.slug)}
                  >
                    {col.title}
                  </button>
                  <ul className="mega-col-list">
                    {col.items.map((sub) => (
                      <li key={sub.label}>
                        <button
                          type="button"
                          className="mega-col-link"
                          onClick={() =>
                            chonSanPhamFilter(sub.slug, {
                              sub: sub.sub,
                              sort: sub.sort || 'popular',
                            })
                          }
                        >
                          {sub.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mega-menu-banners">
              {activeBanners.map((banner) => (
                <button
                  key={banner.slug}
                  type="button"
                  className="mega-banner-card"
                  onClick={() => chonSanPhamFilter(banner.slug)}
                >
                  <img src={banner.image} alt={banner.eyebrow} />
                  <div className="mega-banner-overlay">
                    <span>{banner.eyebrow}</span>
                    <strong>{banner.title}</strong>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}