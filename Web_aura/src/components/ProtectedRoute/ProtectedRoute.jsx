import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import './ProtectedRoute.css';

/**
 * Component bảo vệ các trang yêu cầu đăng nhập (Checkout, Profile, Orders, v.v.)
 */
export default function ProtectedRoute({
  currentUser,
  children,
  onOpenLogin,
  onBackToStore,
  title = 'Yêu Cầu Đăng Nhập',
  message = 'Vui lòng đăng nhập hoặc liên kết tài khoản Google để tiếp tục truy cập tính năng này.',
}) {
  if (currentUser) {
    return children;
  }

  return (
    <div className="protected-route-container">
      <div className="protected-route-card">
        <div className="protected-route-icon-box">
          <ShieldAlert size={36} className="protected-route-icon" />
        </div>

        <span className="protected-route-badge">BẢO MẬT TÀI KHOẢN</span>
        <h2 className="protected-route-title">{title}</h2>
        <p className="protected-route-message">{message}</p>

        <div className="protected-route-actions">
          <button
            type="button"
            className="protected-route-btn-login"
            onClick={onOpenLogin}
          >
            <LogIn size={18} />
            <span>Đăng Nhập Ngay</span>
          </button>

          <button
            type="button"
            className="protected-route-btn-back"
            onClick={onBackToStore}
          >
            <ArrowLeft size={18} />
            <span>Quay Lại Mua Sắm</span>
          </button>
        </div>
      </div>
    </div>
  );
}
