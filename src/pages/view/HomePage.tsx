import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HomePage.css';
import { BASE_URL } from '../../config/view/apiConfig';
import ProductCard from './common/ProductCard';
import type { ProductInfo } from './common/ProductCard';

const getCategoryStyle = (index: number) => {
  const styles = [
    { iconColor: 'text-pink-500', bgColor: 'bg-pink-50', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
    { iconColor: 'text-teal-500', bgColor: 'bg-teal-50', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { iconColor: 'text-orange-500', bgColor: 'bg-orange-50', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { iconColor: 'text-green-500', bgColor: 'bg-green-50', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { iconColor: 'text-yellow-500', bgColor: 'bg-yellow-50', icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z' },
    { iconColor: 'text-indigo-500', bgColor: 'bg-indigo-50', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { iconColor: 'text-purple-500', bgColor: 'bg-purple-50', icon: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { iconColor: 'text-cyan-500', bgColor: 'bg-cyan-50', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { iconColor: 'text-red-500', bgColor: 'bg-red-50', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
  ];
  return styles[index % styles.length];
};

interface Category { id: string | number; name: string; [key: string]: any; }
interface SearchItem { id: string; name: string; }
interface SearchResponse {
  groups: SearchItem[]; 
  categories: SearchItem[]; 
  businesses: SearchItem[]; 
  products: SearchItem[];
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [recentProducts, setRecentProducts] = useState<ProductInfo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [groupProductCounts, setGroupProductCounts] = useState<Record<string, number>>({});
  
  // State mới cho phần Mới cập nhật
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentlyViewed');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentProducts(parsed.slice(0, 6));
      }
    } catch (error) { 
      console.error('Lỗi khi đọc lịch sử:', error); 
    }

    const storedSearches = localStorage.getItem('recentSearches');
    if (storedSearches) {
      setRecentSearches(JSON.parse(storedSearches));
    }
  }, [location]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/v1/product-groups?status=ACTIVE&active=true`); 
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) { 
        console.error("Lỗi khi fetch categories:", error); 
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchAndCountProducts = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/v1/products`);
        if (response.ok) {
          const data = await response.json();
          const products = Array.isArray(data) ? data : (data.content || data.items || data.data || []);
          const counts: Record<string, number> = {};
          
          products.forEach((product: any) => {
            const isStatusActive = product.status === 'Active' || product.status === 'ACTIVE';
            const isActive = product.isactive === true || product.isActive === true || product.active === true;
            const isBusinessNull = product.businessId === null && product.businessName === null;
            const isCategoryNull = product.productCategoryId === null && product.productCategoryName === null;
            
            if (isStatusActive && isActive && isBusinessNull && isCategoryNull) {
              const groupId = product.productGroupId || product.groupId || product.product_group_id;
              if (groupId) {
                counts[groupId] = (counts[groupId] || 0) + 1;
              }
            }
          });
          setGroupProductCounts(counts);

          // === LOGIC MỚI: Trích xuất danh sách "Mới cập nhật" ===
          const sortedByDate = [...products].sort((a: any, b: any) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return dateB - dateA; // Sắp xếp giảm dần (mới nhất lên đầu)
          });
          
          // Lấy 4 sản phẩm mới nhất để hiển thị
          setRecentUpdates(sortedByDate.slice(0, 4));
        }
      } catch (error) { 
        console.error("Lỗi khi fetch sản phẩm:", error); 
      }
    };
    fetchAndCountProducts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        const response = await fetch(`${BASE_URL}/api/v1/search?keyword=${encodeURIComponent(keyword)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResult(data);
          setShowDropdown(true);
        }
      } catch (error) { 
        console.error('Lỗi khi tìm kiếm nhanh:', error); 
      } finally { 
        setLoadingSearch(false); 
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const hasResult = searchResult && (
    searchResult.groups.length > 0 || 
    searchResult.categories.length > 0 || 
    searchResult.businesses.length > 0 || 
    searchResult.products.length > 0
  );

  const saveRecentSearch = (keyword: string) => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return;
    
    const stored = localStorage.getItem('recentSearches');
    let searches: string[] = stored ? JSON.parse(stored) : [];
    searches = searches.filter(item => item.toLowerCase() !== trimmedKeyword.toLowerCase());
    searches.unshift(trimmedKeyword);
    searches = searches.slice(0, 10);
    
    localStorage.setItem('recentSearches', JSON.stringify(searches));
    setRecentSearches(searches); 
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const keyword = searchQuery.trim();
    if (keyword) {
      saveRecentSearch(keyword);
      setShowDropdown(false);
      navigate(`/view/search?q=${encodeURIComponent(keyword)}`);
    }
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    saveRecentSearch(tag);
    setShowDropdown(false);
    navigate(`/view/search?q=${encodeURIComponent(tag)}`);
  };

  const handleNavigateFromDropdown = (type: string, id: string) => {
    setShowDropdown(false);
    saveRecentSearch(searchQuery);
    switch (type) {
      case 'group': navigate(`/view/groups/${id}`); break;
      case 'category': navigate(`/view/category/${id}`); break;
      case 'business': navigate(`/view/business/${id}`); break;
      case 'product': navigate(`/view/product-detail/${id}`); break;
      default: break;
    }
  };

  const handleCategoryClick = (categoryId: string | number) => {
    navigate(`/view/groups/${categoryId}`);
  };

  // Hàm format ngày tháng theo chuẩn Việt Nam (VD: 16/06/2023)
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  const displayedCategories = showAllCategories ? categories : categories.slice(0, 10);
  const defaultSearches = ['SP vay vốn', 'thanh toán', 'xuất khẩu'];
  const searchTags = recentSearches.length > 0 ? recentSearches.slice(0, 3) : defaultSearches;

  return (
    <div className="homepage min-h-screen font-sans">
      {/* ... Phần hero-section giữ nguyên ... */}
      <div className="hero-section flex flex-col items-center justify-center py-20 px-4 relative">
        <h1 className="hero-title text-4xl font-bold text-gray-800 mb-8 text-center">
          Tra cứu sản phẩm dịch vụ
        </h1>
        
        <div className="w-full max-w-3xl relative" ref={dropdownRef}>
          <form onSubmit={handleSearchSubmit} className="relative flex items-center z-20">
            <input 
              type="text" 
              placeholder="Thanh toán" 
              value={searchQuery} 
              onFocus={() => setShowDropdown(true)} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-6 pr-16 py-4 rounded-full border border-gray-200 shadow-md text-lg focus:outline-none focus:ring-2 focus:ring-[#AE1C3F] focus:border-transparent text-gray-700 placeholder-gray-400 bg-white" 
            />
            <button 
              type="submit" 
              disabled={!searchQuery.trim()} 
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#AE1C3F] hover:bg-rose-800 text-white p-3 rounded-full transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          {showDropdown && searchQuery.trim() && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] border border-gray-100 max-h-[400px] overflow-y-auto z-50">
              <div className="p-4 text-left">
                {loadingSearch && (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    Đang tìm kiếm dữ liệu...
                  </div>
                )}
                
                {!loadingSearch && !hasResult && (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    Không tìm thấy dữ liệu phù hợp
                  </div>
                )}
                
                {!loadingSearch && hasResult && (
                  <>
                    {searchResult?.groups && searchResult.groups.length > 0 && (
                      <>
                        <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-2 first:mt-0">Nhóm sản phẩm</div>
                        {searchResult.groups.map(item => (
                          <div 
                            key={item.id} 
                            className="px-3 py-2.5 rounded-md cursor-pointer flex items-center text-sm hover:bg-gray-100" 
                            onClick={() => handleNavigateFromDropdown('group', item.id)}
                          >
                            {item.name}
                          </div>
                        ))}
                      </>
                    )}
                    {searchResult?.categories && searchResult.categories.length > 0 && (
                      <>
                        <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-2 first:mt-0">Danh mục</div>
                        {searchResult.categories.map(item => (
                          <div 
                            key={item.id} 
                            className="px-3 py-2.5 rounded-md cursor-pointer flex items-center text-sm hover:bg-gray-100" 
                            onClick={() => handleNavigateFromDropdown('category', item.id)}
                          >
                            {item.name}
                          </div>
                        ))}
                      </>
                    )}
                    {searchResult?.businesses && searchResult.businesses.length > 0 && (
                      <>
                        <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-2 first:mt-0">Loại hình Doanh nghiệp</div>
                        {searchResult.businesses.map(item => (
                          <div 
                            key={item.id} 
                            className="px-3 py-2.5 rounded-md cursor-pointer flex items-center text-sm hover:bg-gray-100" 
                            onClick={() => handleNavigateFromDropdown('business', item.id)}
                          >
                            {item.name}
                          </div>
                        ))}
                      </>
                    )}
                    {searchResult?.products && searchResult.products.length > 0 && (
                      <>
                        <div className="text-xs font-semibold text-gray-400 uppercase mt-4 mb-2 first:mt-0">Sản phẩm</div>
                        {searchResult.products.map(item => (
                          <div 
                            key={item.id} 
                            className="px-3 py-2.5 rounded-md cursor-pointer flex items-center text-sm hover:bg-gray-100" 
                            onClick={() => handleNavigateFromDropdown('product', item.id)}
                          >
                            {item.name}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
              
              {!loadingSearch && (
                <div 
                  className="px-4 py-3 border-t border-gray-100 flex items-center justify-center gap-2 cursor-pointer text-[#A31720] text-sm font-medium bg-[#fdf2f3] hover:bg-[#fae6e8] transition-colors" 
                  onClick={handleSearchSubmit}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>Xem tất cả kết quả cho "<strong>{searchQuery}</strong>"</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {searchTags.map((tag, index) => (
            <button 
              key={index} 
              onClick={() => handleTagClick(tag)} 
              className="bg-white/80 hover:bg-white text-gray-600 px-5 py-2 rounded-full shadow-sm text-sm font-medium flex items-center transition-colors border border-white"
            >
              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* --- PHẦN MỚI CẬP NHẬT (Render ngay trên Danh mục) --- */}
        {recentUpdates.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center space-x-3 mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800">Mới cập nhật</h2>
            </div>

            <div className="flex flex-col gap-3">
              {recentUpdates.map((product) => {
                // Xác định Tạo mới hay Sửa đổi dựa trên updatedAt khác createdAt
                const isUpdated = product.updatedAt && product.updatedAt !== product.createdAt;
                const badgeLabel = isUpdated ? 'Sửa đổi' : 'Tạo mới';
                const badgeClass = isUpdated 
                  ? 'bg-rose-100 text-rose-700' 
                  : 'bg-emerald-100 text-emerald-700';

                const displayDate = formatDate(product.updatedAt || product.createdAt);
                const categoryText = product.productGroupName || product.productCategoryName || 'Sản phẩm';

                return (
                  <div 
                    key={product.id}
                    onClick={() => navigate(`/view/product-detail/${product.id}`)}
                    className="flex items-center justify-between p-4 bg-white rounded-[16px] border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      {/* Badge Tạo mới / Sửa đổi */}
                      <span className={`px-4 py-1.5 text-xs font-semibold rounded-full w-[80px] text-center whitespace-nowrap ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                      
                      {/* Thông tin sản phẩm */}
                      <div className="flex flex-col">
                        <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                          {product.name}
                        </h3>
                        <p className="text-[13px] text-gray-500 mt-1">
                          {categoryText} • {displayDate}
                        </p>
                      </div>
                    </div>
                    
                    {/* Nút Xem chi tiết */}
                    <div className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-800 transition-colors">
                      Xem chi tiết
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ... Danh mục nhóm sản phẩm ... */}
        {categories.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center space-x-3 mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
              <h2 className="text-2xl font-bold text-gray-800">Danh mục nhóm sản phẩm</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedCategories.map((cat, index) => {
                const style = getCategoryStyle(index); 
                const count = groupProductCounts[cat.id] || 0;
                return (
                  <div 
                    key={cat.id} 
                    onClick={() => handleCategoryClick(cat.id)} 
                    className="bg-white rounded-[16px] p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col items-start gap-4"
                  >
                    <div 
                      className={`rounded-xl flex items-center justify-center ${style.bgColor} ${style.iconColor}`} 
                      style={{ width: '48px', height: '48px' }}
                    >
                      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d={style.icon} />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-[15px] text-gray-800 leading-tight mb-1">{cat.name}</h3>
                      <p className="text-[13px] text-gray-500 font-medium">{count} sản phẩm</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {categories.length > 10 && (
              <div className="flex justify-center mt-8">
                <button 
                  onClick={() => setShowAllCategories(!showAllCategories)} 
                  className="flex items-center px-6 py-2 border border-gray-200 rounded-full text-sm font-medium text-[#AE1C3F] hover:bg-rose-50 transition-colors bg-white"
                >
                  {showAllCategories ? 'Ẩn bớt' : 'Xem tất cả'}
                  <svg className={`w-4 h-4 ml-2 transition-transform duration-300 ${showAllCategories ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ... Đã xem gần đây ... */}
        {recentProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"/>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                <path d="M3 22v-6h6"/>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
              <h2 className="text-2xl font-bold text-gray-800">Đã xem gần đây</h2>
            </div>
            
            <div className="products-grid">
              {recentProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onClick={() => navigate(`/view/product-detail/${product.id}`)} 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;