import React from 'react';
import { Outlet } from 'react-router-dom';
import HeaderBar from '../components/HeaderBar';
import Sidebar from '../components/Sidebar';
import './MainLayout.css';
import { Toaster } from 'react-hot-toast';

const MainLayout: React.FC = () => {
  return (
    <div className="main-layout">
      <Toaster position="top-right" reverseOrder={false} />
      
      {/* Header luôn cố định ở đỉnh */}
      <header className="grid-header">
        <HeaderBar />
      </header>

      {/* Container bọc phần Sidebar và Nội dung */}
      <div className="grid-container">
        
        {/* Sidebar dính (sticky) trên màn hình */}
        <aside className="grid-sidebar">
          <Sidebar />
        </aside>

        {/* Vùng bên phải tự do cao lên theo nội dung */}
        <main className="grid-content">
          <div className="page-body">
            <Outlet /> 
          </div>
        </main>
      </div>

      {/* Footer nằm ngoài cùng, tự động chiếm 100% chiều ngang */}
      <footer className="grid-footer">
        <div className="footer-content">
          <div>
            © Bản quyền thuộc Agribank <br />
            Phiên bản 1.0 cập nhật 04/2026
          </div>
          <div className="footer-right">
            ✉ bannganhangso@agribank.com.vn <br />
            📞 0123456789 - Văn thư Ban NHS
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;