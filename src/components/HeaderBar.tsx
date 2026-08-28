import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logoAgribank from '../assets/logo-agribank.png';
import './HeaderBar.css';
import { type UserRole } from '../config/menuConfig';
import { AUTH_SERVICE_LOGOUT_URL, API_ENDPOINTS } from '../config/apiConfig';

const ROLE_LABELS: Record<UserRole, string> = {
  ESA08: 'Ban Ngân hàng số',
  ECV08: 'Cán bộ tra cứu',
  ETN08: 'Quản lý nội dung',
  ETK08: 'Kiểm duyệt nội dung',
  VIEWER: 'Tra cứu sản phẩm',
};

export interface NotificationItem {
  groupId: string;
  labelCode?: string;
  labelTitle: string;
  valueCode?: string;
  valueContent: string;
  fromUser?: string;
  toUser?: string;
  notificationTime?: string;
  displayTime: string;
  isRead: boolean;
  objectType?: string;
  objectTypeLabel: string;
  objectCode?: string;
  url: string;
  actionType?: string;
  actionLabel: string;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    groupId: 'mock-1',
    labelTitle: 'Sản phẩm mới cần được Phê duyệt',
    displayTime: '12/05/2026',
    valueContent: 'Cán bộ quản lý Nguyễn Văn A đã tạo mới sản phẩm Tiết kiệm linh hoạt 6 tháng và gửi yêu cầu Phê duyệt.',
    actionLabel: 'Tạo mới',
    actionType: 'CREATE',
    objectTypeLabel: 'Danh mục',
    isRead: false,
    url: '/approver/products/single/p-1',
  },
  {
    groupId: 'mock-2',
    labelTitle: 'Sản phẩm mới cần được Phê duyệt',
    displayTime: '12/05/2026',
    valueContent: 'Cán bộ quản lý Nguyễn Văn A đã tạo mới sản phẩm Tiết kiệm linh hoạt 6 tháng và gửi yêu cầu Phê duyệt.',
    actionLabel: 'Tạo mới',
    actionType: 'CREATE',
    objectTypeLabel: 'Danh mục',
    isRead: false,
    url: '/approver/products/single/p-2',
  },
  {
    groupId: 'mock-3',
    labelTitle: 'Sản phẩm mới cần được Phê duyệt',
    displayTime: '12/05/2026',
    valueContent: 'Cán bộ quản lý Nguyễn Văn A đã tạo mới sản phẩm Tiết kiệm linh hoạt 6 tháng và gửi yêu cầu Phê duyệt.',
    actionLabel: 'Tạo mới',
    actionType: 'CREATE',
    objectTypeLabel: 'Danh mục',
    isRead: false,
    url: '/approver/products/single/p-3',
  },
  {
    groupId: 'mock-4',
    labelTitle: 'Sản phẩm mới cần được Phê duyệt',
    displayTime: '12/05/2026',
    valueContent: 'Cán bộ quản lý Nguyễn Văn A đã tạo mới sản phẩm Tiết kiệm linh hoạt 6 tháng và gửi yêu cầu Phê duyệt.',
    actionLabel: 'Tạo mới',
    actionType: 'CREATE',
    objectTypeLabel: 'Danh mục',
    isRead: false,
    url: '/approver/products/single/p-4',
  },
  {
    groupId: 'mock-5',
    labelTitle: 'Lô sản phẩm mới cần được Phê duyệt',
    displayTime: '12/05/2026',
    valueContent: 'Cán bộ quản lý Nguyễn Văn A đã import và tạo lô Lô SP-2024-089 gồm 24 sản phẩm, cần được Phê duyệt trước khi kích hoạt.',
    actionLabel: 'Tạo mới',
    actionType: 'CREATE',
    objectTypeLabel: 'Lô sản phẩm',
    isRead: false,
    url: '/approver/batch/b-1',
  },
  {
    groupId: 'mock-6',
    labelTitle: 'Nội dung đã được chỉnh sửa, cần Phê duyệt lại',
    displayTime: '12/05/2026',
    valueContent: 'Cán bộ quản lý Nguyễn Văn A đã cập nhật nội dung sản phẩm Tiết kiệm linh hoạt 6 tháng và gửi yêu cầu Phê duyệt lại.',
    actionLabel: 'Chỉnh sửa',
    actionType: 'UPDATE',
    objectTypeLabel: 'Sản phẩm',
    isRead: false,
    url: '/approver/products/single/p-5',
  },
  {
    groupId: 'mock-7',
    labelTitle: 'Nội dung đã được chỉnh sửa theo yêu cầu, gửi lại Phê duyệt',
    displayTime: '12/05/2026',
    valueContent: 'Cán bộ quản lý Nguyễn Văn A đã chỉnh sửa theo phản hồi và gửi lại để Phê duyệt.',
    actionLabel: 'Gửi lại Phê duyệt',
    actionType: 'REVISION',
    objectTypeLabel: 'Sản phẩm',
    isRead: false,
    url: '/approver/products/single/p-6',
  },
  {
    groupId: 'mock-8',
    labelTitle: 'Nội dung đã được chỉnh sửa, cần Phê duyệt lại',
    displayTime: '12/05/2026',
    valueContent: 'Cán bộ quản lý Nguyễn Văn A đã cập nhật nội dung sản phẩm Tiết kiệm linh hoạt 6 tháng và gửi yêu cầu Phê duyệt lại.',
    actionLabel: 'Chỉnh sửa',
    actionType: 'UPDATE',
    objectTypeLabel: 'Sản phẩm',
    isRead: false,
    url: '/approver/products/single/p-7',
  },
];

const HeaderBar: React.FC = () => {
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('userRole') as UserRole) || 'ETN08';
  });
  const [currentUserRole, setCurrentUserRole] = useState<string>(() => {
    return localStorage.getItem('currentUserRole') || 'ETN08';
  });
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem('currentUserFullName') || 'Phạm Thùy Linh';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notification States
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [unreadCount, setUnreadCount] = useState<number>(MOCK_NOTIFICATIONS.filter(n => !n.isRead).length);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const notiRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (pageToFetch = 0, append = false) => {
    try {
      if (append) setLoadingMore(true);
      const res = await axios.get(`${API_ENDPOINTS.NOTIFICATIONS.LIST}?page=${pageToFetch}&size=10`);
      if (res.status === 200) {
        const rawData: any[] = res.data;
        if (Array.isArray(rawData)) {
          const normalized: NotificationItem[] = rawData.map(item => ({
            ...item,
            isRead: Boolean(item.isRead ?? item.read ?? false)
          }));

          if (append) {
            setNotifications(prev => [...prev, ...normalized]);
          } else {
            setNotifications(normalized);
            setPage(0);
          }

          setHasMore(normalized.length >= 10);

          if (!append) {
            fetchUnreadCount();
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Backend API notification not reachable, using mock fallback list', e);
      if (!append) {
        setNotifications(MOCK_NOTIFICATIONS);
        setHasMore(false);
      }
    } finally {
      if (append) setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      if (res.status === 200) {
        const data = res.data;
        if (typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      }
    } catch (e) {
      console.warn('Backend API unread count not reachable', e);
    }
  };

  useEffect(() => {
    fetchNotifications(0, false);
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleSelect = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('userRole', newRole);
    window.dispatchEvent(new Event('userRoleChanged'));
    setIsDropdownOpen(false);

    if (newRole === 'VIEWER') {
      navigate('/view');
    } else if (newRole === 'ETK08') {
      navigate('/approver/product-groups');
    } else {
      navigate('/product-groups');
    }
  };

  const handleNotificationItemClick = async (item: NotificationItem) => {
    // Mark read locally
    setNotifications(prev =>
      prev.map(n => (n.groupId === item.groupId ? { ...n, isRead: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Call API mark read
    try {
      await axios.put(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(item.groupId));
    } catch (e) {
      console.warn('Failed to mark read on server', e);
    }

    setIsNotiOpen(false);

    // Redirect to object page if url exists
    if (item.url) {
      navigate(item.url);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await axios.put(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    } catch (e) {
      console.warn('Failed to mark all read on server', e);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setIsNotiOpen(false);
      }
    };

    const handleRoleChange = () => {
      setRole((localStorage.getItem('userRole') as UserRole) || 'ETN08');
      setCurrentUserRole(localStorage.getItem('currentUserRole') || 'ETN08');
    };

    const handleUserChange = () => {
      setDisplayName(localStorage.getItem('currentUserFullName') || 'Phạm Thùy Linh');
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('userRoleChanged', handleRoleChange);
    window.addEventListener('currentUserChanged', handleUserChange);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('userRoleChanged', handleRoleChange);
      window.removeEventListener('currentUserChanged', handleUserChange);
    };
  }, []);

  const getActionTagClass = (actionType?: string) => {
    if (!actionType) return 'action-create';
    switch (actionType.toUpperCase()) {
      case 'UPDATE':
        return 'action-update';
      case 'REVISION':
      case 'NEEDS_REVISION':
        return 'action-revision';
      case 'APPROVE':
        return 'action-approve';
      case 'REJECT':
        return 'action-reject';
      default:
        return 'action-create';
    }
  };

  return (
    <header className="header-container">
      {/* Khối bên trái */}
      <div className="flex items-center">
        <img
          src={logoAgribank}
          alt="Logo Agribank"
          className="w-[48px] h-[48px] rounded-[7px] object-contain"
        />
        <div className="ml-3 flex flex-col justify-center h-[48px]">
          <h1 className="header-title">
            Sổ tay sản phẩm dịch vụ <br />
            Khách hàng doanh nghiệp
          </h1>
        </div>
      </div>

      {/* Khối bên phải */}
      <div className="flex items-center space-x-6">
        {/* Nút Thông báo với Badge & Dropdown */}
        <div className="notification-wrapper" ref={notiRef}>
          <button
            className={`notification-btn ${isNotiOpen ? 'active' : ''}`}
            onClick={() => {
              setIsNotiOpen(!isNotiOpen);
              if (!isNotiOpen) fetchNotifications();
            }}
            title="Thông báo"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M13.73 21C13.5542 21.3031 13.3018 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
                stroke="#171717"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {unreadCount > 0 && <span className="notification-badge-dot" />}
          </button>

          {/* Popup Dropdown danh sách thông báo */}
          {isNotiOpen && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span className="notification-header-title">Thông báo</span>
                {unreadCount > 0 && (
                  <button className="notification-mark-all" onClick={handleMarkAllRead}>
                    Đánh dấu tất cả là đã đọc
                  </button>
                )}
              </div>

              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notification-empty">Không có thông báo nào</div>
                ) : (
                  notifications.map(item => (
                    <button
                      key={item.groupId}
                      className={`notification-item ${item.isRead ? 'read' : 'unread'}`}
                      onClick={() => handleNotificationItemClick(item)}
                    >
                      <div className="item-top-row">
                        <div className="item-title-group">
                          <span className="item-title">{item.labelTitle}</span>
                          <span className="item-time">{item.displayTime}</span>
                        </div>
                        {!item.isRead && <div className="item-unread-dot" />}
                      </div>

                      <p className="item-content">{item.valueContent}</p>

                      <div className="item-tags">
                        <span className={`tag-action ${getActionTagClass(item.actionType)}`}>
                          {item.actionLabel || 'Tạo mới'}
                        </span>
                        <span className="tag-object">{item.objectTypeLabel || 'Danh mục'}</span>
                      </div>
                    </button>
                  ))
                )}

                {hasMore && notifications.length > 0 && (
                  <button
                    className="notification-load-more"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Đang tải...' : 'Xem thêm thông báo'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Khối User Profile với Dropdown Menu */}
        <div className="user-profile-container" ref={dropdownRef}>
          <div
            className="flex items-center space-x-4 cursor-pointer"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="text-right flex flex-col justify-center self-stretch">
              <p className="user-name">{displayName}</p>
              <p className="user-role">{ROLE_LABELS[role] || 'Quản lý nội dung'}</p>
            </div>
            <div className="avatar-container">
              <img
                src="https://scontent-hkg1-2.xx.fbcdn.net/v/t39.30808-1/496859882_2213309762459479_7876539183003247432_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=e99d92&_nc_eui2=AeElV1lB8lxE-Jl95Brt5yL0LdMbKgfDiPot0xsqB8OI-kQvt-NXlC2_iQ2LpjOlsP_Sj8JB4tlBq6Qh5qcQD-aq&_nc_ohc=B9tUax_rWcUQ7kNvwGbtNW8&_nc_oc=Ado2VW0tNyfSJvCs3OCpA8USP2wUqKSgB_pesbBXYXzije1mYwA01dv_Go9XPC3JRu1wWgwHPm4Vw404DpcFzxqm&_nc_zt=24&_nc_ht=scontent-hkg1-2.xx&_nc_gid=hdKbd8IqLtAGg9csLT1Atg&_nc_ss=7b2a8&oh=00_Af6Qe-5KSfSnIshr1ykW4CWS0M9GhucP97bQF2jEdMqaYg&oe=6A09D4B9"
                alt="Avatar"
                className="avatar-img"
              />
            </div>
          </div>

          {/* Menu Popup người dùng */}
          {isDropdownOpen && (
            <div className="user-dropdown-menu">
              <button
                className={`dropdown-item ${role === 'VIEWER' ? 'active' : ''}`}
                onClick={() => handleRoleSelect('VIEWER')}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Tra cứu sản phẩm</span>
              </button>

              {(currentUserRole === 'ESA08' || currentUserRole === 'ETN08') && (
                <button
                  className={`dropdown-item ${role === 'ETN08' ? 'active' : ''}`}
                  onClick={() => handleRoleSelect('ETN08')}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>Quản lý nội dung</span>
                </button>
              )}

              {(currentUserRole === 'ESA08' || currentUserRole === 'ETK08') && (
                <button
                  className={`dropdown-item ${role === 'ETK08' ? 'active' : ''}`}
                  onClick={() => handleRoleSelect('ETK08')}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span>Kiểm duyệt nội dung</span>
                </button>
              )}

              <div className="dropdown-divider" />

              <button
                className="dropdown-item"
                onClick={() => {
                  setIsDropdownOpen(false);
                  localStorage.clear();
                  const redirectUri = window.location.origin + '/';
                  window.location.href = `${AUTH_SERVICE_LOGOUT_URL}?redirect_uri=${encodeURIComponent(redirectUri)}`;
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;