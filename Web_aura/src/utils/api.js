const API_BASE = 'http://localhost:5000';

export async function adminFetch(path, options = {}) {
  const token = localStorage.getItem('aura_admin_token');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || data.error || `Lỗi máy chủ (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return data;
}