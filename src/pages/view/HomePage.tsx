import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './HomePage.css';
import { BASE_URL } from '../../config/view/apiConfig';
import ProductCard from './common/ProductCard';
import type { ProductInfo } from './common/ProductCard';

import iconHuyDongVon from '../../assets/icons/san-pham-huy-dong-von.svg';
import iconChoVay from '../../assets/icons/sp-cho-vay.svg';
import iconBaoLanh from '../../assets/icons/sp-bao-lanh.svg';
import iconThanhToanTrongNuoc from '../../assets/icons/sp-thanh-toan-trong-nuoc.svg';
import iconKinhDoanhNgoaiTe from '../../assets/icons/sp-kinh-doanh-ngoai-te.svg';
import iconThanhToanQuocTe from '../../assets/icons/sp-thanh-toan-quoc-te.svg';
import iconThe from '../../assets/icons/sp-the.svg';
import iconNganHangDienTu from '../../assets/icons/sp-ngan-hang-dien-tu.svg';
import iconNganQuy from '../../assets/icons/sp-ngan-quy.svg';
import iconBaoHiem from '../../assets/icons/sp-bao-hiem.svg';
import iconChuongTrinhUuDai from '../../assets/icons/uu-dai-khdn.svg';
import iconTimKiem from '../../assets/icon/timkiem.svg';

const removeAccents = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const getCategoryConfig = (itemName: string) => {
  const cleanName = removeAccents((itemName || '').toLowerCase().trim());

  if (cleanName.includes('quoc te')) {
    return { icon: iconThanhToanQuocTe, bgColor: '#FDF2F5', iconColor: '#C03254' };
  }
  if (cleanName.includes('cho vay')) {
    return { icon: iconChoVay, bgColor: '#E6F7F6', iconColor: '#11817A' };
  }
  if (cleanName.includes('ngan quy') || cleanName.includes('dich vu')) {
    return { icon: iconNganQuy, bgColor: '#FDF2EA', iconColor: '#B96D46' };
  }
  if (cleanName.includes('bao lanh')) {
    return { icon: iconBaoLanh, bgColor: '#ECF9F1', iconColor: '#2E7D52' };
  }
  if (cleanName.includes('bao hiem')) {
    return { icon: iconBaoHiem, bgColor: '#FEF7E6', iconColor: '#B48C2B' };
  }
  if (cleanName.includes('trong nuoc') || cleanName.includes('thanh toan')) {
    return { icon: iconThanhToanTrongNuoc, bgColor: '#ECF9EE', iconColor: '#388E3C' };
  }
  if (cleanName.includes('the')) {
    return { icon: iconThe, bgColor: '#F0F1FB', iconColor: '#3F51B5' };
  }
  if (cleanName.includes('dien tu')) {
    return { icon: iconNganHangDienTu, bgColor: '#F5F0FB', iconColor: '#7B1FA2' };
  }
  if (cleanName.includes('huy dong')) {
    return { icon: iconHuyDongVon, bgColor: '#E5F8F6', iconColor: '#00897B' };
  }
  if (cleanName.includes('uu dai')) {
    return { icon: iconChuongTrinhUuDai, bgColor: '#FCEEF0', iconColor: '#C02242' };
  }
  if (cleanName.includes('ngoai te')) {
    return { icon: iconKinhDoanhNgoaiTe, bgColor: '#FDF2EA', iconColor: '#B96D46' };
  }

  return { icon: null, bgColor: '#F3F4F6', iconColor: '#6B7280' };
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
  const [newlyCreatedProducts, setNewlyCreatedProducts] = useState<ProductInfo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [groupProductCounts, setGroupProductCounts] = useState<Record<string, number>>({});
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${safeQuery})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <strong key={index} className="font-bold text-gray-900">{part}</strong>
      ) : (
        part
      )
    );
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recentlyViewed');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRecentProducts(parsed.slice(0, 6));
      }
    } catch (error) { 
      console.error(error); 
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
        console.error(error); 
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

          const activeProductsForUpdate = products.filter((product: any) => {
            const isStatusActive = product.status === 'Active' || product.status === 'ACTIVE';
            const isActive = product.isactive === true || product.isActive === true || product.active === true;
            return isStatusActive && isActive;
          });

          const sortedByDate = activeProductsForUpdate.sort((a: any, b: any) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return dateB - dateA; 
          });

          setRecentUpdates(sortedByDate.slice(0, 4));
          const newProducts = sortedByDate.filter((p: any) => (p.version ?? 1) === 1);
          setNewlyCreatedProducts(newProducts.slice(0, 6));
          try {
            const saved = localStorage.getItem('recentlyViewed');
            if (saved) {
              const parsedSaved = JSON.parse(saved);
              const syncedAndFilteredProducts = parsedSaved
                .map((savedItem: any) => {
                  const liveProduct = products.find((p: any) => p.id === savedItem.id);
                  return liveProduct || savedItem;
                })
                .filter((product: any) => {
                  const isStatusActive = product.status === 'Active' || product.status === 'ACTIVE';
                  const isActive = product.isactive === true || product.isActive === true || product.active === true;            
                  return isStatusActive && isActive;
                });              
              setRecentProducts(syncedAndFilteredProducts.slice(0, 6));
            }
          } catch (err) {
            console.error(err);
          }
        }
      } catch (error) { 
        console.error(error); 
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
      setShowDropdown(false);
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
        console.error(error); 
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
      <div className="hero-section flex flex-col items-center justify-center py-20 px-4 relative">
        <h1 className="text-[36px] font-bold text-[#211F26] leading-[1.2] mb-8 text-center">
          Tra cứu sản phẩm dịch vụ
        </h1>
        
        <div className="w-full max-w-3xl relative" ref={dropdownRef}>
          <form onSubmit={handleSearchSubmit} className="relative flex items-center z-20">
            <input 
              type="text" 
              placeholder="Tìm kiếm" 
              value={searchQuery} 
              onFocus={() => {
                if (searchQuery.trim()) setShowDropdown(true);
              }} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-6 pr-16 py-4 rounded-full border border-gray-200 text-lg focus:outline-none focus:ring-2 focus:ring-[#AE1C3F] focus:border-transparent text-gray-700 placeholder-gray-400 bg-white" 
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
              <div className="py-2 text-left">
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
                      searchResult.groups.map(item => (
                        <div 
                          key={item.id} 
                          className="px-4 py-2.5 cursor-pointer flex items-start gap-3 hover:bg-gray-50 transition-colors text-gray-800" 
                          onClick={() => handleNavigateFromDropdown('group', item.id)}
                        >
                          <span className="text-gray-400 flex-shrink-0 mt-0.5">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="3" width="7" height="7" rx="1" />
                              <rect x="14" y="3" width="7" height="7" rx="1" />
                              <rect x="14" y="14" width="7" height="7" rx="1" />
                              <rect x="3" y="14" width="7" height="7" rx="1" />
                            </svg>
                          </span>
                          <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-sm text-gray-800 truncate">
                              {highlightText(item.name, searchQuery)}
                            </span>
                            <span className="text-xs text-gray-400 mt-0.5">Nhóm sản phẩm</span>
                          </div>
                        </div>
                      ))
                    )}

                    {searchResult?.categories && searchResult.categories.length > 0 && (
                      searchResult.categories.map(item => (
                        <div 
                          key={item.id} 
                          className="px-4 py-2.5 cursor-pointer flex items-start gap-3 hover:bg-gray-50 transition-colors text-gray-800" 
                          onClick={() => handleNavigateFromDropdown('category', item.id)}
                        >
                          <span className="text-gray-400 flex-shrink-0 mt-0.5">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="8" y1="6" x2="21" y2="6" />
                              <line x1="8" y1="12" x2="21" y2="12" />
                              <line x1="8" y1="18" x2="21" y2="18" />
                              <line x1="3" y1="6" x2="3.01" y2="6" />
                              <line x1="3" y1="12" x2="3.01" y2="12" />
                              <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                          </span>
                          <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-sm text-gray-800 truncate">
                              {highlightText(item.name, searchQuery)}
                            </span>
                            <span className="text-xs text-gray-400 mt-0.5">Danh mục</span>
                          </div>
                        </div>
                      ))
                    )}

                    {searchResult?.businesses && searchResult.businesses.length > 0 && (
                      searchResult.businesses.map(item => (
                        <div 
                          key={item.id} 
                          className="px-4 py-2.5 cursor-pointer flex items-start gap-3 hover:bg-gray-50 transition-colors text-gray-800" 
                          onClick={() => handleNavigateFromDropdown('business', item.id)}
                        >
                          <span className="text-gray-400 flex-shrink-0 mt-0.5">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                              <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                          </span>
                          <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-sm text-gray-800 truncate">
                              {highlightText(item.name, searchQuery)}
                            </span>
                            <span className="text-xs text-gray-400 mt-0.5">Nghiệp vụ</span>
                          </div>
                        </div>
                      ))
                    )}

                    {searchResult?.products && searchResult.products.length > 0 && (
                      searchResult.products.map(item => (
                        <div 
                          key={item.id} 
                          className="px-4 py-2.5 cursor-pointer flex items-start gap-3 hover:bg-gray-50 transition-colors text-gray-800" 
                          onClick={() => handleNavigateFromDropdown('product', item.id)}
                        >
                          <span className="text-gray-400 flex-shrink-0 mt-0.5">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                              <line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                          </span>
                          <div className="flex flex-col text-left overflow-hidden">
                            <span className="text-sm text-gray-800 truncate">
                              {highlightText(item.name, searchQuery)}
                            </span>
                            <span className="text-xs text-gray-400 mt-0.5">Sản phẩm</span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
              
              {!loadingSearch && (
                <div 
                  className="px-4 py-3 border-t border-gray-100 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition-colors text-gray-800 rounded-b-xl" 
                  onClick={handleSearchSubmit}
                >
                  <span className="text-gray-400 flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                  <span className="text-sm text-gray-800">Tìm kiếm</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-6 self-stretch">
          {searchTags.map((tag, index) => (
            <button 
              key={index} 
              onClick={() => handleTagClick(tag)} 
              className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full text-[14px] font-normal leading-[24px] flex items-center justify-center gap-2 transition-colors border border-gray-200"
            >
              <img src={iconTimKiem} alt="search" className="w-[14px] h-[14px] flex-shrink-0" />
              <span>{tag}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full px-10 py-12">
        {categories.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center space-x-3 mb-6">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 17 17" 
                fill="none"
              >
                <path 
                  d="M0.75 5.75H15.75M0.75 10.75H15.75M4.75 0.75H11.75C13.1501 0.75 13.8502 0.75 14.385 1.02248C14.8554 1.26217 15.2378 1.64462 15.4775 2.11502C15.75 2.6498 15.75 3.34987 15.75 4.75V11.75C15.75 13.1501 15.75 13.8502 15.4775 14.385C15.2378 14.8554 14.8554 15.2378 14.385 15.4775C13.8502 15.75 13.1501 15.75 11.75 15.75H4.75C3.34987 15.75 2.6498 15.75 2.11502 15.4775C1.64462 15.2378 1.26217 14.8554 1.02248 14.385C0.75 13.8502 0.75 13.1501 0.75 11.75V4.75C0.75 3.34987 0.75 2.6498 1.02248 2.11502C1.26217 1.64462 1.64462 1.26217 2.11502 1.02248C2.6498 0.75 3.34987 0.75 4.75 0.75Z" 
                  stroke="#3C393F" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800">Danh mục nhóm sản phẩm</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedCategories.map((cat) => {
                const config = getCategoryConfig(cat.name); 
                const count = groupProductCounts[cat.id] || 0;
                
                const iconUrl = typeof config.icon === 'string' 
                  ? config.icon 
                  : (config.icon as any)?.default || (config.icon as any)?.src || '';

                return (
                  <div 
                    key={cat.id} 
                    onClick={() => handleCategoryClick(cat.id)} 
                    className="bg-white rounded-[12px] p-4 border border-gray-200 transition-all cursor-pointer flex flex-col justify-between h-[150px]"
                  >
                    <div 
                      className="w-[44px] h-[44px] rounded-[10px] flex items-center justify-center flex-shrink-0 mb-auto"
                      style={{ backgroundColor: config.bgColor }}
                    >
                      {iconUrl ? (
                        <div 
                          className="w-6 h-6"
                          style={{
                            backgroundColor: config.iconColor,
                            maskImage: `url("${iconUrl}")`,
                            maskRepeat: 'no-repeat',
                            maskPosition: 'center',
                            maskSize: 'contain',
                            WebkitMaskImage: `url("${iconUrl}")`,
                            WebkitMaskRepeat: 'no-repeat',
                            WebkitMaskPosition: 'center',
                            WebkitMaskSize: 'contain'
                          }}
                        />
                      ) : (
                        <svg width="24" height="24" fill="none" stroke={config.iconColor} strokeWidth="2.2" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v8M8 12h8" />
                        </svg>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1 w-full mt-auto">
                      <h3 className="font-semibold text-[14px] text-[#1A1A1A] leading-[20px] line-clamp-2 h-[40px]">
                        {cat.name}
                      </h3>
                      <p className="text-[12.5px] text-[#8C8C8C] font-normal">
                        {count} sản phẩm
                      </p>
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

        {newlyCreatedProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800">Sản phẩm mới tạo</h2>
            </div>
            
            <div className="products-grid">
              {newlyCreatedProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onClick={() => navigate(`/view/product-detail/${product.id}`)} 
                />
              ))}
            </div>
          </div>
        )}

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
                const isUpdated = (product.version ?? 1) > 1;
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
                    className="flex items-center justify-between p-4 bg-white rounded-[16px] border border-gray-100 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`px-4 py-1.5 text-xs font-semibold rounded-full w-[80px] text-center whitespace-nowrap ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                      
                      <div className="flex flex-col">
                        <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                          {product.name}
                        </h3>
                        <p className="text-[13px] text-gray-500 mt-1">
                          {categoryText} • {displayDate}
                        </p>
                      </div>
                    </div>
                    
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
      </div>
    </div>
  );
};

export default HomePage;