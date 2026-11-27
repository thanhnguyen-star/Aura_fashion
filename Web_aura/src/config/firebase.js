import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// Cấu hình Firebase Authentication từ các biến môi trường Vite (.env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Khởi tạo ứng dụng Firebase (hoặc fallback cấu hình an toàn nếu chưa điền key)
const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_firebase_api_key_here');

const app = getApps().length > 0
  ? getApp()
  : initializeApp(
      isConfigured
        ? firebaseConfig
        : {
            apiKey: 'AIzaSyDemoSafeFallbackKeyForAuraFashionAuth',
            authDomain: 'aura-fashion-store.firebaseapp.com',
            projectId: 'aura-fashion-store',
            storageBucket: 'aura-fashion-store.firebasestorage.app',
            messagingSenderId: '100000000001',
            appId: '1:100000000001:web:auraauthsafe999',
          }
    );

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Kiểm tra xem Firebase đã được cấu hình với API Key thực tế chưa
 */
export function isFirebaseConfigured() {
  return isConfigured;
}

/**
 * Đăng nhập với tài khoản Google thông qua cửa sổ Popup của Firebase Auth
 */
export async function signInWithGooglePopup() {
  return await signInWithPopup(auth, googleProvider);
}

/**
 * Đăng xuất khỏi Firebase Auth
 */
export async function signOutFirebase() {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('[firebase > signOutFirebase]', err);
  }
}
