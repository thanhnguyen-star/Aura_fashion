import { useState } from 'react'
import Banner from './components/Banner/Banner.jsx'
import CaNhanHoa from './components/CaNhanHoa/CaNhanHoa.jsx'
import ChanTrang from './components/ChanTrang/ChanTrang.jsx'
import ChinhSach from './components/ChinhSach/ChinhSach.jsx'
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

import './App.css'

function getSavedUser() {
  try {
    const token = localStorage.getItem('aura_admin_token')
    const saved = localStorage.getItem('aura_admin_user')
    return token && saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

export default function App() {
  const [gioHang, setGioHang] = useState([])
  const [dangMoGioHang, setDangMoGioHang] = useState(false)

  // Trạng thái đăng nhập & điều hướng màn hình
  const [currentUser, setCurrentUser] = useState(getSavedUser)
  const [view, setView] = useState('store') // 'store' | 'product-detail' | 'login' | 'admin'
  const [selectedProductId, setSelectedProductId] = useState(1)
  const [adminTab, setAdminTab] = useState('dashboard')
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

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
    setCurrentUser(user)
    if (user.vaiTro === 'QUAN_TRI') {
      setView('admin')
    } else {
      setView('store')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('aura_admin_token')
    localStorage.removeItem('aura_admin_user')
    setCurrentUser(null)
    setView('store')
  }

  // Màn hình Đăng nhập
  if (view === 'login') {
    return (
      <AdminLogin
        onLoginSuccess={handleLoginSuccess}
        onBackToStore={() => setView('store')}
      />
    )
  }

  // Màn hình Quản trị (chỉ mở khi đúng vai trò QUAN_TRI)
  if (view === 'admin' && currentUser?.vaiTro === 'QUAN_TRI') {
    const adminProps = {
      adminUser: currentUser,
      onNavigate: setAdminTab,
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
        return <AdminOrders {...adminProps} />
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
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onOpenAdmin={(tab = 'dashboard') => {
          setView('admin')
          setAdminTab(tab)
        }}
        onChonMucTaiKhoan={(muc) => {
          if (muc === 'don-hang') {
            setView('my-orders')
          } else if (muc === 'thiet-ke-png') {
            setSelectedProductId(1)
            setView('product-detail')
          }
        }}
        onLogout={handleLogout}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      {view === 'checkout' ? (
        <CheckoutWizard
          cartItems={gioHang}
          onUpdateCart={setGioHang}
          onBackToStore={() => setView('store')}
          currentUser={currentUser}
          onViewOrders={() => setView('my-orders')}
        />
      ) : view === 'my-orders' ? (
        <LichSuDonHang
          currentUser={currentUser}
          onBackToStore={() => setView('store')}
          onOpenLogin={() => setIsAuthModalOpen(true)}
        />
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
          <DanhMuc />
          <SanPhamTieuBieu
            themVaoGio={themVaoGio}
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
          <ChinhSach />
        </main>
      )}

      <ChanTrang />

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