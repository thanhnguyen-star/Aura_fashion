export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const AUTH_TOKEN_KEY = 'aura_admin_token';
export const AUTH_USER_KEY = 'aura_admin_user';
export const AUTH_UNAUTHORIZED_EVENT = 'aura:unauthorized';

export function getAuthToken() {
  try {
    return sessionStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getSavedUser() {
  try {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    const saved = sessionStorage.getItem(AUTH_USER_KEY);
    return token && saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(token, user) {
  if (token) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  if (user) {
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
}

export function clearAuthSession() {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

export function triggerUnauthorizedLogout(message = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.') {
  clearAuthSession();
  window.dispatchEvent(
    new CustomEvent(AUTH_UNAUTHORIZED_EVENT, {
      detail: { message },
    }),
  );
}

export function resolveImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('/uploads/')) return `${API_BASE}${path}`;
  return path;
}

export async function adminUpload(path, formData) {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    const msg = data.message || data.error || 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
    triggerUnauthorizedLogout(msg);
    const err = new Error(msg);
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(data.message || data.error || `Lỗi tải ảnh (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}

export async function adminFetch(path, options = {}) {
  const token = getAuthToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    const msg = data.message || data.error || 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
    triggerUnauthorizedLogout(msg);
    const err = new Error(msg);
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(data.message || data.error || `Lỗi máy chủ (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}
