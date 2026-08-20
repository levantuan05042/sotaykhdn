import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/view/apiConfig';
import styles from './Sidebar.module.css';

// --- BỘ ICON SVG MẪU ---
const Icons = {
  Home: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  ),
  Bookmark: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  ChevronDown: ({ isOpen }: { isOpen: boolean }) => (
    <svg 
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  ),
  DefaultProduct: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 8v8"></path>
      <path d="M8 12h8"></path>
    </svg>
  )
};

// --- INTERFACES ---
interface SidebarItemProps {
  to: string;
  name: string;
  icon?: React.ReactNode;
  end?: boolean;
  onNavigate?: () => void;
}

interface DynamicItem {
  id: string | number;
  name: string;
  path: string;
  superGroup: string;
}

interface DynamicMenuProps {
  items: DynamicItem[];
  loading: boolean;
  error: boolean;
  onNavigate?: () => void;
}

interface SidebarProps {
  onClose?: () => void;
}

// --- DATA CẤU HÌNH ---
const STATIC_ITEMS = [
  { id: 'home', name: 'Trang chủ', path: '/view', icon: <Icons.Home /> },
  { id: 'saved', name: 'Sản phẩm đã lưu', path: '/view/saved-products', icon: <Icons.Bookmark /> },
];

const GROUP_OPTIONS = [
  { label: 'Nhóm sản phẩm dịch vụ', value: 'SERVICE' },
  { label: 'Nhóm sản phẩm bảo hiểm', value: 'INSURANCE' },
  { label: 'Nhóm chương trình ưu đãi', value: 'PROGRAM' }
];

// --- COMPONENTS ---
const SidebarItem: React.FC<SidebarItemProps> = ({ to, name, icon, end = false, onNavigate }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onNavigate}
    className={({ isActive }) => `${styles['sidebar-btn']} ${isActive ? styles.active : ''}`}
  >
    <div className={styles['sidebar-content']}>
      {icon && <span className={styles['sidebar-icon']}>{icon}</span>}
      <span className={styles['sidebar-text']}>{name}</span>
    </div>
  </NavLink>
);

const DynamicMenu: React.FC<DynamicMenuProps> = ({ items, loading, error, onNavigate }) => {
  // State quản lý đóng/mở của từng nhóm (Mặc định mở tất cả)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    SERVICE: true,
    INSURANCE: true,
    PROGRAM: true
  });

  const toggleGroup = (groupValue: string) => {
    setOpenGroups(prev => ({ ...prev, [groupValue]: !prev[groupValue] }));
  };

  if (loading) return <div className={styles['sidebar-empty']}>Đang tải danh mục...</div>;
  if (error) return <div className={styles['sidebar-empty']}>⚠ Không tải được nhóm.</div>;
  if (items.length === 0) return <div className={styles['sidebar-empty']}>Chưa có nhóm nào.</div>;

  return (
    <>
      {GROUP_OPTIONS.map((groupOption) => {
        const groupItems = items.filter(item => item.superGroup === groupOption.value);
        if (groupItems.length === 0) return null;

        const isOpen = openGroups[groupOption.value];

        return (
          <div key={groupOption.value} className={styles['sidebar-group']}>
            {/* Header của Group: Click để thu gọn/mở rộng */}
            <div 
              className={styles['sidebar-divider']} 
              onClick={() => toggleGroup(groupOption.value)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <span>{groupOption.label}</span>
              <Icons.ChevronDown isOpen={isOpen} />
            </div>

            {/* Danh sách items (ẩn/hiện dựa theo state isOpen) */}
            {isOpen && (
              <div className={styles['sidebar-group-items']}>
                {groupItems.map((item) => (
                  <SidebarItem 
                    key={item.id} 
                    to={item.path} 
                    name={item.name} 
                    icon={<Icons.DefaultProduct />} /* Đặt icon mặc định cho nhóm động */
                    onNavigate={onNavigate} 
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const [dynamicGroups, setDynamicGroups] = useState<DynamicItem[]>([]);
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

        const formatted = (res.data || []).map((group: any) => ({
          id: group.id,
          name: group.name,
          path: `/view/groups/${group.id}`,
          superGroup: group.superGroup,
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
        {/* Render danh sách tĩnh */}
        {STATIC_ITEMS.map((item) => (
          <SidebarItem 
            key={item.id} 
            to={item.path} 
            name={item.name} 
            icon={item.icon}
            end={item.path === '/view'} 
            onNavigate={onClose}
          />
        ))}

        {/* Render danh sách động (có phân nhóm & thu gọn/mở rộng) */}
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