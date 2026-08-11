import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Sidebar.css';
import { type MenuItem, type UserRole, getMenuItemsByRole } from '../config/menuConfig';
import { CountBadge } from './ui/StatusBadge';
import { API_ENDPOINTS } from '../config/apiConfig';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('userRole') as UserRole) || 'ETN08';
  });
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [activeChain, setActiveChain] = useState<string[]>([]);
  const [requestCount, setRequestCount] = useState<number>(0);

  // Lấy số lượng yêu cầu từ backend khi khởi tạo
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const url = userRole === 'ETK08' 
          ? API_ENDPOINTS.APPROVER.PRODUCT_REQUESTS.LIST 
          : API_ENDPOINTS.PRODUCT.LIST2;
        const response = await axios.get(url);
        setRequestCount(response.data.length);
      } catch (err) {
        console.error("Error loading requests count for sidebar badge:", err);
      }
    };
    fetchCount();

    // Lắng nghe sự kiện khi danh sách yêu cầu thay đổi (thêm/xóa/lọc ở RequestListPage)
    const handleCountChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined) {
        setRequestCount(customEvent.detail);
      } else {
        fetchCount();
      }
    };
    window.addEventListener('requestCountChanged', handleCountChange);
    return () => {
      window.removeEventListener('requestCountChanged', handleCountChange);
    };
  }, [userRole]);

  // Lắng nghe sự kiện thay đổi vai trò người dùng từ HeaderBar
  useEffect(() => {
    const handleRoleChange = () => {
      const currentRole = (localStorage.getItem('userRole') as UserRole) || 'ETN08';
      setUserRole(currentRole);
    };
    window.addEventListener('userRoleChanged', handleRoleChange);
    return () => {
      window.removeEventListener('userRoleChanged', handleRoleChange);
    };
  }, []);
  const menuItems = getMenuItemsByRole(userRole);
  useEffect(() => {
    const findActiveChainAndExpand = (items: MenuItem[], currentChain: string[] = []): string[] | null => {
      for (const item of items) {
        const newChain = [...currentChain, item.name];
        if (item.path && location.pathname === item.path) {
          return newChain;
        }
        if (item.children) {
          const childChain = findActiveChainAndExpand(item.children, newChain);
          if (childChain) {
            setExpandedMenus((prev) => ({ ...prev, [item.name]: true }));
            return childChain;
          }
        }
      }
      return null;
    };
    const matchedChain = findActiveChainAndExpand(menuItems);
    if (matchedChain) {
      setActiveChain(matchedChain);
    }
  }, [location.pathname, userRole]);
  const handleItemClick = (item: MenuItem, currentChain: string[]) => {
    setActiveChain(currentChain);
    if (item.children) {
      setExpandedMenus((prev) => ({ ...prev, [item.name]: !prev[item.name] }));
    } else if (item.path) {
      navigate(item.path);
    }
  };
  // Level mặc định = 1, parentChain mặc định = []
  const renderMenu = (items: MenuItem[], level = 1, parentChain: string[] = []) => {
    return items.map((item, index) => {
      const currentChain = [...parentChain, item.name];
      const hasChildren = !!item.children;
      const isOpen = !!expandedMenus[item.name];
      const isActive = activeChain.includes(item.name);
      return (
        <div key={`${item.name}-${index}`} className={`sidebar-item-group level-${level}`}>
          <button
            onClick={() => handleItemClick(item, currentChain)}
            className={`sidebar-btn ${isActive ? 'active' : ''} ${hasChildren ? 'has-children' : ''}`}
          >
            <div className="sidebar-indicator" />
            <div className="sidebar-content">
              <span className="sidebar-text">{item.name}</span>
              {(['/request-list', '/approver/request-list'].includes(item.path || '') ? requestCount : item.count) !== undefined && (
                <CountBadge count={['/request-list', '/approver/request-list'].includes(item.path || '') ? requestCount : (item.count || 0)} />
              )}
              {hasChildren && (
                <span className={`sidebar-caret ${isOpen ? 'open' : ''}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              )}
            </div>
          </button>
          
          {hasChildren && isOpen && (
            <div className="sidebar-submenu">
              {renderMenu(item.children || [], level + 1, currentChain)}
            </div>
          )}
        </div>
      );
    });
  };
  return (
    <aside className="sidebar-aside">
      <nav className="sidebar-nav">
        {renderMenu(menuItems)}
      </nav>
    </aside>
  );
};
export default Sidebar;