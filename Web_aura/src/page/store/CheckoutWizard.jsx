import { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  QrCode,
  Truck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import '../css/checkoutWizard.css';

function formatCurrency(val) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
}

export default function CheckoutWizard({
  cartItems = [],
  onUpdateCart,
  onBackToStore,
  currentUser,
}) {
  const [step, setStep] = useState(1); // 1: Cart | 2: Shipping/Payment | 3: Complete
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null);

  // Form giao nhận
  const [formData, setFormData] = useState({
    tenNguoiNhan: currentUser?.hoTen || '',
    dienThoaiNhan: currentUser?.soDienThoai || '',
    diaChiGiao: '',
    ghiChu: '',
    phuongThuc: 'COD', // 'COD' | 'QR'
  });

  // Đồng hồ đếm ngược 15 phút cho VietQR
  const [countdown, setCountdown] = useState(15 * 60);

  useEffect(() => {
    let timer;
    if (step === 3 && completedOrder?.vietqr && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, completedOrder, countdown]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Tính toán chi phí
  const tienHang = cartItems.reduce(
    (sum, item) => sum + (item.gia || item.price || 0) * (item.soLuong || item.quantity || 1),
    0
  );
  const phiGiaoHang = tienHang >= 999000 || tienHang === 0 ? 0 : 30000;
  const tongThanhToan = tienHang + phiGiaoHang;

  // Cập nhật số lượng món
  const handleUpdateQty = (itemId, delta) => {
    const updated = cartItems
      .map((item) => {
        if (item.id === itemId) {
          const newQty = (item.soLuong || 1) + delta;
          return newQty > 0 ? { ...item, soLuong: newQty } : null;
        }
        return item;
      })
      .filter(Boolean);

    onUpdateCart?.(updated);
  };

  // Xóa món khỏi giỏ
  const handleDeleteItem = (itemId) => {
    const updated = cartItems.filter((item) => item.id !== itemId);
    onUpdateCart?.(updated);
  };

  // Gửi đơn hàng lên Backend
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setOrderError('');

    if (!formData.tenNguoiNhan.trim() || !formData.dienThoaiNhan.trim() || !formData.diaChiGiao.trim()) {
      setOrderError('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.');
      return;
    }

    if (cartItems.length === 0) {
      setOrderError('Giỏ hàng trống. Vui lòng thêm sản phẩm.');
      return;
    }

    try {
      setSubmitting(true);

      const token = localStorage.getItem('aura_admin_token');
      const payload = {
        tenNguoiNhan: formData.tenNguoiNhan,
        dienThoaiNhan: formData.dienThoaiNhan,
        diaChiGiao: formData.diaChiGiao,
        ghiChu: formData.ghiChu,
        phuongThuc: formData.phuongThuc,
        items: cartItems.map((item) => ({
          variantId: item.variantId || 2,
          soLuong: item.soLuong || item.quantity || 1,
          donGia: item.gia || item.price || 0,
          tenSanPham: item.ten || item.name || 'Áo thun AURA',
          sku: item.sku || 'SKU-AURA',
          kichThuoc: item.size || 'M',
          mauSac: item.color || 'Đen',
          hasPrint: Boolean(item.hasPrint),
          printTemplateId: item.printTemplateId || null,
          printLocationId: item.printLocationId || null,
        })),
      };

      const res = await fetch('http://localhost:5000/api/store/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể tạo đơn hàng');
      }

      // Xóa giỏ hàng sau khi đặt thành công
      onUpdateCart?.([]);
      setCompletedOrder(data.data);
      setStep(3);
    } catch (err) {
      console.error('Lỗi đặt hàng:', err);
      setOrderError(err.message || 'Đã có lỗi xảy ra trong quá trình đặt hàng');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cw-shell">
      <div className="cw-container">
        {/* STEPPER HEADER 3 BƯỚC */}
        <div className="cw-stepper">
          <div className={`cw-step-item ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>
            <span className="cw-step-num">{step > 1 ? '✓' : '1'}</span>
            <span>Giỏ Hàng</span>
          </div>
          <div className="cw-step-divider" />
          <div className={`cw-step-item ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>
            <span className="cw-step-num">{step > 2 ? '✓' : '2'}</span>
            <span>Giao Nhận & Thanh Toán</span>
          </div>
          <div className="cw-step-divider" />
          <div className={`cw-step-item ${step === 3 ? 'active' : ''}`}>
            <span className="cw-step-num">3</span>
            <span>Hoàn Tất Đơn Hàng</span>
          </div>
        </div>

        {/* ================= STEP 1: GIỎ HÀNG (SCREENS 10 & 11) ================= */}
        {step === 1 && (
          <div>
            {cartItems.length === 0 ? (
              <div className="cw-empty-state">
                <ShoppingBag size={48} color="#a1a1aa" style={{ margin: '0 auto 12px' }} />
                <h2 className="cw-empty-title">Giỏ hàng của bạn đang trống</h2>
                <p className="cw-empty-desc">
                  Hãy khám phá các mẫu áo phôi cotton compact cao cấp và trải nghiệm phòng thử in DTG độc quyền từ AURA.
                </p>
                <button
                  type="button"
                  className="cw-btn-submit"
                  style={{ maxWidth: '240px', margin: '0 auto' }}
                  onClick={onBackToStore}
                >
                  Khám Phá Sản Phẩm
                </button>
              </div>
            ) : (
              <div className="cw-cart-grid">
                {/* Danh Sách Món Trong Giỏ */}
                <div className="cw-cart-items-box">
                  {cartItems.map((item) => (
                    <div className="cw-cart-item" key={item.id}>
                      <img src={item.anh || '/img/sp1.png'} alt={item.ten} className="cw-item-img" />

                      <div className="cw-item-info">
                        <h3 className="cw-item-title">{item.ten}</h3>
                        <div className="cw-item-sub">
                          Size: <strong>{item.size || 'M'}</strong> · Màu: <strong>{item.color || 'Đen'}</strong>
                        </div>
                        {item.hasPrint && item.printTemplate && (
                          <div className="cw-print-badge">
                            <Sparkles size={11} color="#10b981" />
                            <span>Mẫu in: {item.printTemplate} ({item.printLocation || 'Mặt trước'})</span>
                          </div>
                        )}
                      </div>

                      <div className="cw-item-actions">
                        <div className="cw-item-qty">
                          <button
                            type="button"
                            className="cw-qty-btn"
                            onClick={() => handleUpdateQty(item.id, -1)}
                          >
                            -
                          </button>
                          <span className="cw-qty-val">{item.soLuong || 1}</span>
                          <button
                            type="button"
                            className="cw-qty-btn"
                            onClick={() => handleUpdateQty(item.id, 1)}
                          >
                            +
                          </button>
                        </div>

                        <div className="cw-item-price">
                          {formatCurrency((item.gia || item.price || 0) * (item.soLuong || 1))}
                        </div>

                        <button
                          type="button"
                          className="cw-btn-delete"
                          onClick={() => handleDeleteItem(item.id)}
                          aria-label="Xóa món"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tóm Tắt Đơn Hàng */}
                <div className="cw-summary-card">
                  <h3 className="cw-summary-title">Tóm Tắt Đơn Hàng</h3>
                  <div className="cw-summary-row">
                    <span>Tiền hàng ({cartItems.length} món)</span>
                    <strong>{formatCurrency(tienHang)}</strong>
                  </div>
                  <div className="cw-summary-row">
                    <span>Phí vận chuyển</span>
                    <span>{phiGiaoHang === 0 ? <strong style={{ color: '#15803d' }}>MIỄN PHÍ</strong> : formatCurrency(phiGiaoHang)}</span>
                  </div>
                  {phiGiaoHang === 0 && (
                    <div style={{ fontSize: '11.5px', color: '#15803d' }}>
                      ✓ Đã áp dụng ưu đãi miễn phí giao hàng cho đơn trên 999.000đ
                    </div>
                  )}

                  <div className="cw-summary-total">
                    <span>Tổng thanh toán</span>
                    <span className="cw-total-price">{formatCurrency(tongThanhToan)}</span>
                  </div>

                  <button
                    type="button"
                    className="cw-btn-submit"
                    onClick={() => setStep(2)}
                  >
                    <span>Tiếp Tục Đặt Hàng</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '12.5px', cursor: 'pointer', textAlign: 'center' }}
                    onClick={onBackToStore}
                  >
                    ← Tiếp tục mua sắm thêm
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: GIAO NHẬN & PHƯƠNG THỨC THANH TOÁN (SCREEN 12) ================= */}
        {step === 2 && (
          <form onSubmit={handlePlaceOrder} className="cw-cart-grid">
            <div className="cw-form-section">
              {orderError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{orderError}</span>
                </div>
              )}

              {/* Box 1: Thông tin giao hàng */}
              <div className="cw-form-box">
                <h3 className="cw-form-title">1. Thông Tin Nhận Hàng</h3>
                <div className="cw-field-row">
                  <div>
                    <label className="cw-field-label">Họ và tên người nhận *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      className="cw-input"
                      value={formData.tenNguoiNhan}
                      onChange={(e) => setFormData({ ...formData, tenNguoiNhan: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="cw-field-label">Số điện thoại liên hệ *</label>
                    <input
                      type="tel"
                      required
                      placeholder="0918 420 899"
                      className="cw-input"
                      value={formData.dienThoaiNhan}
                      onChange={(e) => setFormData({ ...formData, dienThoaiNhan: e.target.value })}
                    />
                  </div>
                </div>

                <div className="cw-field-group">
                  <label className="cw-field-label">Địa chỉ giao hàng chi tiết *</label>
                  <input
                    type="text"
                    required
                    placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/TP"
                    className="cw-input"
                    value={formData.diaChiGiao}
                    onChange={(e) => setFormData({ ...formData, diaChiGiao: e.target.value })}
                  />
                </div>

                <div className="cw-field-group" style={{ marginBottom: 0 }}>
                  <label className="cw-field-label">Ghi chú giao hàng (Tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến..."
                    className="cw-input"
                    value={formData.ghiChu}
                    onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                  />
                </div>
              </div>

              {/* Box 2: Chọn phương thức thanh toán */}
              <div className="cw-form-box">
                <h3 className="cw-form-title">2. Phương Thức Thanh Toán</h3>
                <div className="cw-payment-options">
                  <label
                    className={`cw-pay-card ${formData.phuongThuc === 'COD' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, phuongThuc: 'COD' })}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      className="cw-pay-radio"
                      checked={formData.phuongThuc === 'COD'}
                      onChange={() => {}}
                    />
                    <div className="cw-pay-meta">
                      <div className="cw-pay-name">
                        <Truck size={17} />
                        <span>Thanh toán khi nhận hàng (COD)</span>
                      </div>
                      <div className="cw-pay-desc">Thanh toán bằng tiền mặt trực tiếp cho shipper khi nhận bưu phẩm.</div>
                    </div>
                  </label>

                  <label
                    className={`cw-pay-card ${formData.phuongThuc === 'QR' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, phuongThuc: 'QR' })}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      className="cw-pay-radio"
                      checked={formData.phuongThuc === 'QR'}
                      onChange={() => {}}
                    />
                    <div className="cw-pay-meta">
                      <div className="cw-pay-name">
                        <QrCode size={17} />
                        <span>Chuyển khoản ngân hàng VietQR</span>
                        <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '3px' }}>
                          Khuyên dùng
                        </span>
                      </div>
                      <div className="cw-pay-desc">Hệ thống tự động sinh mã VietQR NAPAS chính xác số tiền và mã đơn.</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Cột Phải: Tóm tắt thanh toán */}
            <div className="cw-summary-card">
              <h3 className="cw-summary-title">Chi Tiết Thanh Toán</h3>
              <div className="cw-summary-row">
                <span>Tiền hàng</span>
                <span>{formatCurrency(tienHang)}</span>
              </div>
              <div className="cw-summary-row">
                <span>Phí giao hàng</span>
                <span>{phiGiaoHang === 0 ? 'MIỄN PHÍ' : formatCurrency(phiGiaoHang)}</span>
              </div>
              <div className="cw-summary-total">
                <span>Tổng cộng</span>
                <span className="cw-total-price">{formatCurrency(tongThanhToan)}</span>
              </div>

              <button
                type="submit"
                className="cw-btn-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Đang Tạo Đơn Hàng...</span>
                  </>
                ) : (
                  <>
                    <span>ĐẶT HÀNG NGAY</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '12.5px', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => setStep(1)}
              >
                ← Quay lại kiểm tra giỏ hàng
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: HOÀN TẤT ĐƠN HÀNG (SCREENS 13 & 14) ================= */}
        {step === 3 && completedOrder && (
          <div className="cw-complete-box">
            <div className="cw-success-icon">
              <CheckCircle2 size={32} />
            </div>

            <h2 className="cw-complete-title">Đặt Hàng Thành Công!</h2>
            <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: '#71717a' }}>
              Cảm ơn bạn đã lựa chọn Aura Fashion. Đơn hàng của bạn đã được tiếp nhận vào hệ thống sản xuất.
            </p>

            <span className="cw-order-code">MÃ ĐƠN: {completedOrder.maHienThi}</span>

            {/* SCREEN 13 FIGMA: THANH TOÁN VIETQR */}
            {completedOrder.phuongThuc === 'QR' && completedOrder.vietqr && (
              <div className="cw-qr-card">
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px', color: '#09090b' }}>
                  Quét Mã VietQR Bằng App Ngân Hàng Để Thanh Toán
                </div>

                <img
                  src={completedOrder.vietqr.qrImageUrl}
                  alt="Mã VietQR"
                  className="cw-qr-image"
                />

                <div className="cw-qr-details">
                  <div className="cw-qr-row">
                    <span className="cw-qr-label">Ngân hàng:</span>
                    <span className="cw-qr-val">{completedOrder.vietqr.bankName}</span>
                  </div>
                  <div className="cw-qr-row">
                    <span className="cw-qr-label">Số tài khoản:</span>
                    <span className="cw-qr-val">{completedOrder.vietqr.accountNo}</span>
                  </div>
                  <div className="cw-qr-row">
                    <span className="cw-qr-label">Chủ tài khoản:</span>
                    <span className="cw-qr-val">{completedOrder.vietqr.accountName}</span>
                  </div>
                  <div className="cw-qr-row">
                    <span className="cw-qr-label">Số tiền:</span>
                    <span className="cw-qr-val" style={{ color: '#15803d' }}>
                      {formatCurrency(completedOrder.vietqr.amount)}
                    </span>
                  </div>
                  <div className="cw-qr-row">
                    <span className="cw-qr-label">Nội dung:</span>
                    <span className="cw-qr-val" style={{ color: '#09090b', background: '#e4e4e7', padding: '1px 5px', borderRadius: '3px' }}>
                      {completedOrder.vietqr.description}
                    </span>
                  </div>
                </div>

                <div className="cw-timer-badge">
                  <Clock size={14} />
                  <span>Mã QR có hiệu lực trong: {formatTimer(countdown)}</span>
                </div>
              </div>
            )}

            {/* SCREEN 14 FIGMA: XÁC NHẬN COD */}
            {completedOrder.phuongThuc === 'COD' && (
              <div style={{ background: '#f4f4f5', borderRadius: '6px', padding: '16px', margin: '20px 0', textAlign: 'left', fontSize: '13px' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>Thông Tin Giao Nhận COD:</div>
                <div>Người nhận: <strong>{completedOrder.tenNguoiNhan}</strong> ({completedOrder.dienThoaiNhan})</div>
                <div>Địa chỉ: {completedOrder.diaChiGiao}</div>
                <div>Số tiền cần thanh toán khi nhận: <strong>{formatCurrency(completedOrder.tongThanhToan)}</strong></div>
                <div style={{ color: '#15803d', marginTop: '6px', fontWeight: 600 }}>Dự kiến giao hàng trong 2 - 3 ngày làm việc.</div>
              </div>
            )}

            <button
              type="button"
              className="cw-btn-submit"
              style={{ maxWidth: '280px', margin: '0 auto' }}
              onClick={onBackToStore}
            >
              Tiếp Tục Mua Sắm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
