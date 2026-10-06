import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'; // Xóa đoạn .tsx đi
import './index.css'
import axios from 'axios';
import { AUTH_SERVICE_LOGIN_URL } from './config/apiConfig';

const isOfflineEnv =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' ||
    Boolean((window as any).__OFFLINE_DATA__) ||
    Boolean((window as any).__IS_OFFLINE__));

// Configure Axios globally to send HttpOnly cookies in cross-origin requests
axios.defaults.withCredentials = true;

// Intercept native fetch to send cookies and handle 401 redirects
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const newInit = { ...init };
  if (newInit.credentials === undefined) {
    newInit.credentials = 'include';
  }
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    const headers = new Headers(newInit.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);
    newInit.headers = headers;
  }

  let request: RequestInfo | URL = input;
  if (input instanceof Request) {
    request = new Request(input, newInit);
  }
  
  try {
    const response = await originalFetch(request, newInit);
    const requestUrl = typeof input === 'string' ? input : (input instanceof Request ? input.url : input?.toString?.() || '');
    if (!isOfflineEnv && (response.status === 401 || response.status === 403)) {
      if (requestUrl.includes('/auth/verify-password')) {
        return response;
      }
      const redirectUri = window.location.href;
      window.location.href = `${AUTH_SERVICE_LOGIN_URL}?redirect_uri=${encodeURIComponent(redirectUri)}`;
      return new Promise<Response>(() => {});
    }
    return response;
  } catch (error) {
    throw error;
  }
};

// Intercept 401 & 403 responses to automatically redirect the browser to the SSO Login portal
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!isOfflineEnv && error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (error.config?.url?.includes('/auth/verify-password')) {
        return Promise.reject(error);
      }
      const redirectUri = window.location.href;
      window.location.href = `${AUTH_SERVICE_LOGIN_URL}?redirect_uri=${encodeURIComponent(redirectUri)}`;
      return new Promise(() => {}); // Return a pending promise to cancel further processing
    }
    return Promise.reject(error);
  }
);

// Khởi chạy ứng dụng an toàn (chờ DOMContentLoaded nếu script nạp sớm trong <head>)
const mountApp = () => {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    console.error('Không tìm thấy phần tử root để gắn ứng dụng React');
    return;
  }
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
