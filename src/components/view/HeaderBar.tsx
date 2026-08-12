import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import logoAgribank from '../../assets/logo-agribank.png';
import styles from './HeaderBar.module.css';
import { API_ENDPOINTS } from '../../config/view/apiConfig';

const USER_NAME = 'Phạm Thùy Linh';
const USER_ROLE = 'Quản trị nội dung';

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles['header-container']}>
      <button
        type="button"
        className={styles['mobile-menu-btn']}
        onClick={onMenuClick}
        aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
        aria-expanded={isMenuOpen}
      >
        {isMenuOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <span className={`${styles['header-title-line']} ${styles['header-title-sub']}`}>Khách hàng doanh nghiệp</span>
          </h1>
        </div>
      </div>

      <div className={styles['header-search-wrapper']} ref={dropdownRef}>
        <form className={styles['header-search']} onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles['header-search-icon']}>
            <path
              d="M14.33 14.33L11.71 11.71M13.58 7.21C13.58 10.73 10.73 13.58 7.21 13.58C3.69 13.58 0.83 10.73 0.83 7.21C0.83 3.69 3.69 0.83 7.21 0.83C10.73 0.83 13.58 3.69 13.58 7.21Z"
              stroke="#3C393F"
              strokeWidth="1.67"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            type="text"
            className={styles['header-search-input']}
            placeholder="Tìm kiếm sản phẩm, danh mục..."
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
        <button
          className={styles['notification-btn']}
          onClick={() => toast('Không có thông báo')}
          aria-label="Thông báo"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M13.73 21C13.55 21.3 13.3 21.55 13 21.73C12.69 21.9 12.35 22 12 22C11.65 22 11.31 21.9 11 21.73C10.7 21.55 10.45 21.3 10.27 21M18 8C18 6.41 17.37 4.88 16.24 3.76C15.12 2.63 13.59 2 12 2C10.41 2 8.88 2.63 7.76 3.76C6.63 4.88 6 6.41 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
              stroke="#171717"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className={styles['user-info']}>
          <div className={styles['user-text']}>
            <p className={styles['user-name']}>{USER_NAME}</p>
            <p className={styles['user-role']}>{USER_ROLE}</p>
          </div>
          <div className={styles['avatar-container']}>
            {getInitials(USER_NAME)}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;