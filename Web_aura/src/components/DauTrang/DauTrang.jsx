import { useEffect, useRef, useState } from 'react'
import {
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

const danhSachMenu = [
  { ten: 'Trang chủ', duongDan: '#trang-chu' },
  { ten: 'Danh mục', duongDan: '#danh-muc' },
  { ten: 'Sản phẩm', duongDan: '#san-pham' },
  { ten: 'Cá nhân hóa', duongDan: '#ca-nhan-hoa' },
]

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
  onOpenLogin,
  onOpenAdmin,
  onLogout,
  onChonMucTaiKhoan,
  onNavigateStore,
}) {
  const [dangMoMenu, setDangMoMenu] = useState(false)
  const [dangMoTaiKhoan, setDangMoTaiKhoan] = useState(false)
  const hopTaiKhoanRef = useRef(null)

  const dongMenu = () => {
    setDangMoMenu(false)
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
    }

    document.addEventListener('mousedown', xuLyClickNgoai)
    return () => document.removeEventListener('mousedown', xuLyClickNgoai)
  }, [])

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
    <header className="dau-trang">
      <div className="thanh-thong-bao">
        Miễn phí giao hàng cho đơn từ 999.000đ
      </div>

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
          {danhSachMenu.map((item) => (
            <a
              key={item.duongDan}
              href={item.duongDan}
              onClick={() => {
                dongMenu()
                onNavigateStore?.(item.duongDan)
              }}
            >
              {item.ten}
            </a>
          ))}
        </nav>

        <div className="nhom-tien-ich">
          <button
            className="nut-bieu-tuong"
            type="button"
            aria-label="Tìm kiếm"
          >
            <Search />
          </button>

          {/* Nút tài khoản + Dropdown */}
          <div className="hop-tai-khoan" ref={hopTaiKhoanRef}>
            <button
              className="nut-bieu-tuong nut-tai-khoan"
              type="button"
              onClick={xuLyBamTaiKhoan}
              aria-label="Tài khoản"
              aria-expanded={dangMoTaiKhoan}
            >
              <UserRound />
              {currentUser && <span className="cham-dang-nhap" />}
            </button>

            {dangMoTaiKhoan && currentUser && (
              <div className="menu-tai-khoan">
                <div className="dau-menu-tai-khoan">
                  <p className="nhan-tai-khoan">TÀI KHOẢN AURA</p>
                  <p className="email-tai-khoan">{currentUser.email}</p>
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
    </header>
  )
}