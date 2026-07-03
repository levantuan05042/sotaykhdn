import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      // Chuyển hướng các request bắt đầu bằng /api sang server backend
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
      },
      // Chuyển hướng các request bắt đầu bằng /files sang server backend để lấy ảnh
      // Điều này giúp trình duyệt hiểu ảnh đang nằm ở cùng domain với frontend (tránh CORS)
      '/files': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
      }
    }
  } 
})