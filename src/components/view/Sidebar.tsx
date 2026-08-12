import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/view/apiConfig';
import styles from './Sidebar.module.css';

interface SidebarItemProps {
  to: string;
  name: string;
  end?: boolean;
  onNavigate?: () => void;
}

interface DynamicMenuProps {
  items: { id: string | number; name: string; path: string }[];
  loading: boolean;
  error: boolean;
  onNavigate?: () => void;
}

interface SidebarProps {
  onClose?: () => void;
}

// SỬA ĐƯỜNG DẪN: Thêm tiền tố /view
const STATIC_ITEMS = [
  { id: 'home', name: 'Trang chủ', path: '/view' },
  { id: 'saved', name: 'Sản phẩm đã lưu', path: '/view/saved-products' }, // Thêm /view
];

const SidebarItem: React.FC<SidebarItemProps> = ({ to, name, end = false, onNavigate }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onNavigate}
    className={({ isActive }) => `${styles['sidebar-btn']} ${isActive ? styles.active : ''}`}
  >
    <div className={styles['sidebar-content']}>
      <span className={styles['sidebar-text']}>{name}</span>
    </div>
  </NavLink>
);

const DynamicMenu: React.FC<DynamicMenuProps> = ({ items, loading, error, onNavigate }) => (
  <>
    <div className={styles['sidebar-divider']}>Danh mục</div>
    {loading ? (
      <div className={styles['sidebar-empty']}>Đang tải danh mục...</div>
    ) : error ? (
      <div className={styles['sidebar-empty']}>⚠ Không tải được nhóm.</div>
    ) : items.length === 0 ? (
      <div className={styles['sidebar-empty']}>Chưa có nhóm nào.</div>
    ) : (
      items.map((item) => (
        <SidebarItem key={item.id} to={item.path} name={item.name} onNavigate={onNavigate} />
      ))
    )}
  </>
);

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const [dynamicGroups, setDynamicGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const res = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
          params: { status: 'ACTIVE', active: true },
        });

        // SỬA ĐƯỜNG DẪN: Thêm tiền tố /view cho các nhóm động
        const formatted = (res.data || []).map((group: any) => ({
          id: group.id,
          name: group.name,
          path: `/view/groups/${group.id}`, // <-- Đã sửa tại đây
        }));

        setDynamicGroups(formatted);
      } catch (error) {
        console.error('Lỗi tải nhóm SP:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  return (
    <aside className={styles['sidebar-aside']}>
      <button
        type="button"
        className={styles['sidebar-close-btn']}
        onClick={onClose}
        aria-label="Đóng menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <nav className={styles['sidebar-nav']}>
        {STATIC_ITEMS.map((item) => (
          <SidebarItem 
            key={item.id} 
            to={item.path} 
            name={item.name} 
            // SỬA LOGIC END ROUTE: Thay vì '/' thì so sánh với '/view'
            end={item.path === '/view'} 
            onNavigate={onClose}
          />
        ))}

        <DynamicMenu 
          items={dynamicGroups} 
          loading={loading} 
          error={loadError} 
          onNavigate={onClose}
        />
      </nav>
    </aside>
  );
};

export default Sidebar;