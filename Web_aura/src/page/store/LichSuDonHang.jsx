import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  AlertTriangle,
  X,
  Sparkles,
  ShoppingBag,
  Loader2,
  LogIn,
} from 'lucide-react';
import '../css/lichSuDonHang.css';

const TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'CHO_XAC_NHAN', label: 'Chờ xác nhận' },
  { id: 'DA_XAC_NHAN', label: 'Đã xác nhận' },
  { id: 'DANG_GIAO', label: 'Đang giao' },
  { id: 'DA_GIAO', label: 'Đã giao' },
  { id: 'HUY', label: 'Đã hủy' },
];

function formatCurrency(val) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function LichSuDonHang({
  currentUser,
  onBackToStore,
  onOpenLogin,
}) {
  const [currentTab, setCurrentTab] = useState('ALL');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal chi tiết & Hủy
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelingOrder, setCancelingOrder] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const fetchOrders = useCallback(async (tab) => {
    const token = localStorage.getItem('aura_admin_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const url = `http://localhost:5000/api/store/my-orders${tab !== 'ALL' ? `?status=${tab}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi tải danh sách đơn hàng');
      }

      setOrders(data.data || []);
    } catch (err) {
      console.error('Lỗi tải đơn hàng:', err);
      setError(err.message || 'Không thể tải đơn hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(currentTab);
    }, 0);
    return () => clearTimeout(timer);
  }, [currentTab, fetchOrders]);

  // Xử lý Hủy đơn hàng
  const handleConfirmCancel = async () => {
    if (!cancelingOrder) return;
    try {
      setCancelLoading(true);
      setCancelError('');
      const token = localStorage.getItem('aura_admin_token');
      const res = await fetch(`http://localhost:5000/api/store/my-orders/${cancelingOrder.maDonHang}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể hủy đơn hàng');
      }

      setToastMessage(data.message || 'Đã hủy đơn hàng thành công');
      setCancelingOrder(null);
      setSelectedOrder(null);
      fetchOrders(currentTab);

      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error('Lỗi khi hủy đơn:', err);
      setCancelError(err.message || 'Không thể hủy đơn hàng lúc này');
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CHO_XAC_NHAN':
        return <span className="lsdh-badge CHO_XAC_NHAN"><Clock size={12} /> Chờ xác nhận</span>;
      case 'DA_XAC_NHAN':
        return <span className="lsdh-badge DA_XAC_NHAN"><CheckCircle size={12} /> Đã xác nhận</span>;
      case 'DANG_GIAO':
        return <span className="lsdh-badge DANG_GIAO"><Truck size={12} /> Đang giao</span>;
      case 'DA_GIAO':
        return <span className="lsdh-badge DA_GIAO"><CheckCircle size={12} /> Đã giao</span>;
      case 'HUY':
        return <span className="lsdh-badge HUY"><XCircle size={12} /> Đã hủy</span>;
      default:
        return <span className="lsdh-badge">{status}</span>;
    }
  };

  return (
    <div className="lsdh-shell">
      <div className="lsdh-container">
        {/* Navigation Bar */}
        <div className="lsdh-nav-bar">
          <button type="button" className="lsdh-back-btn" onClick={onBackToStore}>
            <ArrowLeft size={16} />
            <span>Tiếp tục mua sắm</span>
          </button>
        </div>

        <h1 className="lsdh-header-title">Đơn hàng của tôi</h1>
        <p className="lsdh-header-sub">
          Theo dõi tiến độ, chi tiết thông tin và lịch sử in ấn đơn hàng AURA của bạn.
        </p>

        {/* Thông báo Toast */}
        {toastMessage && (
          <div style={{
            background: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <CheckCircle size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Chưa đăng nhập */}
        {!currentUser && (
          <div className="lsdh-empty-state">
            <LogIn className="lsdh-empty-icon" />
            <h2 className="lsdh-empty-title">Bạn chưa đăng nhập</h2>
            <p className="lsdh-empty-desc">
              Vui lòng đăng nhập vào tài khoản AURA để xem và theo dõi danh sách các đơn hàng đã đặt.
            </p>
            <button
              type="button"
              className="lsdh-empty-btn"
              onClick={onOpenLogin}
            >
              Đăng nhập ngay
            </button>
          </div>
        )}

        {/* Đã đăng nhập */}
        {currentUser && (
          <>
            {/* Filter Tabs (Screen 15 Figma) */}
            <div className="lsdh-tabs-wrapper">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`lsdh-tab-btn ${currentTab === tab.id ? 'active' : ''}`}
                  onClick={() => setCurrentTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#71717a' }}>
                <Loader2 size={32} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '12px', fontSize: '13px' }}>Đang tải danh sách đơn hàng...</p>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div style={{
                background: '#fee2e2',
                color: '#991b1b',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            {/* Empty State (Screen 18 Figma) */}
            {!loading && !error && orders.length === 0 && (
              <div className="lsdh-empty-state">
                <ShoppingBag className="lsdh-empty-icon" />
                <h2 className="lsdh-empty-title">Chưa có đơn hàng nào</h2>
                <p className="lsdh-empty-desc">
                  {currentTab === 'ALL'
                    ? 'Bạn chưa có bất kỳ đơn hàng nào tại AURA. Hãy khám phá ngay các bộ sưu tập áo thun cao cấp và phôi in độc quyền.'
                    : `Không có đơn hàng nào trong trạng thái "${TABS.find((t) => t.id === currentTab)?.label}".`}
                </p>
                <button
                  type="button"
                  className="lsdh-empty-btn"
                  onClick={onBackToStore}
                >
                  Khám phá bộ sưu tập ngay
                </button>
              </div>
            )}

            {/* Order Cards List */}
            {!loading && !error && orders.length > 0 && (
              <div className="lsdh-orders-list">
                {orders.map((ord) => (
                  <article key={ord.maDonHang} className="lsdh-order-card">
                    {/* Header */}
                    <div className="lsdh-card-header">
                      <div className="lsdh-order-id-group">
                        <span className="lsdh-order-code">{ord.maHienThi}</span>
                        <span className="lsdh-order-time">{formatDate(ord.ngayTao)}</span>
                      </div>
                      <div>{getStatusBadge(ord.trangThai)}</div>
                    </div>

                    {/* Danh sách mặt hàng */}
                    <div className="lsdh-items-group">
                      {ord.items?.map((it) => (
                        <div key={it.maChiTiet} className="lsdh-item-row">
                          <img
                            src={it.anhSanPham || '/img/sp1.png'}
                            alt={it.tenSanPham}
                            className="lsdh-item-thumb"
                          />
                          <div className="lsdh-item-info">
                            <h4 className="lsdh-item-title">{it.tenSanPham}</h4>
                            <div className="lsdh-item-meta">
                              <span>Size: {it.kichThuoc}</span>
                              <span>·</span>
                              <span>Màu: {it.mauSac}</span>
                            </div>
                            {it.hasPrint && it.printInfo && (
                              <div className="lsdh-print-tag">
                                <Sparkles size={11} color="#10b981" />
                                <span>In: {it.printInfo.tenMauIn} ({it.printInfo.tenViTri})</span>
                              </div>
                            )}
                          </div>
                          <div className="lsdh-item-price-qty">
                            <div className="lsdh-item-price">{formatCurrency(it.donGia)}</div>
                            <div className="lsdh-item-qty">x{it.soLuong}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="lsdh-card-footer">
                      <div className="lsdh-total-group">
                        <span className="lsdh-total-label">Tổng thanh toán:</span>
                        <span className="lsdh-total-amount">{formatCurrency(ord.tongTien)}</span>
                        <span style={{ fontSize: '11px', color: '#71717a', marginLeft: '6px' }}>
                          ({ord.phuongThuc === 'QR' ? 'VietQR' : 'COD'})
                        </span>
                      </div>

                      <div className="lsdh-actions-group">
                        {ord.canCancel && (
                          <button
                            type="button"
                            className="lsdh-btn-cancel"
                            onClick={() => {
                              setCancelError('');
                              setCancelingOrder(ord);
                            }}
                          >
                            Hủy đơn hàng
                          </button>
                        )}
                        <button
                          type="button"
                          className="lsdh-btn-outline"
                          onClick={() => setSelectedOrder(ord)}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* MODAL CHI TIẾT ĐƠN HÀNG (SCREEN 17 FIGMA) */}
        {selectedOrder && (
          <div className="lsdh-modal-backdrop" onClick={() => setSelectedOrder(null)}>
            <div className="lsdh-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="lsdh-modal-header">
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Chi tiết đơn hàng {selectedOrder.maHienThi}</h3>
                  <p style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
                    Đặt lúc: {formatDate(selectedOrder.ngayTao)}
                  </p>
                </div>
                <button
                  type="button"
                  className="lsdh-modal-close"
                  onClick={() => setSelectedOrder(null)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* TIMELINE TRẠNG THÁI (SCREEN 16 FIGMA) */}
              <div className="lsdh-timeline">
                <div className={`lsdh-timeline-step ${selectedOrder.trangThai !== 'HUY' ? 'completed' : ''}`}>
                  <div className="lsdh-step-dot">1</div>
                  <span className="lsdh-step-label">Đặt hàng</span>
                </div>
                <div className={`lsdh-timeline-step ${['DA_XAC_NHAN', 'DANG_GIAO', 'DA_GIAO'].includes(selectedOrder.trangThai) ? 'completed' : selectedOrder.trangThai === 'CHO_XAC_NHAN' ? 'active' : ''}`}>
                  <div className="lsdh-step-dot">2</div>
                  <span className="lsdh-step-label">Xác nhận</span>
                </div>
                <div className={`lsdh-timeline-step ${['DANG_GIAO', 'DA_GIAO'].includes(selectedOrder.trangThai) ? 'completed' : selectedOrder.trangThai === 'DA_XAC_NHAN' ? 'active' : ''}`}>
                  <div className="lsdh-step-dot">3</div>
                  <span className="lsdh-step-label">Đang giao</span>
                </div>
                <div className={`lsdh-timeline-step ${selectedOrder.trangThai === 'DA_GIAO' ? 'completed' : selectedOrder.trangThai === 'HUY' ? 'active' : ''}`}>
                  <div className="lsdh-step-dot" style={{ background: selectedOrder.trangThai === 'HUY' ? '#dc2626' : undefined, color: selectedOrder.trangThai === 'HUY' ? '#fff' : undefined }}>
                    {selectedOrder.trangThai === 'HUY' ? '✕' : '4'}
                  </div>
                  <span className="lsdh-step-label">
                    {selectedOrder.trangThai === 'HUY' ? 'Đã hủy' : 'Hoàn tất'}
                  </span>
                </div>
              </div>

              {/* THÔNG TIN NGƯỜI NHẬN */}
              <div style={{ background: '#f4f4f5', borderRadius: '6px', padding: '16px', marginBottom: '20px', fontSize: '13px' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '14px' }}>Địa chỉ nhận hàng</h4>
                <div>Người nhận: <strong>{selectedOrder.tenNguoiNhan}</strong> ({selectedOrder.dienThoaiNhan})</div>
                <div style={{ marginTop: '4px' }}>Địa chỉ: {selectedOrder.diaChiGiao}</div>
                {selectedOrder.ghiChu && <div style={{ marginTop: '4px', color: '#71717a' }}>Ghi chú: {selectedOrder.ghiChu}</div>}
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e4e4e7', display: 'flex', gap: '16px' }}>
                  <span>Phương thức: <strong>{selectedOrder.phuongThuc === 'QR' ? 'Chuyển khoản VietQR' : 'COD (Thanh toán khi nhận)'}</strong></span>
                  <span>Thanh toán: <strong>{selectedOrder.trangThaiThanhToan === 'DA_THANH_TOAN' ? 'Đã thanh toán' : 'Chưa thanh toán'}</strong></span>
                </div>
              </div>

              {/* DANH SÁCH MẶT HÀNG */}
              <h4 style={{ fontWeight: 700, marginBottom: '12px', fontSize: '14px' }}>Sản phẩm trong đơn</h4>
              <div className="lsdh-items-group" style={{ marginBottom: '20px' }}>
                {selectedOrder.items?.map((it) => (
                  <div key={it.maChiTiet} className="lsdh-item-row" style={{ padding: '8px 0', borderBottom: '1px solid #f4f4f5' }}>
                    <img src={it.anhSanPham || '/img/sp1.png'} alt={it.tenSanPham} className="lsdh-item-thumb" />
                    <div className="lsdh-item-info">
                      <h4 className="lsdh-item-title">{it.tenSanPham}</h4>
                      <div className="lsdh-item-meta">
                        <span>Size: {it.kichThuoc}</span> · <span>Màu: {it.mauSac}</span> · <span>SL: {it.soLuong}</span>
                      </div>
                      {it.hasPrint && it.printInfo && (
                        <div className="lsdh-print-tag">
                          <Sparkles size={11} color="#10b981" />
                          <span>Mẫu in: {it.printInfo.tenMauIn} - Vị trí: {it.printInfo.tenViTri}</span>
                        </div>
                      )}
                    </div>
                    <div className="lsdh-item-price-qty">
                      <div className="lsdh-item-price">{formatCurrency(it.thanhTien)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* TỔNG KẾT CHI PHÍ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e4e4e7', paddingTop: '16px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a' }}>
                  <span>Tiền hàng:</span>
                  <span>{formatCurrency(selectedOrder.tienHang)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a' }}>
                  <span>Phí giao hàng:</span>
                  <span>{selectedOrder.phiGiaoHang === 0 ? 'Miễn phí' : formatCurrency(selectedOrder.phiGiaoHang)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginTop: '4px' }}>
                  <span>Tổng thanh toán:</span>
                  <span>{formatCurrency(selectedOrder.tongTien)}</span>
                </div>
              </div>

              {/* Nút hủy nếu đơn chờ xác nhận */}
              {selectedOrder.canCancel && (
                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                  <button
                    type="button"
                    className="lsdh-btn-cancel"
                    onClick={() => {
                      setCancelError('');
                      setCancelingOrder(selectedOrder);
                    }}
                  >
                    HỦY ĐƠN HÀNG NÀY
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL XÁC NHẬN HỦY ĐƠN HÀNG */}
        {cancelingOrder && (
          <div className="lsdh-modal-backdrop" onClick={() => !cancelLoading && setCancelingOrder(null)}>
            <div className="lsdh-modal-box" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ width: '48px', height: '48px', background: '#fee2e2', color: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <AlertTriangle size={24} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Xác nhận hủy đơn hàng?</h3>
                <p style={{ fontSize: '13px', color: '#71717a' }}>
                  Bạn có chắc chắn muốn hủy đơn hàng <strong>{cancelingOrder.maHienThi}</strong>?
                  Toàn bộ số lượng sản phẩm trong đơn sẽ được hoàn trả lại kho AURA.
                </p>
              </div>

              {cancelError && (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '4px', fontSize: '12px', marginBottom: '16px' }}>
                  {cancelError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="lsdh-btn-outline"
                  disabled={cancelLoading}
                  onClick={() => setCancelingOrder(null)}
                >
                  Giữ lại đơn
                </button>
                <button
                  type="button"
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: cancelLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  disabled={cancelLoading}
                  onClick={handleConfirmCancel}
                >
                  {cancelLoading && <Loader2 size={14} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />}
                  <span>Xác nhận hủy</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
