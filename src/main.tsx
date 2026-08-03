import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'; // Xóa đoạn .tsx đi
import './index.css'
import axios from 'axios';
import { AUTH_SERVICE_LOGIN_URL } from './config/apiConfig';

// Configure Axios globally to send HttpOnly cookies in cross-origin requests
axios.defaults.withCredentials = true;

// Intercept 401 responses to automatically redirect the browser to the SSO Login portal
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const redirectUri = window.location.href;
      window.location.href = `${AUTH_SERVICE_LOGIN_URL}?redirect_uri=${encodeURIComponent(redirectUri)}`;
      return new Promise(() => {}); // Return a pending promise to cancel further processing
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)