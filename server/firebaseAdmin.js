const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

if (!process.env.FIREBASE_PROJECT_ID) {
  console.warn('[firebaseAdmin] Thiếu FIREBASE_PROJECT_ID trong server/.env — đăng nhập Google sẽ bị từ chối.');
}

const firebaseApp = getApps()[0] || initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
});

module.exports = {
  auth: () => getAuth(firebaseApp),
};
