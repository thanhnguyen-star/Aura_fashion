const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Chỉ cần projectId để XÁC MINH ID Token (không cần file service account).
// Đặt FIREBASE_PROJECT_ID trong server/.env (cùng giá trị với VITE_FIREBASE_PROJECT_ID ở frontend).
if (!process.env.FIREBASE_PROJECT_ID) {
  console.warn('[firebaseAdmin] Thiếu FIREBASE_PROJECT_ID trong server/.env — đăng nhập Google sẽ bị từ chối.');
}

const firebaseApp = getApps()[0] || initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
});

module.exports = {
  auth: () => getAuth(firebaseApp),
};
