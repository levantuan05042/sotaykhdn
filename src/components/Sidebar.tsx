import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

interface MenuItem {
  name: string;
  path?: string;
  children?: MenuItem[];
}

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [activeChain, setActiveChain] = useState<string[]>([]);

  const menuItems: MenuItem[] = [
    { name: 'Quản lý nhóm sản phẩm', path: '/product-groups' },
    { name: 'Quản lý danh mục sản phẩm', path: '/product-category' },
    { name: 'Quản lý nghiệp vụ', path: '/business-management' },
    {
      name: 'Quản lý sản phẩm',
      children: [
        {
          name: 'Danh sách sản phẩm',
          children: [
            { name: 'Danh sách chính thức', path: '/products/official' },
            { name: 'Danh sách sản phẩm đang xử lý', path: '/products/processing' },
            { name: 'Danh sách sản phẩm từ chối', path: '/products/rejected' },
          ],
        },
        { name: 'Danh sách yêu cầu', path: '/products/requests' },
      ],
    },
    { name: 'Quản lý tiêu chí', path: '/criteria-management' },
  ];

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
  }, [location.pathname]);

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
              {hasChildren && (
                <span className={`sidebar-caret ${isOpen ? 'open' : ''}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              )}
            </div>
          </button>

          {/* FIX LỖI TẠI ĐÂY: Thêm toán tử || [] và truyền currentChain vào hàm đệ quy */}
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