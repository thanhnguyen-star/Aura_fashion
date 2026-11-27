import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  User,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { getAuthToken, saveAuthSession, triggerUnauthorizedLogout } from '../../utils/api';
import '../css/hoSoCaNhan.css';

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('vi-VN');
}

export default function HoSoCaNhan({
  currentUser,
  onBackToStore,
  onUpdateUser,
}) {
  const [profile, setProfile] = useState({
    maTaiKhoan: currentUser?.maTaiKhoan || '',
    hoTen: currentUser?.hoTen || '',
    email: currentUser?.email || '',
    soDienThoai: currentUser?.soDienThoai || '',
    vaiTro: currentUser?.vaiTro || 'KHACH_HANG',
    ngayTao: currentUser?.ngayTao || '',
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Form Đổi mật khẩu
  const [pwData, setPwData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [updatingPw, setUpdatingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  const fetchProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoadingProfile(false);
      return;
    }

    try {
      setLoadingProfile(true);
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        triggerUnauthorizedLogout(data.message);
        return;
      }
      if (res.ok && data.success && data.user) {
        setProfile(data.user);
      }
    } catch (err) {
      console.warn('Lỗi tải thông tin hồ sơ:', err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProfile();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchProfile]);

  // Cập nhật thông tin định danh
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });

    if (!profile.hoTen.trim()) {
      setProfileMsg({ type: 'error', text: 'Họ tên không được để trống.' });
      return;
    }

    try {
      setUpdatingProfile(true);
      const token = getAuthToken();
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hoTen: profile.hoTen.trim(),
          soDienThoai: profile.soDienThoai?.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        triggerUnauthorizedLogout(data.message);
        return;
      }
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể cập nhật hồ sơ');
      }

      setProfileMsg({ type: 'success', text: 'Thông tin cá nhân đã được lưu thành công!' });
      if (data.user) {
        setProfile(data.user);
        saveAuthSession(null, data.user);
        onUpdateUser?.(data.user);
      }

      setTimeout(() => setProfileMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Lỗi khi cập nhật hồ sơ' });
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Đổi mật khẩu
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });

    if (!pwData.currentPassword || !pwData.newPassword) {
      setPwMsg({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.' });
      return;
    }

    if (pwData.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
      return;
    }

    if (pwData.newPassword !== pwData.confirmPassword) {
      setPwMsg({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp.' });
      return;
    }

    try {
      setUpdatingPw(true);
      const token = getAuthToken();
      const res = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: pwData.currentPassword,
          newPassword: pwData.newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        triggerUnauthorizedLogout(data.message);
        return;
      }
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Đổi mật khẩu thất bại');
      }

      setPwMsg({ type: 'success', text: 'Mật khẩu đã được thay đổi thành công!' });
      setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message || 'Lỗi khi đổi mật khẩu' });
    } finally {
      setUpdatingPw(false);
    }
  };

  const initialLetter = (profile.hoTen || 'A').trim().charAt(0).toUpperCase();

  return (
    <div className="hscn-shell">
      <div className="hscn-container">
        {/* Navigation Bar */}
        <div className="hscn-nav-bar">
          <button type="button" className="hscn-back-btn" onClick={onBackToStore}>
            <ArrowLeft size={16} />
            <span>Quay lại trang mua sắm</span>
          </button>
        </div>

        {/* Profile Header Card */}
        <div className="hscn-profile-header">
          <div className="hscn-avatar-circle">{initialLetter}</div>

          <div className="hscn-profile-meta">
            <div className="hscn-name-row">
              <h1 className="hscn-user-name">{profile.hoTen || 'Thành viên AURA'}</h1>
              <span className="hscn-badge-active">
                <CheckCircle size={12} />
                <span>Hội viên chính thức</span>
              </span>
            </div>

            <div className="hscn-user-info-text">
              <span className="hscn-info-id">
                #CUST-{String(profile.maTaiKhoan || '1').padStart(4, '0')}
              </span>
              <span>·</span>
              <span>{profile.email}</span>
              {profile.ngayTao && (
                <>
                  <span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={13} /> Tham gia: {formatDate(profile.ngayTao)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid: 2 Cards */}
        <div className="hscn-grid">
          {/* Card 1: Thông tin cá nhân */}
          <section className="hscn-card">
            <div className="hscn-card-header">
              <User size={18} />
              <h2 className="hscn-card-title">Thông Tin Định Danh</h2>
            </div>

            {profileMsg.text && (
              <div className={profileMsg.type === 'success' ? 'hscn-alert-success' : 'hscn-alert-error'}>
                {profileMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              <div className="hscn-form-row">
                <div className="hscn-field-group">
                  <label className="hscn-label" htmlFor="hscn-name">
                    Họ và tên
                  </label>
                  <input
                    id="hscn-name"
                    type="text"
                    className="hscn-input"
                    value={profile.hoTen}
                    onChange={(e) => setProfile({ ...profile, hoTen: e.target.value })}
                    required
                  />
                </div>

                <div className="hscn-field-group">
                  <label className="hscn-label" htmlFor="hscn-phone">
                    Số điện thoại
                  </label>
                  <input
                    id="hscn-phone"
                    type="tel"
                    className="hscn-input"
                    placeholder="VD: 0918.420.899"
                    value={profile.soDienThoai || ''}
                    onChange={(e) => setProfile({ ...profile, soDienThoai: e.target.value })}
                  />
                </div>
              </div>

              <div className="hscn-form-row">
                <div className="hscn-field-group">
                  <label className="hscn-label" htmlFor="hscn-email">
                    Địa chỉ Email
                  </label>
                  <input
                    id="hscn-email"
                    type="email"
                    className="hscn-input"
                    value={profile.email}
                    disabled
                  />
                  <span className="hscn-field-hint">
                    Email định danh hội viên được bảo mật và không thể tự thay đổi.
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="hscn-submit-btn"
                disabled={updatingProfile || loadingProfile}
              >
                {updatingProfile && <Loader2 size={14} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />}
                <span>Lưu Thay Đổi</span>
              </button>
            </form>
          </section>

          {/* Card 2: Bảo mật & Đổi mật khẩu */}
          <section className="hscn-card">
            <div className="hscn-card-header">
              <ShieldCheck size={18} />
              <h2 className="hscn-card-title">Bảo Mật & Đổi Mật Khẩu</h2>
            </div>

            {pwMsg.text && (
              <div className={pwMsg.type === 'success' ? 'hscn-alert-success' : 'hscn-alert-error'}>
                {pwMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{pwMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="hscn-form-row">
                <div className="hscn-field-group">
                  <label className="hscn-label" htmlFor="hscn-current-pw">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    id="hscn-current-pw"
                    type="password"
                    className="hscn-input"
                    placeholder="••••••••"
                    value={pwData.currentPassword}
                    onChange={(e) => setPwData({ ...pwData, currentPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="hscn-form-row">
                <div className="hscn-field-group">
                  <label className="hscn-label" htmlFor="hscn-new-pw">
                    Mật khẩu mới
                  </label>
                  <input
                    id="hscn-new-pw"
                    type="password"
                    className="hscn-input"
                    placeholder="Tối thiểu 6 ký tự"
                    value={pwData.newPassword}
                    onChange={(e) => setPwData({ ...pwData, newPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="hscn-field-group">
                  <label className="hscn-label" htmlFor="hscn-confirm-pw">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    id="hscn-confirm-pw"
                    type="password"
                    className="hscn-input"
                    placeholder="Nhập lại mật khẩu mới"
                    value={pwData.confirmPassword}
                    onChange={(e) => setPwData({ ...pwData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="hscn-submit-btn"
                disabled={updatingPw}
              >
                {updatingPw && <Loader2 size={14} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} />}
                <span>Cập Nhật Mật Khẩu</span>
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
