import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logoAgribank from '../../assets/logo-agribank.png';
import styles from './HeaderBar.module.css';
import { API_ENDPOINTS } from '../../config/view/apiConfig';
import { AUTH_SERVICE_LOGOUT_URL } from '../../config/apiConfig';
import { type UserRole } from '../../config/menuConfig';

const ROLE_LABELS: Record<string, string> = {
  ESA08: 'Ban Ngân hàng số',
  ECV08: 'Cán bộ tra cứu',
  ETN08: 'Quản trị nội dung',
  ETK08: 'Kiểm duyệt nội dung',
  VIEWER: 'Tra cứu sản phẩm',
};

interface SearchItem {
  id: string;
  name: string;
}

interface SearchResponse {
  groups: SearchItem[];
  categories: SearchItem[];
  businesses: SearchItem[];
  products: SearchItem[];
}

interface HeaderBarProps {
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
}

const HeaderBar: React.FC<HeaderBarProps> = ({ onMenuClick, isMenuOpen = false }) => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('userRole') as UserRole) || 'VIEWER';
  });
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('currentUserRole') as UserRole) || 'VIEWER';
  });
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem('currentUserFullName') || 'Phạm Thùy Linh';
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  const saveRecentSearch = (keyword: string) => {
    if (!keyword.trim()) return;
    const stored = localStorage.getItem('recentSearches');
    let searches: string[] = stored ? JSON.parse(stored) : [];
    
    searches = searches.filter(item => item.toLowerCase() !== keyword.toLowerCase());
    searches.unshift(keyword);
    searches = searches.slice(0, 10);
    
    localStorage.setItem('recentSearches', JSON.stringify(searches));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    saveRecentSearch(searchQuery);
    const updated = localStorage.getItem('recentSearches');
    if (updated) {
      setRecentSearches(JSON.parse(updated));
    }
    setShowDropdown(false);
    navigate(`/view/search?q=${encodeURIComponent(searchQuery)}`);
  };

  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    const keyword = searchQuery.trim();

    if (!keyword) {
      setSearchResult(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const response = await axios.get<SearchResponse>(`${API_ENDPOINTS.SEARCH}`, {
          params: { keyword }
        });
        setSearchResult(response.data);
        setShowDropdown(true);
      } catch (error) {
        console.error('Lỗi khi tìm kiếm nhanh:', error);
      } finally {
        setLoadingSearch(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchQuery, recentSearches.length]);

  const hasResult =
    searchResult &&
    (searchResult.groups.length > 0 ||
      searchResult.categories.length > 0 ||
      searchResult.businesses.length > 0 ||
      searchResult.products.length > 0);

  const handleNavigate = (type: string, id: string) => {
    setShowDropdown(false);
    switch (type) {
      case 'group': navigate(`/groups/${id}`); break;
      case 'category': navigate(`/category/${id}`); break;
      case 'business': navigate(`/business/${id}`); break;
      case 'product': navigate(`/product-detail/${id}`); break;
      default: break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleRoleChange = () => {
      setRole((localStorage.getItem('userRole') as UserRole) || 'VIEWER');
      setCurrentUserRole((localStorage.getItem('currentUserRole') as UserRole) || 'VIEWER');
    };
    const handleUserChange = () => {
      setDisplayName(localStorage.getItem('currentUserFullName') || 'Phạm Thùy Linh');
    };
    window.addEventListener('userRoleChanged', handleRoleChange);
    window.addEventListener('currentUserChanged', handleUserChange);
    return () => {
      window.removeEventListener('userRoleChanged', handleRoleChange);
      window.removeEventListener('currentUserChanged', handleUserChange);
    };
  }, []);

  return (
    <header className={styles['header-container']}>
      <div className={styles['header-content']}>
        <div className={styles['header-left']}>
          <button
            type="button"
            className={styles['mobile-menu-btn']}
            onClick={onMenuClick}
            aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>

          <div className={styles['header-brand']}>
            <img src={logoAgribank} alt="Logo Agribank" className={styles['header-logo']} />
            <div className={styles['header-brand-text']}>
              <h1 className={styles['header-title']}>
                <span className={styles['header-title-line']}>Sổ tay sản phẩm dịch vụ</span>
                <span className={styles['header-title-line']}>Khách hàng doanh nghiệp</span>
              </h1>
            </div>
          </div>
        </div>

        <div className={styles['header-search-wrapper']} ref={dropdownRef}>
          <form 
            className={styles['header-search']} 
            onSubmit={(e) => { 
              e.preventDefault(); 
              handleSearch(); 
            }}
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              className={styles['header-search-icon']}
            >
              <path
                d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="text"
              className={styles['header-search-input']}
              placeholder="Tìm kiếm"
              value={searchQuery}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {showDropdown && (
            <div className={styles['search-dropdown']}>
              <div className={styles['search-dropdown-content']}>
                {!searchQuery.trim() && recentSearches.length > 0 && (
                  <>
                    <div className={styles['search-history-header']}>
                      <span>Tìm kiếm gần đây</span>
                      <button 
                        type="button"
                        className={styles['clear-history-btn']} 
                        onClick={(e) => {
                          e.stopPropagation();
                          localStorage.removeItem('recentSearches');
                          setRecentSearches([]);
                          setShowDropdown(false);
                        }}
                      >
                        Xóa tất cả
                      </button>
                    </div>
                    {recentSearches.map(keyword => (
                      <div 
                        key={keyword} 
                        className={`${styles['search-item']} ${styles['recent-item']}`} 
                        onClick={() => setSearchQuery(keyword)}
                      >
                        <span className={styles['history-icon']}>🕒</span>
                        <span className={styles['history-text']}>{keyword}</span>
                      </div>
                    ))}
                  </>
                )}

                {loadingSearch && <div className={styles['search-loading']}>Đang tìm kiếm dữ liệu...</div>}

                {!loadingSearch && searchQuery.trim() && !hasResult && (
                  <div className={styles['search-empty']}>Không tìm thấy dữ liệu phù hợp</div>
                )}

                {!loadingSearch && hasResult && (
                  <>
                    {searchResult?.groups && searchResult.groups.length > 0 && (
                      <>
                        <div className={styles['search-title']}>Nhóm sản phẩm</div>
                        {searchResult.groups.map(item => (
                          <div key={item.id} className={styles['search-item']} onClick={() => handleNavigate('group', item.id)}>
                            {item.name}
                          </div>
                        ))}
                      </>
                    )}

                    {searchResult?.categories && searchResult.categories.length > 0 && (
                      <>
                        <div className={styles['search-title']}>Danh mục</div>
                        {searchResult.categories.map(item => (
                          <div key={item.id} className={styles['search-item']} onClick={() => handleNavigate('category', item.id)}>
                            {item.name}
                          </div>
                        ))}
                      </>
                    )}

                    {searchResult?.businesses && searchResult.businesses.length > 0 && (
                      <>
                        <div className={styles['search-title']}>Nghiệp vụ</div>
                        {searchResult.businesses.map(item => (
                          <div key={item.id} className={styles['search-item']} onClick={() => handleNavigate('business', item.id)}>
                            {item.name}
                          </div>
                        ))}
                      </>
                    )}

                    {searchResult?.products && searchResult.products.length > 0 && (
                      <>
                        <div className={styles['search-title']}>Sản phẩm</div>
                        {searchResult.products.map(item => (
                          <div key={item.id} className={styles['search-item']} onClick={() => handleNavigate('product', item.id)}>
                            {item.name}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div> 

              {!loadingSearch && searchQuery.trim() && (
                <div
                  className={styles['search-view-all']}
                  onClick={() => {
                    handleSearch();
                    setShowDropdown(false); 
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>
                    Xem tất cả kết quả cho "<strong>{searchQuery}</strong>"
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles['header-right']}>
          <div className={styles['user-profile-container']} ref={userMenuRef}>
            <div 
              className={styles['user-profile-trigger']}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className={styles['user-text']}>
                <p className={styles['user-name']}>{displayName}</p>
                <p className={styles['user-role']}>{ROLE_LABELS[role] || 'Tra cứu sản phẩm'}</p>
              </div>
              <div className={styles['avatar-wrapper']}>
                <div className={styles['avatar-container']}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles['avatar-icon']}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className={styles['chevron-icon']}
                >
                  <path 
                    d="M17.4697 8.46967C17.7626 8.17678 18.2373 8.17678 18.5302 8.46967C18.8231 8.76256 18.8231 9.23732 18.5302 9.53022L12.5302 15.5302C12.2373 15.8231 11.7626 15.8231 11.4697 15.5302L5.46967 9.53022C5.17678 9.23732 5.17678 8.76256 5.46967 8.46967C5.76256 8.17678 6.23732 8.17678 6.53022 8.46967L11.9999 13.9394L17.4697 8.46967Z" 
                    fill="#211F26"
                  />
                </svg>
              </div>
            </div>

            {isDropdownOpen && (
              <div className={styles['user-dropdown-menu']}>
                <button 
                  className={`${styles['dropdown-item']} ${role === 'VIEWER' ? styles.active : ''}`}
                  onClick={() => handleRoleSelect('VIEWER')}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <span>Tra cứu sản phẩm</span>
                </button>

                {(currentUserRole === 'ESA08' || currentUserRole === 'ETN08') && (
                  <button 
                    className={`${styles['dropdown-item']} ${role === 'ETN08' ? styles.active : ''}`}
                    onClick={() => handleRoleSelect('ETN08')}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span>Quản trị nội dung</span>
                  </button>
                )}

                {(currentUserRole === 'ESA08' || currentUserRole === 'ETK08') && (
                  <button 
                    className={`${styles['dropdown-item']} ${role === 'ETK08' ? styles.active : ''}`}
                    onClick={() => handleRoleSelect('ETK08')}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <span>Kiểm duyệt nội dung</span>
                  </button>
                )}

                <div className={styles['dropdown-divider']} />

                <button 
                  className={styles['dropdown-item']}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    localStorage.removeItem('userRole'); 
                    window.location.href = AUTH_SERVICE_LOGOUT_URL;
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;