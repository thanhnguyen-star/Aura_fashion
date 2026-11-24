import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { adminFetch } from '../../utils/api';
import AdminLayout from './AdminLayout';
import '../css/adminCustomers.css';

const TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'active', label: 'Đang hoạt động' },
  { id: 'locked', label: 'Đã khóa' },
];

function formatCurrency(val) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function AdminCustomers({ adminUser, onNavigate, onLogout, onBackToStore }) {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    tongKhachHang: 0,
    dangHoatDong: 0,
    biKhoa: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({
        status: activeTab,
        search,
        page: 1,
        limit: 50,
      });

      const res = await adminFetch(`/api/admin/customers?${query}`);
      if (res.success) {
        setCustomers(res.data.customers);
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách khách hàng:', err);
      setError(err.message || 'Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // Khóa / Mở khóa tài khoản
  const handleToggleLock = async (cust) => {
    const actionText = cust.BiKhoa ? 'MỞ KHÓA' : 'KHÓA';
    const warning = cust.BiKhoa
      ? `Bạn có chắc chắn muốn MỞ KHÓA cho tài khoản ${cust.HoTen} (${cust.Email})?`
      : `Bạn có chắc chắn muốn KHÓA tài khoản ${cust.HoTen} (${cust.Email})? Khách hàng sẽ bị chặn đăng nhập và nhận thông báo liên hệ care@aura.vn.`;

    const confirmed = window.confirm(warning);
    if (!confirmed) return;

    try {
      setTogglingId(cust.MaTaiKhoan);
      const res = await adminFetch(`/api/admin/customers/${cust.MaTaiKhoan}/toggle-lock`, {
        method: 'PATCH',
      });

      if (res.success) {
        // Cập nhật state local
        setCustomers((prev) =>
          prev.map((c) =>
            c.MaTaiKhoan === cust.MaTaiKhoan ? { ...c, BiKhoa: res.data.biKhoa } : c
          )
        );
        fetchCustomers();
      }
    } catch (err) {
      alert(`Lỗi khi ${actionText} tài khoản: ` + err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const getTabCount = (tabId) => {
    switch (tabId) {
      case 'active':
        return stats.dangHoatDong;
      case 'locked':
        return stats.biKhoa;
      default:
        return stats.tongKhachHang;
    }
  };

  return (
    <AdminLayout
      activeMenu="customers"
      adminUser={adminUser}
      onSelectMenu={onNavigate}
      onLogout={onLogout}
      onBackToStore={onBackToStore}
    >
      <div className="ac-shell">
        {/* Header */}
        <header className="ac-header">
          <div>
            <p className="ac-eyebrow">AURA CONSOLE · ACCOUNTS</p>
            <h1 className="ac-title">Quản Lý Khách Hàng</h1>
            <p className="ac-subtitle">
              Danh sách hội viên Aura Fashion, theo dõi lịch sử mua sắm và cơ chế kiểm soát bảo vệ tài khoản.
            </p>
          </div>
          <div className="ac-header-stats">
            <div className="ac-stat-card">
              <span className="ac-stat-label">Tổng Hội Viên</span>
              <span className="ac-stat-val">{stats.tongKhachHang}</span>
            </div>
            <div className="ac-stat-card">
              <span className="ac-stat-label">Đang Hoạt Động</span>
              <span className="ac-stat-val" style={{ color: '#10b981' }}>
                {stats.dangHoatDong}
              </span>
            </div>
            <div className="ac-stat-card">
              <span className="ac-stat-label">Tài Khoản Đã Khóa</span>
              <span className="ac-stat-val" style={{ color: stats.biKhoa > 0 ? '#ef4444' : '#71717a' }}>
                {stats.biKhoa}
              </span>
            </div>
          </div>
        </header>

        {/* Toolbar */}
        <div className="ac-toolbar">
          <div className="ac-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`ac-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="ac-tab-badge">{getTabCount(tab.id)}</span>
              </button>
            ))}
          </div>

          <div className="ac-search-wrap">
            <Search size={15} color="#71717a" />
            <input
              type="text"
              placeholder="Tìm theo họ tên, email, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ac-search-input"
            />
          </div>
        </div>

        {/* Table */}
        <div className="ac-table-container">
          {loading ? (
            <div className="ac-empty">
              <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
              Đang tải danh sách khách hàng...
            </div>
          ) : error ? (
            <div className="ac-empty" style={{ color: '#ef4444' }}>
              {error}
            </div>
          ) : customers.length === 0 ? (
            <div className="ac-empty">Không tìm thấy khách hàng nào phù hợp với bộ lọc.</div>
          ) : (
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Mã Khách Hàng</th>
                  <th>Hội Viên</th>
                  <th>Số Điện Thoại</th>
                  <th>Ngày Tham Gia</th>
                  <th>Số Đơn Đã Mua</th>
                  <th>Tổng Chi Tiêu</th>
                  <th>Trạng Thái</th>
                  <th>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => {
                  const initial = (cust.HoTen || 'K').charAt(0).toUpperCase();

                  return (
                    <tr key={cust.MaTaiKhoan}>
                      <td>
                        <span className="ac-code-badge">{cust.MaHienThi}</span>
                      </td>
                      <td>
                        <div className="ac-cust-cell">
                          <div className="ac-cust-avatar">{initial}</div>
                          <div>
                            <div className="ac-cust-name">{cust.HoTen}</div>
                            <div className="ac-cust-sub">{cust.Email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{cust.SoDienThoai || 'Chưa cập nhật'}</td>
                      <td>{formatDate(cust.NgayTao)}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <ShoppingBag size={13} color="#71717a" />
                          {cust.TongDonHang} đơn
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#09090b' }}>{formatCurrency(cust.TongChiTieu)}</strong>
                      </td>
                      <td>
                        {cust.BiKhoa ? (
                          <span className="ac-badge-locked">
                            <ShieldAlert size={12} />
                            ĐÃ KHÓA
                          </span>
                        ) : (
                          <span className="ac-badge-active">
                            <ShieldCheck size={12} />
                            HOẠT ĐỘNG
                          </span>
                        )}
                      </td>
                      <td>
                        {cust.BiKhoa ? (
                          <button
                            type="button"
                            className="ac-btn-unlock"
                            disabled={togglingId === cust.MaTaiKhoan}
                            onClick={() => handleToggleLock(cust)}
                          >
                            <Unlock size={13} />
                            <span>Mở khóa</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="ac-btn-lock"
                            disabled={togglingId === cust.MaTaiKhoan}
                            onClick={() => handleToggleLock(cust)}
                          >
                            <Lock size={13} />
                            <span>Khóa tài khoản</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
