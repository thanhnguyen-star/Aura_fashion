import { useState } from 'react';
import { X, ShieldAlert, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [formData, setFormData] = useState({
    hoTen: '',
    email: '',
    soDienThoai: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Xóa lỗi khi người dùng gõ lại
    if (errorMessage) setErrorMessage('');
    if (isAccountLocked) setIsAccountLocked(false);
  };

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setErrorMessage('');
    setIsAccountLocked(false);
    setRegisterSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsAccountLocked(false);

    if (mode === 'register') {
      if (!formData.hoTen.trim()) {
        setErrorMessage('Vui lòng nhập họ và tên của bạn');
        return;
      }
      if (formData.password.length < 6) {
        setErrorMessage('Mật khẩu phải có độ dài tối thiểu 6 ký tự');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setErrorMessage('Mật khẩu xác nhận không khớp');
        return;
      }
    }

    try {
      setLoading(true);

      const endpoint = mode === 'login' ? 'http://localhost:5000/api/auth/login' : 'http://localhost:5000/api/auth/register';
      const bodyPayload =
        mode === 'login'
          ? { email: formData.email, password: formData.password }
          : {
              hoTen: formData.hoTen,
              email: formData.email,
              soDienThoai: formData.soDienThoai,
              password: formData.password,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Biến thể 2 (Screen 4 Figma): Tài khoản bị khóa
        if (res.status === 403 || data.code === 'ACCOUNT_LOCKED') {
          setIsAccountLocked(true);
          setErrorMessage(
            data.message || 'Tài khoản đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ khách hàng care@aura.vn để được mở khóa.'
          );
          return;
        }

        // Biến thể 1 (Screen 4 Figma): Sai thông tin đăng nhập hoặc lỗi khác
        setErrorMessage(data.message || 'Đã có lỗi xảy ra. Vui lòng kiểm tra lại thông tin.');
        return;
      }

      // Xử lý thành công
      if (mode === 'register') {
        // Biến thể 4 (Screen 6 Figma): Đăng ký thành công
        setRegisterSuccess(true);
        if (data.token && data.user) {
          localStorage.setItem('aura_admin_token', data.token);
          localStorage.setItem('aura_admin_user', JSON.stringify(data.user));
          setTimeout(() => {
            onSuccess?.(data.user);
            onClose();
          }, 1500);
        }
      } else {
        // Đăng nhập thành công
        if (data.token && data.user) {
          localStorage.setItem('aura_admin_token', data.token);
          localStorage.setItem('aura_admin_user', JSON.stringify(data.user));
          onSuccess?.(data.user);
          onClose();
        }
      }
    } catch (err) {
      console.error('Lỗi xác thực AuthModal:', err);
      setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Đóng">
          <X size={18} />
        </button>

        <div className="auth-modal-header">
          <h2 className="auth-brand-logo">A U R A</h2>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Đăng nhập để theo dõi đơn hàng và cá nhân hóa thiết kế in'
              : 'Tạo tài khoản hội viên AURA Fashion trải nghiệm dịch vụ in DTG'}
          </p>
        </div>

        {/* Tabs Chuyển Đổi */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('login')}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => handleSwitchMode('register')}
          >
            Đăng ký
          </button>
        </div>

        <div className="auth-modal-body">
          {/* Biến thể 4 (Screen 6 Figma): Đăng ký thành công */}
          {registerSuccess && (
            <div className="auth-alert-success">
              <CheckCircle2 size={24} style={{ margin: '0 auto 8px', display: 'block', color: '#16a34a' }} />
              <strong>Đăng ký tài khoản thành công!</strong>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                Chào mừng bạn đến với Aura Studio. Hệ thống đang tự động đăng nhập...
              </p>
            </div>
          )}

          {/* Biến thể 2 (Screen 4 Figma): Tài khoản bị khóa (Banner đỏ nguy hiểm) */}
          {isAccountLocked && (
            <div className="auth-alert-locked">
              <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Tài khoản đã bị tạm khóa</strong>
                <div style={{ marginTop: '3px' }}>{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Biến thể 1 (Screen 4 Figma): Lỗi thông tin đăng nhập */}
          {!isAccountLocked && errorMessage && (
            <div className="auth-alert-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <div className="auth-form-group">
                  <label className="auth-label">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    className="auth-input"
                    value={formData.hoTen}
                    onChange={(e) => handleInputChange('hoTen', e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="auth-form-group">
                  <label className="auth-label">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0912 345 678"
                    className="auth-input"
                    value={formData.soDienThoai}
                    onChange={(e) => handleInputChange('soDienThoai', e.target.value)}
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div className="auth-form-group">
              <label className="auth-label">Địa chỉ Email *</label>
              <input
                type="email"
                required
                placeholder="your.email@example.com"
                className={`auth-input ${errorMessage && !isAccountLocked ? 'has-error' : ''}`}
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="auth-form-group">
              <label className="auth-label">Mật khẩu *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className={`auth-input ${errorMessage && !isAccountLocked ? 'has-error' : ''}`}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={loading}
              />
            </div>

            {mode === 'register' && (
              <div className="auth-form-group">
                <label className="auth-label">Xác nhận mật khẩu *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="auth-input"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            {/* Biến thể 3 (Screen 4 Figma): Loading button state */}
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : mode === 'login' ? (
                'Đăng Nhập'
              ) : (
                'Đăng Ký Tài Khoản'
              )}
            </button>
          </form>

          <div className="auth-footer">
            {mode === 'login' ? (
              <p>
                Chưa có tài khoản?{' '}
                <button type="button" className="auth-switch-link" onClick={() => handleSwitchMode('register')}>
                  Đăng ký ngay
                </button>
              </p>
            ) : (
              <p>
                Đã có tài khoản?{' '}
                <button type="button" className="auth-switch-link" onClick={() => handleSwitchMode('login')}>
                  Đăng nhập tại đây
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
