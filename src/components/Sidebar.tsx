import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Sidebar.css';
import { type MenuItem, type UserRole, getMenuItemsByRole } from '../config/menuConfig';
import { CountBadge } from './ui/StatusBadge';
import { API_ENDPOINTS } from '../config/apiConfig';

// Map mỗi menu path trong module phê duyệt tới endpoint đếm bản ghi "Chờ xử lý".
const APPROVER_PENDING_ENDPOINTS: Record<string, string> = {
  '/approver/product-groups': API_ENDPOINTS.APPROVER.PRODUCT_GROUPS.LIST,
  '/approver/product-category': API_ENDPOINTS.APPROVER.PRODUCT_CATEGORY.LIST,
  '/approver/business': API_ENDPOINTS.APPROVER.PRODUCT_BUSINESS.LIST,
  '/approver/products/single': API_ENDPOINTS.APPROVER.PRODUCT.SINGLE_FOR_APPROVAL,
  '/approver/request-list': API_ENDPOINTS.APPROVER.PRODUCT_REQUESTS.LIST,
  '/approver/criteria': API_ENDPOINTS.APPROVER.PRODUCT_CRITERIA.LIST,
};

const countPending = (data: any): number => {
  if (!Array.isArray(data)) return 0;
  return data.filter((it) => it?.status === 'PENDING_APPROVAL').length;
};

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('userRole') as UserRole) || 'ETN08';
  });
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [activeChain, setActiveChain] = useState<string[]>([]);
  const [requestCount, setRequestCount] = useState<number>(0);
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Tải số lượng yêu cầu cho module quản lý nội dung (giữ nguyên hành vi cũ)
  const fetchEditorRequestCount = useCallback(async () => {
    if (userRole !== 'ETN08') return;
    try {
      const url = API_ENDPOINTS.PRODUCT.LIST2;
      const response = await axios.get(url);
      setRequestCount(response.data.length);
    } catch (err) {
      console.error('Error loading editor request count:', err);
    }
  }, [userRole]);

  // Tải số lượng "Chờ xử lý" cho từng menu trong module phê duyệt
  const fetchApproverPendingCounts = useCallback(async () => {
    if (userRole !== 'ETK08') return;
    const entries = Object.entries(APPROVER_PENDING_ENDPOINTS);
    const results = await Promise.all(
      entries.map(async ([path, url]) => {
        try {
          const res = await axios.get(url);
          return [path, countPending(res.data)] as const;
        } catch (err) {
          console.error(`Error loading pending count for ${path}:`, err);
          return [path, 0] as const;
        }
      }),
    );
    setPendingCounts(Object.fromEntries(results));
  }, [userRole]);

  useEffect(() => {
    fetchEditorRequestCount();
    fetchApproverPendingCounts();
  }, [fetchEditorRequestCount, fetchApproverPendingCounts]);

  // Lắng nghe sự kiện cập nhật số lượng (tương thích ngược với luồng cũ)
  useEffect(() => {
    const handleRequestCountChanged = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail !== undefined) {
        setRequestCount(customEvent.detail);
      } else {
        fetchEditorRequestCount();
      }
    };
    // Sự kiện mới: bất kỳ trang approver nào thay đổi trạng thái đều phát ra để sidebar refetch
    const handleApproverStatusChanged = () => {
      fetchApproverPendingCounts();
    };
    window.addEventListener('requestCountChanged', handleRequestCountChanged);
    window.addEventListener('approverStatusChanged', handleApproverStatusChanged);
    return () => {
      window.removeEventListener('requestCountChanged', handleRequestCountChanged);
      window.removeEventListener('approverStatusChanged', handleApproverStatusChanged);
    };
  }, [fetchEditorRequestCount, fetchApproverPendingCounts]);

  // Lắng nghe thay đổi vai trò người dùng từ HeaderBar
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
  }, [location.pathname, userRole, menuItems]);

  const handleItemClick = (item: MenuItem, currentChain: string[]) => {
    setActiveChain(currentChain);
    if (item.children) {
      setExpandedMenus((prev) => ({ ...prev, [item.name]: !prev[item.name] }));
    } else if (item.path) {
      navigate(item.path);
    }
  };

  // Trả về count cho một path cụ thể trong module phê duyệt
  const getApproverCount = (path?: string): number | undefined => {
    if (!path || !(path in APPROVER_PENDING_ENDPOINTS)) return undefined;
    return pendingCounts[path] ?? 0;
  };

  // Badge chỉ hiện khi người dùng đang hover HOẶC menu đang active
  const isBadgeVisible = (path?: string): boolean => {
    if (!path) return false;
    if (activeChain.some((name) => false) === false) {
      // placeholder để tránh unused warning
    }
    return location.pathname === path || hoveredPath === path;
  };

  const renderMenu = (items: MenuItem[], level = 1, parentChain: string[] = []) => {
    return items.map((item, index) => {
      const currentChain = [...parentChain, item.name];
      const hasChildren = !!item.children;
      const isOpen = !!expandedMenus[item.name];
      const isActive = activeChain.includes(item.name);

      // Xác định count hiển thị cho menu này
      let count: number | undefined;
      if (item.path === '/request-list') {
        count = requestCount;
      } else if (item.path === '/approver/request-list') {
        count = getApproverCount('/approver/request-list');
      } else if (userRole === 'ETK08') {
        count = getApproverCount(item.path);
      } else {
        count = item.count;
      }

      const showBadge = count !== undefined && count > 0 && isBadgeVisible(item.path);

      return (
        <div key={`${item.name}-${index}`} className={`sidebar-item-group level-${level}`}>
          <button
            onClick={() => handleItemClick(item, currentChain)}
            onMouseEnter={() => setHoveredPath(item.path || null)}
            onMouseLeave={() => setHoveredPath((prev) => (prev === item.path ? null : prev))}
            className={`sidebar-btn ${isActive ? 'active' : ''} ${hasChildren ? 'has-children' : ''}`}
          >
            <div className="sidebar-indicator" />
            <div className="sidebar-content">
              <span className="sidebar-text">{item.name}</span>
              {showBadge && <CountBadge count={count!} />}
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
