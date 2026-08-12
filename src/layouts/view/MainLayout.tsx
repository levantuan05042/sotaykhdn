import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import HeaderBar from '../../components/view/HeaderBar';
import Sidebar from '../../components/view/Sidebar';
import { Toaster } from 'react-hot-toast';
import styles from './MainLayout.module.css'; 

const MainLayout: React.FC = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  return (
    // 2. CẬP NHẬT CÁCH GỌI CLASS TỪ OBJECT 'styles'
    <div className={styles['main-layout']}>
      <Toaster position="top-right" reverseOrder={false} />

      {/* Header */}
      <header className={styles['grid-header']}>
        <HeaderBar
          isMenuOpen={isSidebarOpen}
          onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
        />
      </header>

      {/* Grid Container */}
      <div className={styles['grid-container']}>
        {isSidebarOpen && (
          <div
            className={styles['sidebar-overlay']}
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Xử lý class động cho Sidebar */}
        <aside className={`${styles['grid-sidebar']} ${isSidebarOpen ? styles.open : ''}`}>
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </aside>

        <main className={styles['grid-content']}>
          <div className="page-body">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className={styles['grid-footer']}>
        <div className={styles['footer-content']}>
          <div>
            © Bản quyền thuộc Agribank <br />
            Phiên bản 1.0 cập nhật 04/2026
          </div>
          <div className={styles['footer-right']}>
            ✉ bannganhangso@agribank.com.vn <br />
            📞 0123456789 - Văn thư Ban NHS
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;