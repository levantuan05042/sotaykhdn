import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import HeaderBar from '../../components/view/HeaderBar';
import Sidebar from '../../components/view/Sidebar';
import styles from './MainLayout.module.css';
import EmailIcon from '../../assets/icon/email.svg';
import PhoneIcon from '../../assets/icon/phone.svg';
import { useViewScrollRestoration } from '../../hooks/useViewScrollRestoration';
import { ViewKeepAliveOutlet } from './ViewKeepAliveOutlet';

const MainLayout: React.FC = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useViewScrollRestoration(scrollRef);

  // Gắn class để /view co 80% trên desktop/laptop < 1600px (giống Ctrl -)
  useEffect(() => {
    document.documentElement.classList.add('view-app');
    return () => {
      document.documentElement.classList.remove('view-app');
    };
  }, []);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el?.closest) return false;
      return Boolean(el.closest('input, textarea, [contenteditable="true"]'));
    };

    const blockClipboard = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };

    const blockContextMenu = (e: MouseEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };

    const blockHotkeys = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a'].includes(key)) {
        e.preventDefault();
      }
    };

    const blockDrag = (e: DragEvent) => {
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener('copy', blockClipboard, true);
    document.addEventListener('cut', blockClipboard, true);
    document.addEventListener('contextmenu', blockContextMenu, true);
    document.addEventListener('keydown', blockHotkeys, true);
    document.addEventListener('dragstart', blockDrag, true);

    return () => {
      document.removeEventListener('copy', blockClipboard, true);
      document.removeEventListener('cut', blockClipboard, true);
      document.removeEventListener('contextmenu', blockContextMenu, true);
      document.removeEventListener('keydown', blockHotkeys, true);
      document.removeEventListener('dragstart', blockDrag, true);
    };
  }, []);
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
      <header className={styles['grid-header']}>
        <HeaderBar
          isMenuOpen={isSidebarOpen}
          onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
        />
      </header>

      <div className={styles['grid-container']}>
        {/* Sidebar quản lý trạng thái mở/đóng trực tiếp */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <div className={styles['grid-main-wrapper']} ref={scrollRef} data-view-scroll>
          <div className={styles['grid-scroll-inner']}>
            <main className={styles['grid-content']}>
              <div className={styles['page-body']}>
                <ViewKeepAliveOutlet />
              </div>
            </main>

            <footer className={styles['grid-footer']}>
              <div className={styles['footer-content']}>
                <div className={styles['footer-left']}>
                  © Bản quyền thuộc Agribank <br />
                  Phiên bản 1.1 cập nhật 08/09/2026
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
    </div>
  );
};

export default MainLayout;