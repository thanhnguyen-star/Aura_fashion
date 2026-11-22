import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import AdminLayout from './AdminLayout';

const API_BASE = 'http://localhost:5000';

const ORDER_STATUS_MAP = {
  CHO_XAC_NHAN: { label: 'Chờ xác nhận', tone: 'warning' },
  DA_XAC_NHAN: { label: 'Đã xác nhận', tone: 'neutral' },
  DANG_GIAO: { label: 'Đang giao', tone: 'neutral' },
  DA_GIAO: { label: 'Đã giao', tone: 'success' },
  HUY: { label: 'Hủy', tone: 'danger' },
};

const PAYMENT_STATUS_MAP = {
  CHUA_THANH_TOAN: { label: 'Chưa thanh toán', tone: 'neutral' },
  DA_THANH_TOAN: { label: 'Đã thanh toán', tone: 'success' },
};

function formatVND(amount, spaceBeforeUnit = false) {
  const formatted = new Intl.NumberFormat('vi-VN').format(Number(amount) || 0);
  return spaceBeforeUnit ? `${formatted} đ` : `${formatted}đ`;
}

export default function AdminDashboard({
  adminUser,
  onNavigate,
  onLogout,
  onBackToStore,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    tongDoanhThu: 0,
    tongDonHang: 0,
    soSanPham: 0,
    donChoXuLy: 0,
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('aura_admin_token');

    fetch(`${API_BASE}/api/admin/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401 || res.status === 403) {
          onLogout?.();
          throw new Error(data.message || 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
        }
        if (!res.ok) {
          throw new Error(data.error || data.message || `Lỗi máy chủ (${res.status})`);
        }
        return data;
      })
      .then((data) => {
        setStats(data.stats);
        setOrders(data.orders || []);
        setError('');
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [onLogout]);

  const handleOpenDetail = async (order) => {
    setSelectedOrder(order);
    const token = localStorage.getItem('aura_admin_token');
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders/${order.MaDonHang}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const detail = await res.json();
        setSelectedOrder(detail);
      }
    } catch {
      // Giữ nguyên thông tin cơ bản nếu không tải được dòng sản phẩm
    }
  };

  const filteredOrders = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return orders;
    return orders.filter((order) => {
      const statusText = ORDER_STATUS_MAP[order.TrangThai]?.label || '';
      return (
        order.MaHienThi.toLowerCase().includes(keyword) ||
        order.TenNguoiNhan.toLowerCase().includes(keyword) ||
        order.DienThoaiNhan.toLowerCase().includes(keyword) ||
        statusText.toLowerCase().includes(keyword)
      );
    });
  }, [orders, searchQuery]);

  const kpiCards = [
    { label: 'TỔNG DOANH THU', value: formatVND(stats.tongDoanhThu) },
    { label: 'TỔNG ĐƠN HÀNG', value: new Intl.NumberFormat('vi-VN').format(stats.tongDonHang) },
    { label: 'SỐ SẢN PHẨM', value: new Intl.NumberFormat('vi-VN').format(stats.soSanPham) },
    { label: 'ĐƠN CHỜ XỬ LÝ', value: new Intl.NumberFormat('vi-VN').format(stats.donChoXuLy) },
  ];

  return (
    <AdminLayout
      activeMenu="dashboard"
      adminUser={adminUser}
      onSelectMenu={onNavigate}
      onLogout={onLogout}
      onBackToStore={onBackToStore}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="aura-page-header">
        <h1 className="aura-page-title">Thống kê tổng quan</h1>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 6,
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
          }}
        >
          Lỗi tải dữ liệu: {error}
        </div>
      )}

      {/* 4 KPI Cards */}
      <section className="aura-kpi-grid">
        {kpiCards.map((stat) => (
          <div key={stat.label} className="aura-kpi-card">
            <p className="aura-kpi-label">{stat.label}</p>
            <p className="aura-kpi-value">{loading ? '...' : stat.value}</p>
          </div>
        ))}
      </section>

      {/* Bảng Đơn hàng chờ xử lý */}
      <section className="aura-card">
        <div className="aura-card-header">
          <h2 className="aura-card-title">Đơn hàng chờ xử lý</h2>
          <button
            type="button"
            className="aura-text-link"
            onClick={() => onNavigate?.('orders')}
          >
            Xem tất cả đơn hàng →
          </button>
        </div>

        <div className="aura-table-wrap">
          <table className="aura-table">
            <thead>
              <tr>
                <th>MÃ ĐƠN</th>
                <th>KHÁCH HÀNG</th>
                <th>TỔNG TIỀN</th>
                <th>TRẠNG THÁI ĐƠN</th>
                <th>THANH TOÁN</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="aura-empty-cell">
                    Đang tải dữ liệu từ MySQL...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="aura-empty-cell">
                    Chưa có đơn hàng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusInfo = ORDER_STATUS_MAP[order.TrangThai] || {
                    label: order.TrangThai,
                    tone: 'neutral',
                  };
                  const paymentInfo = PAYMENT_STATUS_MAP[order.TrangThaiThanhToan] || {
                    label: order.TrangThaiThanhToan,
                    tone: 'neutral',
                  };

                  return (
                    <tr key={order.MaDonHang}>
                      <td className="aura-order-id">{order.MaHienThi}</td>
                      <td>
                        <div className="aura-customer-name">{order.TenNguoiNhan}</div>
                        <div className="aura-customer-phone">{order.DienThoaiNhan}</div>
                      </td>
                      <td className="aura-price">{formatVND(order.TongThanhToan, true)}</td>
                      <td>
                        <span className={`aura-badge aura-badge-${statusInfo.tone}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        <span className={`aura-badge aura-badge-${paymentInfo.tone}`}>
                          {paymentInfo.label}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="aura-text-link"
                          onClick={() => handleOpenDetail(order)}
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="aura-card-footer">
          <button
            type="button"
            className="aura-text-link"
            onClick={() => onNavigate?.('orders')}
          >
            Xem tất cả đơn hàng →
          </button>
        </div>
      </section>

      {/* Modal xem nhanh đơn hàng */}
      {selectedOrder && (
        <div
          className="aura-modal-backdrop"
          onClick={() => setSelectedOrder(null)}
        >
          <div className="aura-modal" onClick={(e) => e.stopPropagation()}>
            <div className="aura-modal-header">
              <h3>Chi tiết đơn {selectedOrder.MaHienThi}</h3>
              <button
                type="button"
                className="aura-icon-btn"
                onClick={() => setSelectedOrder(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="aura-modal-body">
              <div className="aura-modal-row">
                <span>Người nhận</span>
                <strong>{selectedOrder.TenNguoiNhan}</strong>
              </div>
              <div className="aura-modal-row">
                <span>Số điện thoại</span>
                <span>{selectedOrder.DienThoaiNhan}</span>
              </div>
              <div className="aura-modal-row">
                <span>Địa chỉ giao</span>
                <span>{selectedOrder.DiaChiGiao}</span>
              </div>
              <div className="aura-modal-row">
                <span>Phương thức</span>
                <span>{selectedOrder.PhuongThuc}</span>
              </div>
              <div className="aura-modal-row">
                <span>Tổng thanh toán</span>
                <strong>{formatVND(selectedOrder.TongThanhToan, true)}</strong>
              </div>
              {selectedOrder.items?.length > 0 && (
                <div style={{ borderTop: '1px solid #eef0f4', paddingTop: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Sản phẩm trong đơn:</div>
                  {selectedOrder.items.map((item) => (
                    <div key={item.MaDongDon} className="aura-modal-row" style={{ marginBottom: 4 }}>
                      <span>
                        {item.TenSanPhamLucMua} ({item.MauSacLucMua} / {item.KichThuocLucMua}) × {item.SoLuong}
                      </span>
                      <span>{formatVND(item.ThanhTien, true)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}