import emailjs from '@emailjs/browser';

const IS_DEV_MODE = false;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function sendRegistrationOtp(email, name) {
  const normalizedEmail = email.trim().toLowerCase();
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!IS_DEV_MODE && (!serviceId || !templateId || !publicKey)) {
    throw new Error('Thiếu cấu hình EmailJS trong Web_aura/.env.');
  }

  if (IS_DEV_MODE && (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(window.location.hostname))) {
    throw new Error('IS_DEV_MODE chỉ được dùng trên localhost.');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalizedEmail }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success || !/^\d{6}$/.test(data.otp_code || '')) {
    throw new Error(data.message || 'Không thể tạo mã OTP. Vui lòng thử lại.');
  }

  if (IS_DEV_MODE) {
    console.log(`[AURA OTP DEV] ${normalizedEmail}: ${data.otp_code}`);
    return;
  }

  try {
    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: normalizedEmail,
        to_name: name.trim() || normalizedEmail,
        otp_code: data.otp_code,
      },
      { publicKey }
    );
  } catch {
    throw new Error('Không gửi được email OTP. Hãy kiểm tra cấu hình EmailJS rồi thử lại.');
  }
}

export async function verifyRegistrationOtp(email, otp) {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim() }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    const error = new Error(data.message || 'Không thể xác minh mã OTP.');
    error.code = data.code;
    throw error;
  }
}
