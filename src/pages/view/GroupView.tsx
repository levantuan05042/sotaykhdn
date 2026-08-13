import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS, BASE_URL } from '../../config/view/apiConfig';
import './GroupView.css';

// --- Interfaces ---
export interface ProductInfo {
  id: string;
  name: string;
  imageUrl?: string | null;
  image_url?: string | null;
  businessId?: string | null;
  businessName?: string | null;
  productCategoryId?: string | null;
  productCategoryName?: string | null;
  productGroupId?: string | null;
  productGroupName?: string | null;
  createdAt?: string | null;
  views?: number;
  [key: string]: any;
}

export interface CategoryItem {
  id: string;
  name: string;
  status?: string;
  businessCount?: number;
  productCount?: number;
  products?: ProductInfo[];
  product_list?: ProductInfo[];
  [key: string]: any;
}

export interface BusinessItem {
  id: string;
  name: string;
  status?: string;
  productCount?: number;
}

export interface GroupDetailData {
  groupId: string;
  groupName: string;
  categories: CategoryItem[];
  products?: ProductInfo[];
}

export interface CategoryDetailData {
  categoryId: string;
  categoryName: string;
  businesses: BusinessItem[];
  products?: ProductInfo[];
}

const toDisplayUrl = (raw?: string | null) => {
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${BASE_URL}${path}`;
};

const getTagLabel = (product: ProductInfo) => {
  return (
    product.businessName ||
    product.business_name ||
    product.productCategoryName ||
    product.product_category_name ||
    product.productGroupName ||
    product.product_group_name ||
    'Sản phẩm'
  );
};

const getColorFromText = (text: string) => {
  const colors = ['#AE1C3F', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0891B2', '#4F46E5', '#9333EA', '#EA580C'];
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// HÀM KIỂM TRA ĐĂNG NHẬP: Lấy thông tin thực tế từ Local Storage
const checkIsLoggedIn = () => {
  const username = localStorage.getItem('currentUserUsername');
  return !!username; 
};

// --- Components ---
const GridIcon = () => (
  <span className="group-title-icon">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  </span>
);

const ListIcon = () => (
  <svg className="list-row-icon" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const FileIcon = () => (
  <svg className="list-row-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg className="list-row-chevron" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }} viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const ProductCard = ({ product, tagLabel, onClick }: { product: ProductInfo; tagLabel: string; onClick: () => void }) => {
  const [imgError, setImgError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const imagePath = product.imageUrl || product.image_url || '';
  const imageUrl = toDisplayUrl(imagePath);
  const firstLetter = product.name?.trim()?.charAt(0)?.toUpperCase() || '?';
  const bgColor = getColorFromText(product.name || '');

  // 1. Kiểm tra trạng thái lưu
  useEffect(() => {
    const checkSavedStatus = async () => {
      const isLoggedIn = checkIsLoggedIn();
      if (!isLoggedIn) return;

      try {
        const response = await fetch(`${BASE_URL}/api/saved-products/check?productId=${product.id}`, {
          method: 'GET',
          credentials: 'include', 
        });

        if (response.ok) {
          const status = await response.json();
          setIsSaved(status); 
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra trạng thái lưu:", error);
      }
    };

    if (product.id) {
      checkSavedStatus();
    }
  }, [product.id]);

  // 2. Xử lý sự kiện sao chép link
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/view/product-detail/${product.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Sửa lại thành 2000ms cho mượt
    });
  };

  // 3. Xử lý sự kiện khi nhấn nút Lưu / Bỏ lưu
  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    
    const isLoggedIn = checkIsLoggedIn();
    if (!isLoggedIn) {
      alert("Vui lòng đăng nhập để lưu sản phẩm!"); 
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/api/saved-products/toggle?productId=${product.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', 
      });

      if (response.ok) {
        const result = await response.json(); 
        setIsSaved(result); 
      } else {
        console.error("Xử lý lưu thất bại. Mã lỗi:", response.status);
      }
    } catch (error) {
      console.error("Lỗi kết nối khi lưu:", error);
    }
  };

  return (
    <div className="product-card" onClick={onClick}>
      <div className="product-img-wrapper">
        {imageUrl && !imgError ? (
          <img src={imageUrl} alt={product.name} loading="lazy" onError={() => setImgError(true)} />
        ) : (
          <div className="product-placeholder" style={{ backgroundColor: bgColor }}>{firstLetter}</div>
        )}
      </div>
      <div className="product-info">
        <span className="product-tag">{tagLabel}</span>
        <h4 className="product-title">{product.name}</h4>
        <div className="product-footer">
          <div className="product-meta">
            <span className="meta-item">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {product.views ?? 0}
            </span>
            <span className="meta-item">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {product.createdAt ? new Date(product.createdAt).toLocaleDateString('vi-VN') : '---'}
            </span>
          </div>
          <div className="product-actions" onClick={(e) => e.stopPropagation()}>
            <div className="product-share-wrapper">
              <button className="product-action-btn" title="Chia sẻ" onClick={handleCopyLink}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
              {isCopied && <span className="product-copied-tip">Đã sao chép liên kết</span>}
            </div>

            <button 
              className={`product-action-btn ${isSaved ? 'saved-active' : ''}`} 
              title={isSaved ? "Bỏ lưu" : "Lưu"}
              onClick={handleToggleSave}
            >
              <svg 
                width="16" 
                height="16" 
                fill={isSaved ? "#2563EB" : "none"} 
                stroke={isSaved ? "#2563EB" : "currentColor"} 
                strokeWidth="2" 
                viewBox="0 0 24 24"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ListRowItem = ({ title, metaText, onClick, icon = 'list', nested = false, expandable = false, expanded = false, loading = false }: any) => (
  <div 
    className={`list-row-item${nested ? ' nested' : ''}${expanded ? ' expanded' : ''}`} 
    onClick={onClick} 
    role="button" 
    tabIndex={0} 
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
  >
    <div className="list-row-left">
      {icon === 'file' ? <FileIcon /> : <ListIcon />}
      <span className="list-row-title">{title}</span>
    </div>
    <div className="list-row-right">
      <div className="list-row-meta">{loading ? 'Đang tải...' : metaText}</div>
      {expandable && <ChevronIcon expanded={expanded} />}
    </div>
  </div>
);


// --- Main Component ---
const GroupView: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [groupData, setGroupData] = useState<GroupDetailData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryDetailData | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<{ id: string; name: string; products: ProductInfo[] } | null>(null);
  const [categoryLoadingId, setCategoryLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroupDetail = async () => {
      if (!groupId) return;
      setLoading(true);
      resetNavigation();
      try {
        const res = await axios.get<GroupDetailData>(API_ENDPOINTS.PRODUCT_GROUPS.DETAIL_FULL(groupId));
        setGroupData(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroupDetail();
  }, [groupId]);

  const handleSelectCategory = async (catId: string) => {
    if (selectedCategory?.categoryId === catId) {
      setSelectedCategory(null);
      setSelectedBusiness(null);
      return;
    }
    setCategoryLoadingId(catId);
    setSelectedBusiness(null);
    try {
      const res = await axios.get<CategoryDetailData>(API_ENDPOINTS.PRODUCT_CATEGORY.DETAIL_FULL(catId));
      setSelectedCategory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCategoryLoadingId(null);
    }
  };

  const handleSelectBusiness = async (busId: string, busName: string) => {
    setLoading(true);
    try {
      const res = await axios.get<ProductInfo[]>(API_ENDPOINTS.PRODUCT_BUSINESS.PRODUCTS(busId));
      setSelectedBusiness({ id: busId, name: busName, products: res.data || [] });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetNavigation = () => {
    setSelectedCategory(null);
    setSelectedBusiness(null);
    setCategoryLoadingId(null);
  };

  const goBackToCategory = () => setSelectedBusiness(null);

  if (loading && !groupData) {
    return (
      <div className="group-view">
        <div className="state-message">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="group-view">
        <div className="state-message">Không tìm thấy nhóm sản phẩm này.</div>
      </div>
    );
  }

  const currentGroupName = groupData.groupName || 'Chi tiết nhóm';
  const categories = groupData.categories || [];
  const groupProducts = groupData.products || [];

  return (
    <div className="group-view">
      <h2 className="group-page-title"><GridIcon /> {currentGroupName}</h2>
      
      {selectedBusiness && (
        <div className="group-breadcrumb">
          <button className="breadcrumb-link" onClick={resetNavigation}>{currentGroupName}</button>
          {selectedCategory && (
            <>
              <span className="breadcrumb-separator">/</span>
              <button className="breadcrumb-link" onClick={goBackToCategory}>{selectedCategory.categoryName}</button>
            </>
          )}
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{selectedBusiness.name}</span>
        </div>
      )}

      {loading && selectedBusiness ? (
        <div className="state-message">Đang tải...</div>
      ) : selectedBusiness ? (
        <div className="products-section">
          {selectedBusiness.products.length > 0 ? (
            <div className="products-grid">
              {selectedBusiness.products.map((prod) => (
                <ProductCard 
                  key={prod.id} 
                  product={prod} 
                  tagLabel={getTagLabel(prod)} 
                  // Đã thêm /view
                  onClick={() => navigate(`/view/product-detail/${prod.id}`)} 
                />
              ))}
            </div>
          ) : (
            <div className="state-message">Không có sản phẩm nào thuộc nghiệp vụ này.</div>
          )}
        </div>
      ) : (
        <>
          {categories.length === 0 && groupProducts.length === 0 ? (
            <div className="state-message">Nhóm này chưa có dữ liệu.</div>
          ) : categories.length === 0 ? (
            <div className="products-grid">
              {groupProducts.map((prod) => (
                <ProductCard 
                  key={prod.id} 
                  product={prod} 
                  tagLabel={getTagLabel(prod)} 
                  // Đã thêm /view
                  onClick={() => navigate(`/view/product-detail/${prod.id}`)} 
                />
              ))}
            </div>
          ) : (
            <>
              <div className="list-container">
                {categories.map((cat) => {
                  const isExpanded = selectedCategory?.categoryId === cat.id;
                  const catBusinesses = isExpanded ? (selectedCategory?.businesses || []) : [];
                  const catProducts = isExpanded ? (selectedCategory?.products || []) : [];
                  const hasBusinesses = catBusinesses.length > 0;
                  const metaText = `Danh mục • ${cat.businessCount ?? 0} nghiệp vụ, ${cat.productCount ?? 0} sản phẩm`;
                  
                  return (
                    <div className={`category-block ${isExpanded ? 'expanded' : ''}`} key={cat.id}>
                      <ListRowItem 
                        title={cat.name} 
                        metaText={metaText} 
                        icon="list" 
                        expandable={true} 
                        expanded={isExpanded} 
                        loading={categoryLoadingId === cat.id} 
                        onClick={() => handleSelectCategory(cat.id)} 
                      />
                      {isExpanded && hasBusinesses && (
                        <div className="nested-list">
                          {catBusinesses.map((bus) => (
                            <ListRowItem 
                              key={bus.id} 
                              title={bus.name} 
                              icon="file" 
                              nested 
                              metaText={`${bus.productCount ?? 0} sản phẩm`} 
                              onClick={() => handleSelectBusiness(bus.id, bus.name)} 
                            />
                          ))}
                        </div>
                      )}
                      {isExpanded && !hasBusinesses && catProducts.length > 0 && (
                        <div className="products-section" style={{ padding: '0 20px 20px 20px', backgroundColor: '#fff' }}>
                          <div className="products-grid">
                            {catProducts.map((prod) => (
                              <ProductCard 
                                key={prod.id} 
                                product={prod} 
                                tagLabel={getTagLabel(prod)} 
                                // Đã thêm /view
                                onClick={() => navigate(`/view/product-detail/${prod.id}`)} 
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {groupProducts.length > 0 && (
                <div className="products-section">
                  <div className="products-grid">
                    {groupProducts.map((prod) => (
                      <ProductCard
                        key={prod.id}
                        product={prod}
                        tagLabel={getTagLabel(prod)}
                        // Đã thêm /view
                        onClick={() => navigate(`/view/product-detail/${prod.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default GroupView;