import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Package,
  X,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { adminFetch } from '../../utils/api';
import AdminLayout from './AdminLayout';
import '../css/adminOrders.css';

const TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'CHO_XAC_NHAN', label: 'Chờ xác nhận' },
  { id: 'DA_XAC_NHAN', label: 'Đã xác nhận' },
  { id: 'DANG_GIAO', label: 'Đang giao' },
  { id: 'DA_GIAO', label: 'Đã giao' },
  { id: 'HUY', label: 'Đã hủy' },
];

const STATUS_LABELS = {
  CHO_XAC_NHAN: { text: 'Chờ xác nhận', icon: Clock, className: 'CHO_XAC_NHAN' },
  DA_XAC_NHAN: { text: 'Đã xác nhận', icon: CheckCircle2, className: 'DA_XAC_NHAN' },
  DANG_GIAO: { text: 'Đang giao', icon: Truck, className: 'DANG_GIAO' },
  DA_GIAO: { text: 'Đã giao', icon: Package, className: 'DA_GIAO' },
  HUY: { text: 'Đã hủy', icon: XCircle, className: 'HUY' },
};

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
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminOrders({
  adminUser,
  onNavigate,
  onLogout,
  onBackToStore,
  initialStatus = 'all',
}) {
  const [activeTab, setActiveTab] = useState(initialStatus);
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    tatCa: 0,
    choXacNhan: 0,
    daXacNhan: 0,
    dangGiao: 0,
    daGiao: 0,
    daHuy: 0,
    doanhThuThucTe: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal chi tiết đơn hàng
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({
        status: activeTab,
        search,
        page: 1,
        limit: 50,
      });

      const res = await adminFetch(`/api/admin/orders?${query}`);
      if (res.success) {
        setOrders(res.data.orders);
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đơn:', err);
      setError(err.message || 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  // Xem chi tiết đơn
  const handleOpenDetail = async (orderId) => {
    try {
      setLoadingDetail(true);
      setSelectedOrder(null);
      const res = await adminFetch(`/api/admin/orders/${orderId}`);
      if (res.success) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      alert('Lỗi tải chi tiết đơn hàng: ' + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Cập nhật trạng thái đơn
  const handleChangeStatus = async (newStatus) => {
    if (!selectedOrder) return;
    if (newStatus === selectedOrder.TrangThai) return;

    if (newStatus === 'HUY') {
      const confirmCancel = window.confirm(
        'Bạn có chắc chắn muốn HỦY đơn hàng này? Số lượng tồn kho các sản phẩm sẽ được tự động hoàn trả lại kho.'
      );
      if (!confirmCancel) return;
    }

    try {
      setUpdatingStatus(true);
      const res = await adminFetch(`/api/admin/orders/${selectedOrder.MaDonHang}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ trangThai: newStatus }),
      });

      if (res.success) {
        // Cập nhật state local
        setSelectedOrder((prev) => ({
          ...prev,
          TrangThai: newStatus,
          TrangThaiThanhToan: newStatus === 'DA_GIAO' ? 'DA_THANH_TOAN' : prev.TrangThaiThanhToan,
        }));
        fetchOrders();
      }
    } catch (err) {
      alert('Lỗi cập nhật trạng thái: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Cập nhật trạng thái thanh toán
  const handleTogglePayment = async () => {
    if (!selectedOrder) return;
    const newPayment = selectedOrder.TrangThaiThanhToan === 'DA_THANH_TOAN' ? 'CHUA_THANH_TOAN' : 'DA_THANH_TOAN';

    try {
      setUpdatingStatus(true);
      const res = await adminFetch(`/api/admin/orders/${selectedOrder.MaDonHang}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({ trangThaiThanhToan: newPayment }),
      });

      if (res.success) {
        setSelectedOrder((prev) => ({ ...prev, TrangThaiThanhToan: newPayment }));
        fetchOrders();
      }
    } catch (err) {
      alert('Lỗi cập nhật thanh toán: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Lấy badge count cho từng tab
  const getTabCount = (tabId) => {
    switch (tabId) {
      case 'CHO_XAC_NHAN':
        return stats.choXacNhan;
      case 'DA_XAC_NHAN':
        return stats.daXacNhan;
      case 'DANG_GIAO':
        return stats.dangGiao;
      case 'DA_GIAO':
        return stats.daGiao;
      case 'HUY':
        return stats.daHuy;
      default:
        return stats.tatCa;
    }
  };

  return (
    <AdminLayout
      activeMenu="orders"
      adminUser={adminUser}
      onSelectMenu={onNavigate}
      onLogout={onLogout}
      onBackToStore={onBackToStore}
    >
      <div className="ao-shell">
        {/* Header */}
        <header className="ao-header">
          <div>
            <p className="ao-eyebrow">AURA CONSOLE · FULFILLMENT</p>
            <h1 className="ao-title">Quản Lý Đơn Hàng & Xưởng In</h1>
            <p className="ao-subtitle">
              Tiếp nhận đơn hàng, điều phối tiến trình sản xuất và tải file in ấn DTG độ phân giải cao cho xưởng.
            </p>
          </div>
          <div className="ao-header-stats">
            <div className="ao-stat-card">
              <span className="ao-stat-label">Tổng Đơn Hàng</span>
              <span className="ao-stat-val">{stats.tatCa}</span>
            </div>
            <div className="ao-stat-card">
              <span className="ao-stat-label">Doanh Thu Thực Nhận</span>
              <span className="ao-stat-val" style={{ color: '#10b981' }}>
                {formatCurrency(stats.doanhThuThucTe)}
              </span>
            </div>
          </div>
        </header>

        {/* Toolbar: Tabs & Search */}
        <div className="ao-toolbar">
          <div className="ao-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`ao-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="ao-tab-badge">{getTabCount(tab.id)}</span>
              </button>
            ))}
          </div>

          <div className="ao-search-wrap">
            <Search size={15} color="#71717a" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn, tên, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ao-search-input"
            />
          </div>
        </div>

        {/* Bảng danh sách đơn hàng */}
        <div className="ao-table-container">
          {loading ? (
            <div className="ao-empty">
              <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', display: 'block' }} />
              Đang tải dữ liệu đơn hàng...
            </div>
          ) : error ? (
            <div className="ao-empty" style={{ color: '#ef4444' }}>
              {error}
            </div>
          ) : orders.length === 0 ? (
            <div className="ao-empty">Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</div>
          ) : (
            <table className="ao-table">
              <thead>
                <tr>
                  <th>Mã Đơn</th>
                  <th>Khách Hàng</th>
                  <th>Ngày Đặt</th>
                  <th>Số Lượng</th>
                  <th>Tổng Tiền</th>
                  <th>Phương Thức</th>
                  <th>Thanh Toán</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusInfo = STATUS_LABELS[order.TrangThai] || {
                    text: order.TrangThai,
                    className: 'CHO_XAC_NHAN',
                  };
                  const StatusIcon = statusInfo.icon || Package;

                  return (
                    <tr key={order.MaDonHang}>
                      <td>
                        <span className="ao-code-badge">{order.MaHienThi}</span>
                      </td>
                      <td>
                        <div className="ao-cust-name">{order.TenNguoiNhan}</div>
                        <div className="ao-cust-sub">
                          {order.DienThoaiNhan} {order.EmailKhachHang && `· ${order.EmailKhachHang}`}
                        </div>
                      </td>
                      <td>{formatDate(order.NgayDat)}</td>
                      <td>
                        <strong>{order.soLuongMon}</strong> món
                      </td>
                      <td>
                        <span className="ao-price">{formatCurrency(order.TongThanhToan)}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '11.5px', fontWeight: 600 }}>
                          {order.PhuongThuc === 'QR' ? 'VietQR' : 'COD'}
                        </span>
                      </td>
                      <td>
                        {order.TrangThaiThanhToan === 'DA_THANH_TOAN' ? (
                          <span className="ao-pay-paid">ĐÃ THANH TOÁN</span>
                        ) : (
                          <span className="ao-pay-unpaid">CHƯA THANH TOÁN</span>
                        )}
                      </td>
                      <td>
                        <span className={`ao-badge ${statusInfo.className}`}>
                          <StatusIcon size={12} />
                          {statusInfo.text}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ao-btn-view"
                          onClick={() => handleOpenDetail(order.MaDonHang)}
                        >
                          <Eye size={13} />
                          <span>Chi tiết & In</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Loading chi tiết đơn hàng */}
        {loadingDetail && (
          <div className="ao-modal-backdrop">
            <div className="ao-modal" style={{ maxWidth: '320px', padding: '30px', textAlign: 'center' }}>
              <RefreshCw className="spin" size={24} style={{ margin: '0 auto 10px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: '13px', color: '#71717a' }}>Đang tải chi tiết đơn & tệp in...</p>
            </div>
          </div>
        )}

        {/* Modal Xem Chi Tiết Đơn Hàng & Tải File Xưởng In */}
        {selectedOrder && (
          <div className="ao-modal-backdrop" onClick={() => setSelectedOrder(null)}>
            <div className="ao-modal" onClick={(e) => e.stopPropagation()}>
              <div className="ao-modal-header">
                <h3 className="ao-modal-title">
                  <Package size={18} />
                  Chi Tiết Đơn Hàng {selectedOrder.MaHienThi}
                </h3>
                <button
                  type="button"
                  className="ao-modal-close"
                  onClick={() => setSelectedOrder(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ao-modal-body">
                {/* Grid Thông Tin Nhận Hàng & Điều Khiển Trạng Thái */}
                <div className="ao-info-grid">
                  <div className="ao-info-col">
                    <h4>Thông Tin Giao Nhận</h4>
                    <div className="ao-info-row">
                      <span className="ao-info-label">Người nhận:</span>
                      <span className="ao-info-val">
                        <strong>{selectedOrder.TenNguoiNhan}</strong> ({selectedOrder.DienThoaiNhan})
                      </span>
                    </div>
                    <div className="ao-info-row">
                      <span className="ao-info-label">Địa chỉ giao:</span>
                      <span className="ao-info-val">{selectedOrder.DiaChiGiao}</span>
                    </div>
                    <div className="ao-info-row">
                      <span className="ao-info-label">Phương thức:</span>
                      <span className="ao-info-val">
                        {selectedOrder.PhuongThuc === 'QR' ? 'Chuyển khoản VietQR' : 'Thanh toán COD khi nhận hàng'}
                      </span>
                    </div>
                    {selectedOrder.GhiChu && (
                      <div className="ao-info-row">
                        <span className="ao-info-label">Ghi chú:</span>
                        <span className="ao-info-val" style={{ fontStyle: 'italic' }}>
                          {selectedOrder.GhiChu}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="ao-info-col ao-status-control">
                    <h4>Cập Nhật Trạng Thái Đơn</h4>
                    <div>
                      <label style={{ fontSize: '11px', color: '#71717a', display: 'block', marginBottom: '4px' }}>
                        Trạng thái đơn hàng:
                      </label>
                      <select
                        className="ao-select-status"
                        value={selectedOrder.TrangThai}
                        disabled={updatingStatus}
                        onChange={(e) => handleChangeStatus(e.target.value)}
                      >
                        <option value="CHO_XAC_NHAN">Chờ xác nhận</option>
                        <option value="DA_XAC_NHAN">Đã xác nhận (Cho phép in)</option>
                        <option value="DANG_GIAO">Đang giao hàng</option>
                        <option value="DA_GIAO">Đã giao thành công</option>
                        <option value="HUY">Hủy đơn hàng</option>
                      </select>
                    </div>

                    <div>
                      <button
                        type="button"
                        className="ao-btn-pay"
                        disabled={updatingStatus}
                        onClick={handleTogglePayment}
                      >
                        {selectedOrder.TrangThaiThanhToan === 'DA_THANH_TOAN'
                          ? 'Đã ghi nhận ĐÃ THANH TOÁN (Click để đổi)'
                          : '👉 Bấm xác nhận ĐÃ THANH TOÁN'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* KHU VỰC IN ẤN CHO XƯỞNG (ARTWORKS & DTG PRINT FILES) */}
                <div className="ao-print-section">
                  <div className="ao-print-header">
                    <h4 className="ao-print-title">
                      <Printer size={16} />
                      Tệp In Ấn Xưởng (Artwork DTG Download)
                    </h4>
                    <span style={{ fontSize: '12px', color: '#71717a' }}>
                      {selectedOrder.artworks?.length || 0} tệp mẫu in gốc
                    </span>
                  </div>

                  {(!selectedOrder.artworks || selectedOrder.artworks.length === 0) ? (
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#71717a' }}>
                      Đơn hàng không có mẫu in tùy biến (đơn áo trơn).
                    </p>
                  ) : (
                    <div className="ao-artwork-list">
                      {selectedOrder.artworks.map((art, idx) => (
                        <div key={idx} className="ao-artwork-card">
                          <img
                            src={art.DuongDanPNG}
                            alt={art.TenMauIn}
                            className="ao-artwork-preview"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="ao-artwork-meta">
                            <div className="ao-artwork-name" title={art.TenMauIn}>
                              {art.TenMauIn}
                            </div>
                            <span className="ao-artwork-tag">Vị trí: {art.TenViTri}</span>
                            <br />
                            <a
                              href={art.DuongDanPNG}
                              download={`${selectedOrder.MaHienThi}_${art.TenViTri}_${art.TenMauIn}.png`}
                              target="_blank"
                              rel="noreferrer"
                              className="ao-btn-download"
                            >
                              <Download size={12} />
                              Tải PNG Gốc ({art.KichThuocPx || '300 DPI'})
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Danh Sách Món Hàng */}
                <div>
                  <h4 style={{ margin: '0 0 10px', fontSize: '12.5px', textTransform: 'uppercase', color: '#71717a' }}>
                    Sản Phẩm Đã Mua
                  </h4>
                  <table className="ao-items-table">
                    <thead>
                      <tr>
                        <th>Sản phẩm</th>
                        <th>Biến thể</th>
                        <th>Đơn giá</th>
                        <th>Số lượng</th>
                        <th style={{ textAlign: 'right' }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.MaDongDon}>
                          <td>
                            <strong>{item.TenSanPhamLucMua}</strong>
                            <div style={{ fontSize: '11px', color: '#71717a' }}>SKU: {item.SKULucMua}</div>
                          </td>
                          <td>
                            Size: <strong>{item.KichThuocLucMua}</strong> · Màu: <strong>{item.MauSacLucMua}</strong>
                          </td>
                          <td>{formatCurrency(item.DonGia)}</td>
                          <td>x{item.SoLuong}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(item.ThanhTien)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="ao-total-summary">
                    <div>
                      Tiền hàng: <strong>{formatCurrency(selectedOrder.TienHang)}</strong>
                    </div>
                    <div>
                      Phí giao hàng: <strong>{formatCurrency(selectedOrder.PhiGiaoHang)}</strong>
                    </div>
                    <div className="ao-total-final">
                      Tổng thanh toán: {formatCurrency(selectedOrder.TongThanhToan)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
