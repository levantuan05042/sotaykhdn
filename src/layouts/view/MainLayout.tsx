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

        {/* Sidebar Menu bên trái */}
        <aside className={`${styles['grid-sidebar']} ${isSidebarOpen ? styles.open : ''}`}>
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </aside>

        {/* Cột bên phải: Gồm Nội dung chính + Footer gom chung */}
        <div className={styles['grid-main-wrapper']}>
          <main className={styles['grid-content']}>
            <div className="page-body">
              <Outlet />
            </div>
          </main>

          {/* Footer nằm trọn bên phải */}
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
      </div>
    </div>
  );
};

export default MainLayout;