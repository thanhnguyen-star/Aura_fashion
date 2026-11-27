import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext.jsx'
import { AUTH_UNAUTHORIZED_EVENT } from './utils/api.js'
import Banner from './components/Banner/Banner.jsx'
import CaNhanHoa from './components/CaNhanHoa/CaNhanHoa.jsx'
import DanhMuc from './components/DanhMuc/DanhMuc.jsx'
import DauTrang from './components/DauTrang/DauTrang.jsx'
import GioHangMini from './components/GioHangMini/GioHangMini.jsx'
import SanPhamTieuBieu from './components/SanPhamTieuBieu/SanPhamTieuBieu.jsx'
import AdminDashboard from './page/admin/AdminDashBoard.jsx'
import AdminLogin from './page/admin/AdminLogin.jsx'
import AdminCategories from './page/admin/AdminCategories.jsx'
import AdminTemplates from './page/admin/AdminTemplates.jsx'


import AdminProducts from './page/admin/AdminProducts.jsx'
import AdminOrders from './page/admin/AdminOrders.jsx'
import AdminCustomers from './page/admin/AdminCustomers.jsx'
import AuthModal from './components/AuthModal/AuthModal.jsx'
import ChiTietSanPham from './page/store/ChiTietSanPham.jsx'
import CheckoutWizard from './page/store/CheckoutWizard.jsx'
import LichSuDonHang from './page/store/LichSuDonHang.jsx'
import TrangDanhMuc from './page/store/TrangDanhMuc.jsx'
import HoSoCaNhan from './page/store/HoSoCaNhan.jsx'
import SearchModal from './components/SearchModal/SearchModal.jsx'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx'

import './App.css'

export default function App() {
  const { currentUser, setCurrentUser, logout } = useAuth()
  const [gioHang, setGioHang] = useState([])
  const [dangMoGioHang, setDangMoGioHang] = useState(false)

  // Điều hướng màn hình
  const [view, setView] = useState('store') // 'store' | 'category' | 'product-detail' | 'login' | 'admin' | 'checkout' | 'profile' | 'my-orders'
  const [selectedProductId, setSelectedProductId] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('nam')
  const [featuredCategory, setFeaturedCategory] = useState('ALL')
  const [adminTab, setAdminTab] = useState('dashboard')
  const [ordersInitialStatus, setOrdersInitialStatus] = useState('all')
  const [ordersNavKey, setOrdersNavKey] = useState(0)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalKey, setAuthModalKey] = useState(0)
  const [sessionNotice, setSessionNotice] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const openLoginModal = (notice = '') => {
    setSessionNotice(notice)
    setAuthModalKey((prev) => prev + 1)
    setIsAuthModalOpen(true)
  }

  useEffect(() => {
    const handleUnauthorized = (e) => {
      const msg = e.detail?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      setSessionNotice(msg)
      setView((currentView) => {
        if (currentView === 'admin') {
          return 'login'
        }
        setAuthModalKey((prev) => prev + 1)
        setIsAuthModalOpen(true)
        return currentView
      })
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const themVaoGio = (sanPham) => {
    setGioHang((danhSachHienTai) => {
      const id = sanPham.id || `${sanPham.productId || 'sp'}-${sanPham.variantId || 'var'}-${Date.now()}`
      const sanPhamDaCo = danhSachHienTai.find((item) => item.id === id)

      const newItem = {
        id,
        ten: sanPham.name || sanPham.ten || 'Áo thun AURA',
        gia: Number(sanPham.price || sanPham.gia || 0),
        soLuong: Number(sanPham.quantity || sanPham.soLuong || 1),
        anh: sanPham.printImage || sanPham.productImage || sanPham.anh || '/img/sp1.png',
        size: sanPham.size || null,
        color: sanPham.color || null,
        printTemplate: sanPham.printTemplate || null,
        printLocation: sanPham.printLocation || null,
        hasPrint: Boolean(sanPham.hasPrint),
      }

      if (sanPhamDaCo) {
        return danhSachHienTai.map((item) =>
          item.id === id
            ? { ...item, soLuong: item.soLuong + (sanPham.quantity || 1) }
            : item,
        )
      }

      return [...danhSachHienTai, newItem]
    })

    setDangMoGioHang(true)
  }

  const xoaKhoiGio = (id) => {
    setGioHang((danhSachHienTai) =>
      danhSachHienTai.filter((item) => item.id !== id),
    )
  }

  const tongSoLuong = gioHang.reduce(
    (tong, item) => tong + item.soLuong,
    0,
  )

  const handleLoginSuccess = (user) => {
    setSessionNotice('')
    setCurrentUser(user)
    if (user.vaiTro === 'QUAN_TRI') {
      setView('admin')
    } else {
      setView('store')
    }
  }

  const handleLogout = () => {
    setSessionNotice('')
    logout()
    setView('store')
  }

  // Màn hình Đăng nhập
  if (view === 'login') {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onBackToStore={() => setView('store')}
        sessionNotice={sessionNotice}
      />
    )
  }

  // Màn hình Quản trị (chỉ mở khi đúng vai trò QUAN_TRI)
  if (view === 'admin' && currentUser?.vaiTro === 'QUAN_TRI') {
    const handleAdminNavigate = (tab, options = {}) => {
      if (tab === 'orders') {
        setOrdersInitialStatus(options.status || 'all')
        setOrdersNavKey((prev) => prev + 1)
      }
      setAdminTab(tab)
    }

    const adminProps = {
      adminUser: currentUser,
      onNavigate: handleAdminNavigate,
      onLogout: handleLogout,
      onBackToStore: () => setView('store'),
    }

    switch (adminTab) {
      case 'products':
        return <AdminProducts {...adminProps} />

      case 'categories':
        return <AdminCategories {...adminProps} />
      case 'print-templates':
        return <AdminTemplates {...adminProps} />
      case 'orders':
        return (
          <AdminOrders
            key={ordersNavKey}
            initialStatus={ordersInitialStatus}
            {...adminProps}
          />
        )
      case 'customers':
        return <AdminCustomers {...adminProps} />
      case 'dashboard':
      default:
        return <AdminDashboard {...adminProps} />
    }
  }

  // Màn hình mặc định: Cửa hàng AURA
  return (
    <>
      <DauTrang
        soLuong={tongSoLuong}
        moGioHang={() => setDangMoGioHang(true)}
        currentUser={currentUser}
        onOpenLogin={() => openLoginModal('')}
        onOpenAdmin={(tab = 'dashboard') => {
          setView('admin')
          setAdminTab(tab)
        }}
        onChonMucTaiKhoan={(muc) => {
          if (muc === 'ho-so') {
            setView('profile')
          } else if (muc === 'don-hang') {
            setView('my-orders')
          } else if (muc === 'thiet-ke-png') {
            setSelectedProductId(1)
            setView('product-detail')
          }
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onLogout={handleLogout}
        onSelectCategory={(slug) => {
          setSelectedCategory(slug)
          setView('category')
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        onNavigateStore={(hash) => {
          setView('store')
          setTimeout(() => {
            if (!hash || hash === '#trang-chu') {
              window.scrollTo({ top: 0, behavior: 'smooth' })
              return
            }
            const target = document.querySelector(hash)
            if (target) {
              target.scrollIntoView({ behavior: 'smooth' })
            }
          }, 50)
        }}
      />

      <AuthModal
        key={authModalKey}
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false)
          setSessionNotice('')
        }}
        onSuccess={handleLoginSuccess}
        sessionNotice={sessionNotice}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={(id) => {
          setSelectedProductId(id)
          setView('product-detail')
        }}
      />

      {view === 'checkout' ? (
        <ProtectedRoute
          currentUser={currentUser}
          onOpenLogin={() => openLoginModal('')}
          onBackToStore={() => setView('store')}
          title="Thanh Toán Đơn Hàng"
          message="Vui lòng đăng nhập hoặc liên kết Google để tiến hành đặt hàng và lưu lại đơn của bạn."
        >
          <CheckoutWizard
            cartItems={gioHang}
            onUpdateCart={setGioHang}
            onBackToStore={() => setView('store')}
            currentUser={currentUser}
            onViewOrders={() => setView('my-orders')}
          />
        </ProtectedRoute>
      ) : view === 'category' ? (
        <TrangDanhMuc
          categorySlug={selectedCategory}
          onChangeCategory={(slug) => {
            setSelectedCategory(slug)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onBackToStore={() => {
            setView('store')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onSelectProduct={(id) => {
            setSelectedProductId(id)
            setView('product-detail')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          themVaoGio={themVaoGio}
        />
      ) : view === 'my-orders' ? (
        <ProtectedRoute
          currentUser={currentUser}
          onOpenLogin={() => openLoginModal('')}
          onBackToStore={() => setView('store')}
          title="Lịch Sử Đơn Hàng"
          message="Vui lòng đăng nhập để xem lịch sử đặt hàng và trạng thái vận chuyển của bạn."
        >
          <LichSuDonHang
            currentUser={currentUser}
            onBackToStore={() => setView('store')}
            onOpenLogin={() => openLoginModal('')}
          />
        </ProtectedRoute>
      ) : view === 'profile' ? (
        <ProtectedRoute
          currentUser={currentUser}
          onOpenLogin={() => openLoginModal('')}
          onBackToStore={() => setView('store')}
          title="Hồ Sơ Cá Nhân"
          message="Vui lòng đăng nhập để xem và quản lý thông tin tài khoản của bạn."
        >
          <HoSoCaNhan
            currentUser={currentUser}
            onBackToStore={() => setView('store')}
            onUpdateUser={(updated) => setCurrentUser(updated)}
          />
        </ProtectedRoute>
      ) : view === 'product-detail' ? (
        <ChiTietSanPham
          productId={selectedProductId}
          onBackToStore={() => setView('store')}
          onAddToCart={themVaoGio}
          onBuyNow={() => {
            setDangMoGioHang(false)
            setView('checkout')
          }}
        />
      ) : (
        <main>
          <Banner />
          <DanhMuc
            onSelectCategory={(slug) => {
              setSelectedCategory(slug)
              setView('category')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
          <SanPhamTieuBieu
            themVaoGio={themVaoGio}
            activeCategory={featuredCategory}
            onSelectCategory={setFeaturedCategory}
            onSelectProduct={(id) => {
              setSelectedProductId(id)
              setView('product-detail')
            }}
          />
          <CaNhanHoa
            onStartCustomizing={(id = 1) => {
              setSelectedProductId(id)
              setView('product-detail')
            }}
          />
        </main>
      )}

      <GioHangMini
        danhSach={gioHang}
        dangMo={dangMoGioHang}
        dongGioHang={() => setDangMoGioHang(false)}
        xoaKhoiGio={xoaKhoiGio}
        onOpenCheckout={() => {
          setDangMoGioHang(false)
          setView('checkout')
        }}
      />
    </>
  )
}