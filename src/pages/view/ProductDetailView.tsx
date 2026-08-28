import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS, BASE_URL } from '../../config/view/apiConfig';
import './ProductDetailView.css';

// [SỬA LỖI]: Nâng cấp hàm getImageUrl để chống lỗi dữ liệu từ UAT
const getImageUrl = (path?: string | null) => {
  if (!path || path === 'null' || path === 'undefined') return '';

  let cleanUrl = path;

  // Xử lý trường hợp API UAT trả về chuỗi mảng JSON thay vì string tĩnh
  try {
    const parsed = JSON.parse(path);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cleanUrl = parsed[0];
    }
  } catch (e) {
    // Nếu không phải JSON string thì giữ nguyên
  }

  // Bỏ qua nếu đã là link tuyệt đối hoặc base64
  if (cleanUrl.startsWith('http') || cleanUrl.startsWith('data:image')) return cleanUrl;

  // Chuẩn hóa dấu '/' khi nối BASE_URL
  const baseUrlCleaned = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const urlCleaned = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;

  return `${baseUrlCleaned}${urlCleaned}`;
};

const stringToColor = (string: string) => {
  if (!string) return '#2563EB'; // Fallback an toàn
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substring(-2);
  }
  return color;
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '---';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  } catch (e) {
    return '---';
  }
};

const formatDateOnly = (dateStr?: string) => {
  if (!dateStr) return '---';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  } catch (e) {
    return '---';
  }
};

const checkIsLoggedIn = () => {
  const username = localStorage.getItem('currentUserUsername');
  return !!username; 
};

interface DetailItem {
  id: string;
  stt: number;
  tieuChi: string;
  noiDung: string;
  required?: boolean;
}

interface ProductData {
  id: string;
  name: string;
  imageUrl?: string | null;
  images?: string[] | string; // Cho phép dạng string trong trường hợp API trả về mảng JSON bị stringify
  details?: DetailItem[];
  productGroupName?: string;
  productGroupId?: string;
  productCategoryName?: string;
  productCategoryId?: string;
  groupName?: string;
  categoryName?: string;
  createdBy?: string | null;
  approvedBy?: string | null;
  version?: number | string;
  createdAt?: string;
  updatedAt?: string;
  views?: number;
  viewCount?: number;
  [key: string]: any;
}

const ProductDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [imgError, setImgError] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(() => {
    const savedDrawer = sessionStorage.getItem(`drawer-${id}`);
    return savedDrawer === 'true';
  });

  const shareTimeoutRef = useRef<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  // [SỬA LỖI]: Reset trạng thái lỗi ảnh mỗi khi chọn ảnh mới
  useEffect(() => {
    setImgError(false);
  }, [selectedImage]);

  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem(`scroll-${id}`, window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [id]);

  useEffect(() => {
    if (!loading && product) {
      const savedScroll = sessionStorage.getItem(`scroll-${id}`);
      if (savedScroll) {
        window.scrollTo(0, parseInt(savedScroll, 10));
      }
    }
  }, [loading, product, id]);

  useEffect(() => {
    sessionStorage.setItem(`drawer-${id}`, isMoreDrawerOpen.toString());
  }, [isMoreDrawerOpen, id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMoreDrawerOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(event.target as Node)
      ) {
        setIsMoreDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreDrawerOpen]);

  const saveToHistory = (prod: ProductData) => {
    const saved = localStorage.getItem('recentlyViewed');
    let history: any[] = saved ? JSON.parse(saved) : [];
    history = history.filter((item) => item.id !== prod.id);
    history.unshift({
      id: prod.id,
      name: prod.name,
      imageUrl: prod.imageUrl,
      categoryName: prod.productCategoryName || prod.categoryName,
      views: prod.views || prod.viewCount || 0,
      createdAt: prod.createdAt,
    });
    localStorage.setItem('recentlyViewed', JSON.stringify(history.slice(0, 6)));
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await axios.get(`${API_ENDPOINTS.PRODUCT.DETAIL(id)}?_t=${Date.now()}`);
        setProduct(res.data);
        saveToHistory(res.data);
        
        // Cập nhật selectedImage bằng dữ liệu thô ban đầu, logic bóc tách URL sẽ do getImageUrl lo
        if (res.data.imageUrl) {
          setSelectedImage(res.data.imageUrl);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/v1/products/${id}/view`, { method: 'POST', credentials: 'include' });
        if (response.ok) {
          setProduct((prev) => {
            if (!prev) return null;
            const currentViews = prev.views ?? prev.viewCount ?? 0;
            return { ...prev, views: currentViews + 1, viewCount: currentViews + 1 };
          });
        }
      } catch (err) {}
    }, 1);
    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!id || !checkIsLoggedIn()) return;
      try {
        const response = await fetch(`${BASE_URL}/api/saved-products/check?productId=${id}`, { method: 'GET', credentials: 'include' });
        if (response.ok) setIsSaved(await response.json());
      } catch (error) {}
    };
    checkSavedStatus();
  }, [id]);

  useEffect(() => {
    return () => {
      if (shareTimeoutRef.current) window.clearTimeout(shareTimeoutRef.current);
    };
  }, []);

  const handleToggleSave = async () => {
    if (!product) return;
    if (!checkIsLoggedIn()) {
      alert("Vui lòng đăng nhập để lưu sản phẩm!");
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/saved-products/toggle?productId=${product.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) setIsSaved(await response.json());
    } catch (error) {}
  };

  const handleShare = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch (err) {}
    setShareCopied(true);
    if (shareTimeoutRef.current) window.clearTimeout(shareTimeoutRef.current);
    shareTimeoutRef.current = window.setTimeout(() => setShareCopied(false), 1500);
  };

  const buildBreadcrumbs = () => {
    if (!product) return [];
    const items = [{ name: 'Trang chủ', type: 'home', id: null }];
    if (product.productGroupName || product.groupName) items.push({ name: product.productGroupName || product.groupName || '', type: 'groups', id: product.productGroupId || product.groupId });
    if (product.productCategoryName || product.categoryName) items.push({ name: product.productCategoryName || product.categoryName || '', type: 'category', id: product.productCategoryId || product.categoryId });
    if (product.name) items.push({ name: product.name, type: 'product', id: null });
    return items;
  };

  if (loading) return <div className="dp-container"><div className="dp-loading">Đang tải chi tiết sản phẩm...</div></div>;
  if (!product) return <div className="dp-container"><div className="dp-error">Không tìm thấy sản phẩm.</div></div>;

  // [SỬA LỖI]: Phân tích mảng ảnh an toàn nếu API trả về JSON string
  let parsedImagesArray: string[] = [];
  if (typeof product.images === 'string') {
    try {
      parsedImagesArray = JSON.parse(product.images);
    } catch (e) {
      // Ignored
    }
  } else if (Array.isArray(product.images)) {
    parsedImagesArray = product.images;
  }
  
  const allImages = [product.imageUrl, ...parsedImagesArray].filter(Boolean) as string[];
  const sortedDetails = [...(product.details || [])].sort((a, b) => a.stt - b.stt);
  const breadcrumbItems = buildBreadcrumbs();

  const displayBreadcrumbs = breadcrumbItems.length > 4 
    ? [breadcrumbItems[0], { name: '...', type: 'ellipsis', id: 'ellipsis' }, breadcrumbItems[breadcrumbItems.length - 2], breadcrumbItems[breadcrumbItems.length - 1]]
    : breadcrumbItems;

  return (
    <div className="dp-container">
      <div className={`dp-layout ${isMoreDrawerOpen ? 'sidebar-open' : ''}`}>
        
        <div className="dp-main-column">
          <div className="dp-top-row">
            <div className="dp-breadcrumb">
              {displayBreadcrumbs.map((item, index) => {
                const isLast = index === displayBreadcrumbs.length - 1;
                const isEllipsis = item.type === 'ellipsis';
                return (
                  <React.Fragment key={`${item.type}-${item.id || index}`}>
                    {isEllipsis ? <span className="dp-breadcrumb-ellipsis">...</span> : (
                      <button
                        className={`dp-breadcrumb-link ${isLast ? 'dp-active' : ''}`}
                        onClick={() => {
                          if (isLast) return;
                          if (item.type === 'home') navigate('/view');
                          else if (item.id) navigate(`/view/${item.type}/${item.id}`);
                        }}
                        disabled={isLast} 
                        title={item.name}
                      >
                        {item.type === 'home' && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '2px' }}>
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                          </svg>
                        )}
                        <span className="dp-breadcrumb-text">{item.name}</span>
                      </button>
                    )}
                    {!isLast && <span className="dp-breadcrumb-sep">/</span>}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="dp-actions">
              <button className={`dp-action-btn ${isSaved ? 'is-active' : ''}`} onClick={handleToggleSave}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span className="dp-action-label">Lưu sản phẩm</span>
              </button>

              <div className="dp-share-wrapper">
                <button className="dp-icon-btn" onClick={handleShare} title="Chia sẻ">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                </button>
                {shareCopied && <div className="dp-copied-tip">Đã sao chép liên kết</div>}
              </div>

              <button 
                ref={toggleBtnRef}
                className={`dp-icon-btn ${isMoreDrawerOpen ? 'active' : ''}`} 
                onClick={() => setIsMoreDrawerOpen(!isMoreDrawerOpen)}
                title="Thông tin hệ thống"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 4 15" 
                  fill="none"
                  style={{ width: '16px', height: '16px' }}
                >
                  <path d="M1.66927 8.33496C2.12951 8.33496 2.5026 7.96186 2.5026 7.50163C2.5026 7.04139 2.12951 6.66829 1.66927 6.66829C1.20903 6.66829 0.835938 7.04139 0.835938 7.50163C0.835938 7.96186 1.20903 8.33496 1.66927 8.33496Z" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1.66927 2.50163C2.12951 2.50163 2.5026 2.12853 2.5026 1.66829C2.5026 1.20806 2.12951 0.834961 1.66927 0.834961C1.20903 0.834961 0.835938 1.20806 0.835938 1.66829C0.835938 2.12853 1.20903 2.50163 1.66927 2.50163Z" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1.66927 14.1683C2.12951 14.1683 2.5026 13.7952 2.5026 13.335C2.5026 12.8747 2.12951 12.5016 1.66927 12.5016C1.20903 12.5016 0.835938 12.8747 0.835938 13.335C0.835938 13.7952 1.20903 14.1683 1.66927 14.1683Z" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="dp-product-header">
            <div className="dp-header-left">
              <div className="dp-header-thumbnail">
                {selectedImage && !imgError ? (
                  <img src={getImageUrl(selectedImage)} alt={product.name} onError={() => setImgError(true)} />
                ) : (
                  <div className="dp-fallback-img" style={{ background: stringToColor(product.name) }}>
                    {product.name ? product.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="dp-thumbnails">
                  {allImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      className={`dp-thumb ${selectedImage === img ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedImage(img);
                      }}
                    >
                      <img src={getImageUrl(img)} alt="" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dp-header-info">
              <h1 className="dp-product-title">{product.name}</h1>
              <div className="dp-product-meta">
                <span className="dp-badge-business">{product.productGroupName || product.groupName || 'Sản phẩm'}</span>
                <div className="dp-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  {formatDateOnly(product.createdAt)}
                </div>
                <div className="dp-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  {product.views || product.viewCount || 0} lượt xem
                </div>
              </div>
            </div>
          </div>

          {/* Bảng hiển thị thông tin sản phẩm */}
          <div className="dp-criteria-section">
            {sortedDetails.length > 0 ? (
              sortedDetails.map((detail, idx) => (
                <div className="dp-row" key={detail.id || idx}>
                  <div className="dp-label">{detail.tieuChi}</div>
                  <div className="dp-value" dangerouslySetInnerHTML={{ __html: detail.noiDung }} />
                </div>
              ))
            ) : (
              <div className="dp-empty">Chưa có thông tin chi tiết cho sản phẩm này.</div>
            )}
          </div>
        </div>

        {/* Sidebar Thông tin hệ thống */}
        <div className="dp-sidebar-wrapper" ref={sidebarRef}>
          <div className="dp-sidebar-inner">
            <h3 className="dp-sidebar-title">Thông tin hệ thống</h3>
            <div className="dp-sidebar-content">
              <div className="dp-info-row">
                <div className="dp-info-label">Phiên bản</div>
                <div className="dp-info-value">V{product.version || 1}</div>
              </div>
              <div className="dp-info-row">
                <div className="dp-info-label">Người tạo</div>
                <div className="dp-info-value">{product.createdBy || 'Hệ thống'}</div>
              </div>
              <div className="dp-info-row">
                <div className="dp-info-label">Thời gian tạo</div>
                <div className="dp-info-value">{formatDateTime(product.createdAt)}</div>
              </div>
              <div className="dp-info-row">
                <div className="dp-info-label">Người phê duyệt</div>
                <div className="dp-info-value">{product.approvedBy || '---'}</div>
              </div>
              <div className="dp-info-row">
                <div className="dp-info-label">Thời gian phê duyệt</div>
                <div className="dp-info-value">{formatDateTime(product.updatedAt)}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductDetailView;