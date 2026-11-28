import { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  ArrowLeft,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { saveAuthSession } from '../../utils/api.js';
import { sendRegistrationOtp } from '../../utils/registrationOtp.js';
import './AuthModal.css';

function GoogleIcon() {
  return (
    <svg className="auth-google-icon" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login',
  sessionNotice = '',
}) {
  const { loginWithGoogle, setCurrentUser } = useAuth();
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
  const [infoMessage, setInfoMessage] = useState('');
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // Trạng thái xác thực OTP Gmail
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Dialog nhập email Google thủ công (fallback khi Firebase chưa cấu hình)
  const [googlePromptOpen, setGooglePromptOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Đếm ngược gửi lại mã OTP
  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  if (!isOpen) return null;

  const isGmail = formData.email.trim().toLowerCase().endsWith('@gmail.com');

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage('');
    if (isAccountLocked) setIsAccountLocked(false);
  };

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setFormData({
      hoTen: '',
      email: '',
      soDienThoai: '',
      password: '',
      confirmPassword: '',
    });
    setErrorMessage('');
    setInfoMessage('');
    setIsAccountLocked(false);
    setRegisterSuccess(false);
    setOtpStep(false);
    setOtpCode('');
    setGooglePromptOpen(false);
    setGoogleEmail('');
    setGoogleName('');
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (otpCountdown > 0 || loading) return;
    try {
      setLoading(true);
      setErrorMessage('');
      await sendRegistrationOtp(formData.email, formData.hoTen);
      setInfoMessage(`Mã OTP mới đã được gửi đến hộp thư ${formData.email.trim().toLowerCase()}.`);
      setOtpCountdown(60);
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi gửi lại mã OTP');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý gửi form Đăng nhập / Đăng ký
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setIsAccountLocked(false);

    // Trường hợp 1: Đăng nhập truyền thống
    if (mode === 'login') {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 403 || data.code === 'ACCOUNT_LOCKED') {
            setIsAccountLocked(true);
            setErrorMessage(
              data.message || 'Tài khoản đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ khách hàng care@aura.vn để được mở khóa.'
            );
            return;
          }
          setErrorMessage(data.message || 'Email hoặc mật khẩu không chính xác.');
          return;
        }

        if (data.token && data.user) {
          saveAuthSession(data.token, data.user);
          setCurrentUser?.(data.user);
          onSuccess?.(data.user);
          onClose();
        }
      } catch (err) {
        console.error('Lỗi đăng nhập:', err);
        setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Trường hợp 2: Đăng ký tài khoản
    if (!formData.hoTen.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (formData.password.length < 6) {
      setErrorMessage('Mật khẩu phải có độ dài tối thiểu 6 ký tự.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    // NẾU LÀ GMAIL VÀ CHƯA GỬI OTP -> Gửi OTP qua EmailJS
    if (isGmail && !otpStep) {
      try {
        setLoading(true);
        await sendRegistrationOtp(formData.email, formData.hoTen);
        setOtpStep(true);
        setOtpCountdown(60);
        setInfoMessage(`Mã xác thực OTP đã được gửi đến ${formData.email.trim().toLowerCase()}.`);
      } catch (err) {
        console.error('Lỗi gửi OTP:', err);
        setErrorMessage(err.message || 'Không thể gửi mã xác thực đến Gmail.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // NẾU LÀ GMAIL VÀ ĐANG Ở BƯỚC NHẬP OTP -> Kiểm tra mã OTP
    if (isGmail && otpStep) {
      if (!otpCode.trim() || otpCode.trim().length !== 6) {
        setErrorMessage('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.');
        return;
      }
    }

    // TIẾN HÀNH ĐĂNG KÝ (Kèm OTP nếu là Gmail)
    try {
      setLoading(true);
      const payload = {
        hoTen: formData.hoTen.trim(),
        email: formData.email.trim().toLowerCase(),
        soDienThoai: formData.soDienThoai.trim() || null,
        password: formData.password,
        ...(isGmail ? { otp: otpCode.trim() } : {}),
      };

      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Đăng ký tài khoản thất bại.');
        return;
      }

      setRegisterSuccess(true);
      if (data.token && data.user) {
        saveAuthSession(data.token, data.user);
        setCurrentUser?.(data.user);
        setTimeout(() => {
          onSuccess?.(data.user);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Lỗi đăng ký:', err);
      setErrorMessage('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập / Liên kết Google qua Firebase Authentication
  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setIsAccountLocked(false);
    setLoading(true);

    try {
      const res = await loginWithGoogle();

      if (res.success) {
        onSuccess?.(res.user);
        onClose();
        return;
      }

      if (res.isLocked) {
        setIsAccountLocked(true);
        setErrorMessage(res.message);
        return;
      }

      if (res.cancelled) {
        return;
      }

      // Firebase chưa cấu hình đúng → mở dialog nhập email Google thủ công
      if (res.needsManualFallback) {
        setGoogleEmail(formData.email.trim() || '');
        setGoogleName(formData.hoTen.trim() || '');
        setGooglePromptOpen(true);
        return;
      }

      if (res.message) {
        setErrorMessage(res.message);
      }
    } catch (err) {
      console.error('Lỗi Google Auth:', err);
      setErrorMessage('Không thể xác thực với tài khoản Google lúc này.');
    } finally {
      setLoading(false);
    }
  };

  // Đăng nhập Google bằng email thủ công (fallback)
  const handleExecuteGoogleLogin = async (e) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ email Google.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await fetch('http://localhost:5000/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: googleEmail.trim().toLowerCase(),
          name: googleName.trim() || 'Người dùng Google',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        if (res.status === 403 || data.code === 'ACCOUNT_LOCKED') {
          setIsAccountLocked(true);
          setErrorMessage(data.message || 'Tài khoản Google này đã bị khóa.');
          setGooglePromptOpen(false);
          return;
        }
        setErrorMessage(data.message || 'Đăng nhập bằng tài khoản Google thất bại.');
        return;
      }

      if (data.token && data.user) {
        saveAuthSession(data.token, data.user);
        setCurrentUser?.(data.user);
        onSuccess?.(data.user);
        onClose();
      }
    } catch (err) {
      console.error('Lỗi Google login:', err);
      setErrorMessage('Lỗi kết nối khi đăng nhập tài khoản Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-card">
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
          {/* Thông báo đăng ký thành công */}
          {registerSuccess && (
            <div className="auth-alert-success">
              <CheckCircle2 size={24} style={{ margin: '0 auto 8px', display: 'block', color: '#16a34a' }} />
              <strong>Đăng ký tài khoản thành công!</strong>
              <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
                Chào mừng bạn đến với Aura Studio. Hệ thống đang tự động đăng nhập...
              </p>
            </div>
          )}

          {/* Cảnh báo tài khoản bị khóa */}
          {isAccountLocked && (
            <div className="auth-alert-locked">
              <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Tài khoản đã bị tạm khóa</strong>
                <div style={{ marginTop: '3px' }}>{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Thông báo hết phiên đăng nhập / khởi động lại server */}
          {!isAccountLocked && !errorMessage && sessionNotice && (
            <div className="auth-alert-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{sessionNotice}</span>
            </div>
          )}

          {/* Lỗi thông thường */}
          {!isAccountLocked && errorMessage && (
            <div className="auth-alert-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Thông báo thông tin / OTP */}
          {infoMessage && (
            <div className="auth-gmail-notice" style={{ background: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* ===== NÚT ĐĂNG NHẬP BẰNG GOOGLE (Ở TRANG ĐĂNG NHẬP) ===== */}
          {mode === 'login' && (
            <>
              <button
                type="button"
                className="auth-google-btn"
                onClick={handleGoogleAuth}
                disabled={loading}
              >
                <GoogleIcon />
                <span>Đăng nhập với Google</span>
              </button>

              <div className="auth-divider">
                <span>HOẶC ĐĂNG NHẬP VỚI EMAIL</span>
              </div>
            </>
          )}

          {/* FORM XÁC THỰC */}
          <form onSubmit={handleSubmit} autoComplete="off">
            {/* BƯỚC 2 ĐĂNG KÝ GMAIL: NHẬP MÃ OTP */}
            {mode === 'register' && isGmail && otpStep ? (
              <div className="auth-otp-step-box">
                <h4 className="auth-otp-step-title">Xác Thực Hộp Thư Gmail</h4>
                <p className="auth-otp-step-desc">
                  Mã xác thực 6 chữ số đã được gửi đến <strong>{formData.email}</strong>. Vui lòng nhập mã để hoàn tất.
                </p>

                <div className="auth-form-group">
                  <label className="auth-label">MÃ XÁC THỰC OTP *</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoComplete="off"
                    placeholder="••••••"
                    className="auth-input auth-otp-input"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div className="auth-otp-resend-row">
                  <span>Chưa nhận được mã?</span>
                  <button
                    type="button"
                    className="auth-otp-resend-btn"
                    onClick={handleResendOtp}
                    disabled={otpCountdown > 0 || loading}
                  >
                    {otpCountdown > 0 ? (
                      `Gửi lại sau (${otpCountdown}s)`
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <RotateCw size={12} />
                        Gửi lại mã OTP
                      </span>
                    )}
                  </button>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    'Xác Nhận & Hoàn Tất Đăng Ký'
                  )}
                </button>

                <button
                  type="button"
                  className="auth-back-form-btn"
                  onClick={() => {
                    setOtpStep(false);
                    setErrorMessage('');
                    setInfoMessage('');
                  }}
                  disabled={loading}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ArrowLeft size={14} />
                    Quay lại chỉnh sửa thông tin
                  </span>
                </button>
              </div>
            ) : (
              /* FORM NHẬP THÔNG TIN TIÊU CHUẨN */
              <>
                {mode === 'register' && (
                  <>
                    <div className="auth-form-group">
                      <label className="auth-label">Họ và tên *</label>
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        placeholder="Nhập họ và tên"
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
                        autoComplete="off"
                        placeholder="Nhập số điện thoại"
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
                    autoComplete="off"
                    placeholder="Nhập địa chỉ email"
                    className={`auth-input ${errorMessage && !isAccountLocked ? 'has-error' : ''}`}
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={loading}
                  />
                </div>

                {/* THÔNG BÁO XÁC THỰC OTP NẾU ĐĂNG KÝ BẰNG GMAIL */}
                {mode === 'register' && isGmail && (
                  <div className="auth-gmail-notice">
                    <Mail size={16} style={{ flexShrink: 0 }} />
                    <span>Đăng ký bằng <strong>@gmail.com</strong> sẽ yêu cầu xác thực mã OTP bảo mật gửi qua hộp thư.</span>
                  </div>
                )}

                <div className="auth-form-group">
                  <label className="auth-label">Mật khẩu *</label>
                  <input
                    type="password"
                    required
                    autoComplete="off"
                    placeholder="Nhập mật khẩu"
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
                      autoComplete="off"
                      placeholder="Nhập lại mật khẩu"
                      className="auth-input"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      disabled={loading}
                    />
                  </div>
                )}

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : mode === 'login' ? (
                    'Đăng Nhập'
                  ) : isGmail ? (
                    'Tiếp Tục & Nhận Mã OTP'
                  ) : (
                    'Đăng Ký Tài Khoản'
                  )}
                </button>
              </>
            )}
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

        {/* DIALOG XÁC NHẬN TÀI KHOẢN GOOGLE (FALLBACK) */}
        {googlePromptOpen && (
          <div className="auth-google-prompt-overlay">
            <div className="auth-google-prompt-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <GoogleIcon />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Đăng nhập với Google</h3>
              </div>

              <p style={{ fontSize: 12.5, color: '#71717a', margin: '0 0 16px', lineHeight: 1.5 }}>
                Nhập tài khoản Google của bạn để đăng nhập nhanh chóng mà không cần mật khẩu.
              </p>

              <form onSubmit={handleExecuteGoogleLogin} autoComplete="off">
                <div className="auth-form-group" style={{ marginBottom: 12 }}>
                  <label className="auth-label">Email Google *</label>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    className="auth-input"
                    placeholder="Nhập email Google"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="auth-form-group" style={{ marginBottom: 16 }}>
                  <label className="auth-label">Họ tên hiển thị</label>
                  <input
                    type="text"
                    autoComplete="off"
                    className="auth-input"
                    placeholder="Nhập họ tên hiển thị"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="auth-back-form-btn"
                    style={{ marginTop: 0 }}
                    onClick={() => setGooglePromptOpen(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="auth-submit-btn"
                    style={{ marginTop: 0 }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 size={14} className="spin" /> : 'Xác Nhận'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
