import { useState } from 'react';
import {
  LayoutGrid,
  Shirt,
  Shapes,
  Image,
  ClipboardList,
  Users,
  Store,
  ArrowUpRight,
  User,
  Search,
  Bell,
  Plus,
  LogOut,
} from 'lucide-react';
import '../css/admin.css';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Thống kê', icon: LayoutGrid },
  { id: 'products', label: 'Sản phẩm', icon: Shirt },
  { id: 'categories', label: 'Danh mục', icon: Shapes },
  { id: 'print-templates', label: 'Mẫu in', icon: Image },
  { id: 'orders', label: 'Đơn hàng', icon: ClipboardList },
  { id: 'customers', label: 'Khách hàng', icon: Users },
];

export default function AdminLayout({
  activeMenu = 'dashboard',
  adminUser,
  onSelectMenu,
  onLogout,
  onBackToStore,
  searchQuery = '',
  onSearchChange,
  children,
}) {
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  return (
    <div className="aura-admin-shell">
      <aside className="aura-sidebar">
        <div className="aura-sidebar-brand">
          <div
            className="aura-brand-left"
            onClick={onBackToStore}
            style={{ cursor: 'pointer' }}
            title="Về trang chủ cửa hàng"
          >
            <span className="aura-logo-text">AURA</span>
            <span className="aura-console-badge">CONSOLE</span>
          </div>
          <span className="aura-status-dot" />
        </div>

        <nav className="aura-nav-section">
          <p className="aura-nav-label">QUẢN TRỊ HỆ THỐNG</p>
          <ul className="aura-nav-list">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`aura-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectMenu?.(item.id)}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="aura-sidebar-footer">
          <button
            type="button"
            className="aura-store-link"
            onClick={onBackToStore}
          >
            <span className="aura-store-link-left">
              <Store size={15} strokeWidth={1.8} />
              <span>Xem cửa hàng</span>
            </span>
            <ArrowUpRight size={15} strokeWidth={1.8} />
          </button>

          <div className="aura-admin-profile">
            <div className="aura-avatar">
              <User size={16} />
              <span className="aura-avatar-online" />
            </div>
            <div className="aura-admin-info">
              <span className="aura-admin-name">
                {adminUser?.hoTen || 'Quản trị viên'}
              </span>
              <span className="aura-admin-email">
                {adminUser?.email || ''}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="aura-logout-btn"
            onClick={onLogout}
          >
            <LogOut size={14} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="aura-main-wrapper">
        <header className="aura-topbar">
          <div className="aura-search-box">
            <Search size={15} className="aura-search-icon" />
            <input
              type="text"
              className="aura-search-input"
              placeholder="Tìm đơn hàng, sản phẩm, mã in..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>

          <div className="aura-topbar-actions">
            <span className="aura-system-pill">
              <span className="aura-system-dot" />
              HỆ THỐNG HOẠT ĐỘNG
            </span>

            <button
              type="button"
              className="aura-icon-btn"
              aria-label="Thông báo"
            >
              <Bell size={18} strokeWidth={1.8} />
              <span className="aura-bell-dot" />
            </button>

            <button
              type="button"
              className="aura-quick-btn"
              onClick={() => setShowQuickMenu((prev) => !prev)}
            >
              <Plus size={15} strokeWidth={2.2} />
              <span>THAO TÁC NHANH</span>
            </button>

            {showQuickMenu && (
              <div className="aura-quick-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickMenu(false);
                    onSelectMenu?.('products');
                  }}
                >
                  + Thêm sản phẩm mới
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickMenu(false);
                    onSelectMenu?.('print-templates');
                  }}
                >
                  + Tải lên mẫu in mới
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickMenu(false);
                    onSelectMenu?.('orders', { status: 'CHO_XAC_NHAN' });
                  }}
                >
                  + Xem đơn chờ xử lý
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="aura-content">{children}</main>
      </div>
    </div>
  );
}