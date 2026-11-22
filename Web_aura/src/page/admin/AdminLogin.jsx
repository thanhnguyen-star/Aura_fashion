import { useState } from 'react';
import {
  Search,
  ShoppingBag,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
  Check,
} from 'lucide-react';
import '../css/adminLogin.css';

const API_BASE = 'http://localhost:5000';

export default function AdminLogin({
  onLoginSuccess,
  onBackToStore,
  onOpenRegister,
  successMessage = '',
  soLuong = 0,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Trạng thái lỗi
  const [credentialError, setCredentialError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [inlineErrors, setInlineErrors] = useState({ email: '', password: '' });

  const validate = () => {
    const errors = { email: '', password: '' };
    let isValid = true;

    if (!email.trim()) {
      errors.email = 'Vui lòng nhập email';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email không hợp lệ';
      isValid = false;
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu';
      isValid = false;
    }

    setInlineErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCredentialError('');
    setServerError('');
    setIsLocked(false);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        if (res.status === 403 && data.message?.toLowerCase().includes('khóa')) {
          setIsLocked(true);
        } else if (res.status === 401) {
          setCredentialError(data.message || 'Email hoặc mật khẩu không đúng');
        } else {
          setServerError(data.message || 'Đăng nhập thất bại');
        }
        return;
      }

      localStorage.setItem('aura_admin_token', data.token);
      localStorage.setItem('aura_admin_user', JSON.stringify(data.admin));
      onLoginSuccess?.(data.admin, data.token);
    } catch {
      setServerError('Không thể kết nối máy chủ API. Vui lòng kiểm tra server.');
      setSubmitting(false);
    }
  };

  const handleGoStore = (e) => {
    e.preventDefault();
    onBackToStore?.();
  };

  const hasPasswordError = Boolean(inlineErrors.password || credentialError);

  return (
    <div className="aura-login-viewport">
      {/* 1. Header */}
      <header className="aura-header">
        <a href="/" className="aura-header-brand" onClick={handleGoStore}>
          AURA
        </a>
        <nav className="aura-header-nav">
          <a href="#nam" className="aura-nav-link" onClick={handleGoStore}>
            Nam
          </a>
          <a href="#nu" className="aura-nav-link" onClick={handleGoStore}>
            Nữ
          </a>
          <a href="#phu-kien" className="aura-nav-link" onClick={handleGoStore}>
            Phụ kiện
          </a>
        </nav>
        <div className="aura-header-actions">
          <button
            type="button"
            className="aura-header-icon"
            aria-label="Tìm kiếm"
            onClick={handleGoStore}
          >
            <Search size={18} />
          </button>
          <button
            type="button"
            className="aura-header-icon"
            aria-label="Giỏ hàng"
            onClick={handleGoStore}
          >
            <ShoppingBag size={18} />
            <span className="aura-badge-cart">
              {String(soLuong).padStart(2, '0')}
            </span>
          </button>
          <button
            type="button"
            className="aura-header-icon"
            aria-label="Tài khoản"
          >
            <User size={18} />
          </button>
        </div>
      </header>

      {/* 2. Khung đăng nhập trung tâm */}
      <div className="aura-login-container">
        <div className="aura-login-box">
          <div className="aura-brand-sub">AURA STUDIO</div>
          <h1 className="aura-box-title">Đăng nhập</h1>
          <p className="aura-box-subtitle">
            Đăng nhập để xem đơn hàng và mua sắm
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Thông báo khi vừa đăng ký xong */}
            {successMessage && (
              <div className="aura-alert aura-alert-success">
                <Check size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Biến thể 2: Tài khoản bị khóa */}
            {isLocked && (
              <div className="aura-alert aura-alert-error">
                <Lock size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div className="aura-alert-title">Tài khoản đã bị khóa</div>
                  Vui lòng liên hệ bộ phận hỗ trợ khách hàng{' '}
                  <strong>care@aura.vn</strong> để được mở khóa.
                </div>
              </div>
            )}

            {/* Lỗi kết nối / lỗi khác từ server */}
            {serverError && (
              <div className="aura-alert aura-alert-error">
                <AlertCircle
                  size={16}
                  style={{ flexShrink: 0, marginTop: '2px' }}
                />
                <span>{serverError}</span>
              </div>
            )}

            {/* Trường Email */}
            <div className="aura-form-field">
              <label className="aura-field-label" htmlFor="login-email">
                Email <span>*</span>
              </label>
              <div className="aura-input-container">
                <input
                  id="login-email"
                  type="email"
                  className={`aura-input ${
                    inlineErrors.email ? 'aura-input-error' : ''
                  }`}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (inlineErrors.email) {
                      setInlineErrors((p) => ({ ...p, email: '' }));
                    }
                    if (credentialError) setCredentialError('');
                  }}
                  disabled={submitting}
                />
              </div>
              {inlineErrors.email && (
                <div className="aura-error-inline">{inlineErrors.email}</div>
              )}
            </div>

            {/* Trường Mật khẩu */}
            <div className="aura-form-field">
              <div className="aura-label-row">
                <label className="aura-field-label" htmlFor="login-password">
                  Mật khẩu <span>*</span>
                </label>
                {/* Biến thể 1: Sai thông tin hiển thị ngay bên phải nhãn */}
                {credentialError && (
                  <span className="aura-error-right">{credentialError}</span>
                )}
              </div>

              <div className="aura-input-container">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`aura-input aura-input-with-icon ${
                    hasPasswordError ? 'aura-input-error' : ''
                  }`}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (inlineErrors.password) {
                      setInlineErrors((p) => ({ ...p, password: '' }));
                    }
                    if (credentialError) setCredentialError('');
                  }}
                  disabled={submitting}
                />
                {credentialError ? (
                  <span
                    className="aura-input-toggle aura-input-error-icon"
                    aria-hidden="true"
                  >
                    <AlertCircle size={16} />
                  </span>
                ) : (
                  <button
                    type="button"
                    className="aura-input-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label="Hiện hoặc ẩn mật khẩu"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
              {inlineErrors.password && (
                <div className="aura-error-inline">{inlineErrors.password}</div>
              )}
            </div>

            {/* Biến thể 3: Nút gửi kèm spinner đang tải */}
            <button
              type="submit"
              className="aura-btn-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="aura-spinner" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="aura-box-footer">
            Chưa có tài khoản?
            <a
              href="#register"
              className="aura-link"
              onClick={(e) => {
                e.preventDefault();
                onOpenRegister?.();
              }}
            >
              Đăng ký
            </a>
          </div>
        </div>
      </div>

      {/* 3. Footer thương hiệu */}
      <footer className="aura-footer">
        <div className="aura-footer-grid">
          <div>
            <h3 className="aura-footer-brand">AURA</h3>
            <p className="aura-footer-desc">
              AURA - Tối giản trong thiết kế, tinh tế trong từng đường may và
              chất liệu.
            </p>
            <div className="aura-footer-socials">
              <a href="#instagram" className="aura-social-link">
                INSTAGRAM
              </a>
              <a href="#facebook" className="aura-social-link">
                FACEBOOK
              </a>
              <a href="#pinterest" className="aura-social-link">
                PINTEREST
              </a>
            </div>
          </div>

          <div>
            <h4 className="aura-footer-title">DANH MỤC</h4>
            <ul className="aura-footer-list">
              <li>
                <a href="#nam" className="aura-footer-link" onClick={handleGoStore}>
                  Nam
                </a>
              </li>
              <li>
                <a href="#nu" className="aura-footer-link" onClick={handleGoStore}>
                  Nữ
                </a>
              </li>
              <li>
                <a
                  href="#phu-kien"
                  className="aura-footer-link"
                  onClick={handleGoStore}
                >
                  Phụ kiện
                </a>
              </li>
              <li>
                <a
                  href="#in-ao"
                  className="aura-footer-link"
                  onClick={handleGoStore}
                >
                  In ấn áo thun / Tote bag tùy chỉnh
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="aura-footer-title">CHĂM SÓC KHÁCH HÀNG</h4>
            <ul className="aura-footer-list">
              <li>
                <a href="#size" className="aura-footer-link">
                  Hướng dẫn chọn size
                </a>
              </li>
              <li>
                <a href="#doi-tra" className="aura-footer-link">
                  Chính sách đổi trả 30 ngày
                </a>
              </li>
              <li>
                <a href="#tra-cuu" className="aura-footer-link">
                  Tra cứu đơn hàng
                </a>
              </li>
              <li>
                <a href="#bao-mat" className="aura-footer-link">
                  Bảo mật thông tin
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="aura-footer-title">THÔNG TIN LIÊN HỆ</h4>
            <div className="aura-footer-contact">
              <span>148 Pasteur, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</span>
              <span>Hotline: 1900 6868</span>
              <span>Email: care@aura.vn</span>
              <span>Giờ hỗ trợ trực tuyến: 08:30 — 22:00 (Hàng ngày)</span>
            </div>
          </div>
        </div>

        <div className="aura-footer-bottom">
          <span>© 2025 AURA. Đã đăng ký bản quyền. Tối giản &amp; Tinh tế.</span>
          <div className="aura-footer-policy">
            <a href="#dieu-khoan" className="aura-footer-link">
              Điều khoản sử dụng
            </a>
            <a href="#quyen-rieng-tu" className="aura-footer-link">
              Chính sách quyền riêng tư
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}