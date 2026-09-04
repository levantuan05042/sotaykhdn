import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import HeaderBar from '../../components/view/HeaderBar';
import Sidebar from '../../components/view/Sidebar';
import { Toaster } from 'react-hot-toast';
import styles from './MainLayout.module.css';
import EmailIcon from '../../assets/icon/email.svg';
import PhoneIcon from '../../assets/icon/phone.svg';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Tự động đóng sidebar khi chuyển tuyến đường
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Ngăn cuộn trang và lắng nghe phím ESC để đóng Sidebar trên Mobile
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

      <header className={styles['grid-header']}>
        <HeaderBar
          isMenuOpen={isSidebarOpen}
          onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
        />
      </header>

      <div className={styles['grid-container']}>
        {/* Sidebar quản lý trạng thái mở/đóng trực tiếp */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className={styles['grid-main-wrapper']}>
          <main className={styles['grid-content']}>
            {/* Đã cập nhật class theo cú pháp CSS Module */}
            <div className={styles['page-body']}>
              <Outlet />
            </div>
          </main>

          <footer className={styles['grid-footer']}>
            <div className={styles['footer-content']}>
              <div className={styles['footer-left']}>
                © Bản quyền thuộc Agribank <br />
                Phiên bản 1.0 cập nhật 04/2026
              </div>
              <div className={styles['footer-right']}>
                <div className={styles['footer-contact-item']}>
                  <img src={EmailIcon} alt="Email" className={styles['footer-icon']} />
                  <span>bannganhangso@agribank.com.vn</span>
                </div>
                <div className={styles['footer-contact-item']}>
                  <img src={PhoneIcon} alt="Phone" className={styles['footer-icon']} />
                  <span>0123456789 - Văn thư Ban NHS</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;