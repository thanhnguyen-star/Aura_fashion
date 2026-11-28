
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithGooglePopup,
  signOutFirebase,
  isFirebaseConfigured,
} from '../config/firebase.js';
import {
  API_BASE,
  AUTH_UNAUTHORIZED_EVENT,
  clearAuthSession,
  getAuthToken,
  getSavedUser,
  saveAuthSession,
  triggerUnauthorizedLogout,
} from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(getSavedUser);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Tự động đăng xuất khi nhận sự kiện 401
  useEffect(() => {
    const handleUnauthorized = (e) => {
      signOutFirebase().catch(() => {});
      clearAuthSession();
      setCurrentUser(null);
      setAuthError(
        e.detail?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      );
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  // Kiểm tra tính hợp lệ của phiên đăng nhập khi tải trang
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let cancelled = false;

    fetch(`${API_BASE}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (cancelled) return;

        if (res.status === 401) {
          const data = await res.json().catch(() => ({}));
          triggerUnauthorizedLogout(
            data.message || 'Máy chủ vừa khởi động lại. Vui lòng đăng nhập lại từ đầu.'
          );
        }
      })
      .catch(() => {
        // Bỏ qua nếu tạm mất kết nối mạng lúc khởi động
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Đăng nhập bằng Email & Mật khẩu
   */
  const login = useCallback(async (email, password) => {
    setLoading(true);
    setAuthError('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const msg = data.message || 'Email hoặc mật khẩu không chính xác';
        setAuthError(msg);
        return { success: false, message: msg, code: data.code };
      }

      const userData = data.user;
      saveAuthSession(data.token, userData);
      setCurrentUser(userData);

      return { success: true, user: userData, token: data.token };
    } catch (err) {
      console.error('[AuthContext > login]', err);

      const msg = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
      setAuthError(msg);

      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Đăng nhập bằng Google với Firebase Authentication
   */
  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    setAuthError('');

    try {
      // 1. Kiểm tra cấu hình Firebase
      if (!isFirebaseConfigured()) {
        const msg = 'Đăng nhập Google chưa được cấu hình (thiếu Firebase API Key trong file .env).';
        setAuthError(msg);
        return { success: false, needsManualFallback: true, message: msg };
      }

      // 2. Mở cửa sổ đăng nhập Google
      const firebaseRes = await signInWithGooglePopup();
      const fbUser = firebaseRes.user;

      if (!fbUser || !fbUser.email) {
        throw new Error('Không nhận được thông tin email từ tài khoản Google.');
      }

      // 3. Đồng bộ tài khoản với Backend AURA
      const res = await fetch(`${API_BASE}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fbUser.email.toLowerCase(),
          name: fbUser.displayName || 'Khách hàng Google',
          avatar: fbUser.photoURL || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        if (res.status === 403 || data.code === 'ACCOUNT_LOCKED') {
          await signOutFirebase();

          const lockMsg = data.message || 'Tài khoản Google này liên kết với tài khoản đã bị khóa.';
          setAuthError(lockMsg);

          return { success: false, isLocked: true, message: lockMsg };
        }

        throw new Error(data.message || 'Đồng bộ tài khoản Google thất bại.');
      }

      // 4. Lưu thông tin đăng nhập
      const userPayload = {
        ...data.user,
        avatar: fbUser.photoURL || data.user.avatar || null,
      };

      saveAuthSession(data.token, userPayload);
      setCurrentUser(userPayload);

      return { success: true, user: userPayload, token: data.token };

    } catch (err) {
      console.warn('[AuthContext > loginWithGoogle]', err);

      // Người dùng đóng popup
      if (
        err.code === 'auth/popup-closed-by-user' ||
        err.code === 'auth/cancelled-popup-request'
      ) {
        return { success: false, cancelled: true };
      }

      // Firebase API Key chưa hợp lệ hoặc bị chặn origin
      if (
        err.code === 'auth/api-key-not-valid' ||
        err.code === 'auth/invalid-api-key' ||
        err.code === 'auth/configuration-not-found'
      ) {
        const msg = 'Firebase API Key không hợp lệ. Hãy kiểm tra lại cấu hình trong file .env.';
        setAuthError(msg);

        return { success: false, needsManualFallback: true, message: msg };
      }

      const msg = err.message || 'Lỗi khi đăng nhập với tài khoản Google.';
      setAuthError(msg);

      return { success: false, message: msg };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Đăng xuất khỏi hệ thống
   */
  const logout = useCallback(async () => {
    try {
      await signOutFirebase();
    } catch (err) {
      console.warn('[AuthContext > logout Firebase]', err);
    } finally {
      clearAuthSession();
      setCurrentUser(null);
      setAuthError('');
    }
  }, []);

  /**
   * Cập nhật thông tin người dùng
   */
  const updateUser = useCallback((updatedData) => {
    setCurrentUser((prev) => {
      const merged = { ...prev, ...updatedData };
      saveAuthSession(null, merged);
      return merged;
    });
  }, []);

  const value = {
    user: currentUser,
    currentUser,
    loading,
    authError,
    setAuthError,
    login,
    loginWithGoogle,
    logout,
    updateUser,
    setCurrentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}