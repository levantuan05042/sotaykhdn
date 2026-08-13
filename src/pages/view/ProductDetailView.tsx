import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS, BASE_URL } from '../../config/view/apiConfig';
import './ProductDetailView.css';

// --- UTILS ---
const getImageUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

const stringToColor = (string: string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
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

// Hàm kiểm tra đăng nhập
const checkIsLoggedIn = () => {
  const username = localStorage.getItem('currentUserUsername');
  return !!username; 
};

// --- INTERFACES ---
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
  images?: string[];
  details?: DetailItem[];
  productGroupName?: string;
  productGroupId?: string;
  productCategoryName?: string;
  productCategoryId?: string;
  groupName?: string;
  categoryName?: string;
  businessName?: string;
  businessId?: string;
  createdBy?: string | null;
  approvedBy?: string | null;
  version?: number | string;
  createdAt?: string;
  updatedAt?: string;
  views?: number;
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
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const shareTimeoutRef = useRef<number | null>(null);

  const saveToHistory = (prod: ProductData) => {
    const saved = localStorage.getItem('recentlyViewed');
    let history: any[] = saved ? JSON.parse(saved) : [];
    
    history = history.filter((item) => item.id !== prod.id);
    
    history.unshift({
      id: prod.id,
      name: prod.name,
      imageUrl: prod.imageUrl,
      categoryName: prod.productCategoryName || prod.categoryName,
      views: prod.views || 0,
      createdAt: prod.createdAt,
    });
    
    const newHistory = history.slice(0, 6);
    localStorage.setItem('recentlyViewed', JSON.stringify(newHistory));
  };

  // 1. Fetch thông tin sản phẩm
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await axios.get(API_ENDPOINTS.PRODUCT.DETAIL(id));
        setProduct(res.data);
        saveToHistory(res.data);
        if (res.data.imageUrl) setSelectedImage(res.data.imageUrl);
      } catch (err) {
        console.error("Lỗi lấy dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // 2. Fetch trạng thái đã lưu qua API
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!id) return;
      const isLoggedIn = checkIsLoggedIn();
      if (!isLoggedIn) return;

      try {
        const response = await fetch(`${BASE_URL}/api/saved-products/check?productId=${id}`, {
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
    
    checkSavedStatus();
  }, [id]);

  useEffect(() => {
    return () => {
      if (shareTimeoutRef.current) window.clearTimeout(shareTimeoutRef.current);
    };
  }, []);

  // 3. Xử lý Toggle Save/Unsave qua API
  const handleToggleSave = async () => {
    if (!product) return;

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

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch (err) {
      console.error('Không thể sao chép liên kết:', err);
    }
    setShareCopied(true);
    if (shareTimeoutRef.current) window.clearTimeout(shareTimeoutRef.current);
    shareTimeoutRef.current = window.setTimeout(() => setShareCopied(false), 1500);
  };

  if (loading) {
    return (
      <div className="dp-container">
        <div className="dp-loading">Đang tải chi tiết sản phẩm...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="dp-container">
        <div className="dp-error">Không tìm thấy sản phẩm.</div>
      </div>
    );
  }

  const allImages = [product.imageUrl, ...(product.images || [])].filter(Boolean) as string[];
  const sortedDetails = [...(product.details || [])].sort((a, b) => a.stt - b.stt);

  const breadcrumbItems = [
    {
      name: product.productGroupName || product.groupName,
      id: product.productGroupId || product.groupId,
      type: 'groups',
    },
    {
      name: product.productCategoryName || product.categoryName,
      id: product.productCategoryId || product.categoryId,
      type: 'category',
    },
    {
      name: product.businessName,
      id: product.businessId,
      type: 'business',
    },
  ].filter((item) => item.name); 

  return (
    <div className="dp-container">
      <div className="dp-top-row">
        <div className="dp-breadcrumb">
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={`${item.type}-${item.id || index}`}>
              <button
                className="dp-breadcrumb-link"
                onClick={() => item.id && navigate(`/${item.type}/${item.id}`)}
              >
                {item.name}
              </button>
              {index < breadcrumbItems.length - 1 && (
                <span className="dp-breadcrumb-sep"> &gt; </span>
              )}
            </React.Fragment>
          ))}
          {breadcrumbItems.length === 0 && (
            <button className="dp-breadcrumb-link" onClick={() => navigate(-1)}>
              Danh sách sản phẩm
            </button>
          )}
        </div>

        <div className="dp-actions">
          <button
            className={`dp-action-btn ${isSaved ? 'is-active' : ''}`}
            onClick={handleToggleSave}
            aria-label={isSaved ? 'Đã lưu' : 'Lưu sản phẩm'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span className="dp-action-label">{isSaved ? 'Đã lưu' : 'Lưu sản phẩm'}</span>
          </button>

          <div className="dp-share-wrapper">
            <button className="dp-action-btn" onClick={handleShare} aria-label="Chia sẻ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span className="dp-action-label">Chia sẻ</span>
            </button>
            {shareCopied && <span className="dp-copied-tip">Đã sao chép liên kết</span>}
          </div>

          <button className="dp-icon-btn" onClick={() => setIsMoreDrawerOpen(true)} aria-label="Thêm tùy chọn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
          </button>
        </div>
      </div>

      <h1 className="dp-product-title">{product.name}</h1>

      <div className="dp-main-content">
        <div className="dp-image-section">
          <div className="dp-image-container">
            <div className="dp-main-image-box">
              {imgError || allImages.length === 0 || !selectedImage ? (
                <div
                  className="dp-fallback-img"
                  style={{ 
                    backgroundColor: stringToColor(product.name), 
                    color: '#fff', 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '80px', 
                    fontWeight: 'bold' 
                  }}
                >
                  {product.name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <img
                  src={getImageUrl(selectedImage)}
                  alt={product.name}
                  onError={() => setImgError(true)}
                />
              )}
            </div>
          </div>
          {allImages.length > 1 && (
            <div className="dp-thumbnails">
              {allImages.map((img, idx) => (
                <div
                  key={idx}
                  className={`dp-thumb ${selectedImage === img ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedImage(img);
                    setImgError(false);
                  }}
                >
                  <img src={getImageUrl(img)} alt="thumbnail" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dp-criteria-section">
          {sortedDetails.length > 0 ? (
            sortedDetails.map((d) => (
              <div key={d.id} className="dp-row">
                <div className="dp-label">
                  {d.tieuChi} 
                </div>
                <div className="dp-value" dangerouslySetInnerHTML={{ __html: d.noiDung }} />
              </div>
            ))
          ) : (
            <p className="dp-empty">Chưa có thông số chi tiết.</p>
          )}
        </div>
      </div>

      {isMoreDrawerOpen && (
        <>
          <div className="dp-drawer-overlay" onClick={() => setIsMoreDrawerOpen(false)} />
          <div className="dp-info-drawer">
            <div className="dp-drawer-header">
              <h3>Thông tin sản phẩm</h3>
              <button className="dp-close-btn" onClick={() => setIsMoreDrawerOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="dp-drawer-content">
              <div className="dp-info-item">
                <label>Tên sản phẩm</label>
                <p>{product.name}</p>
              </div>

              {(product.productGroupName || product.groupName) && (
                <div className="dp-info-item">
                  <label>Nhóm sản phẩm</label>
                  <p>{product.productGroupName || product.groupName}</p>
                </div>
              )}

              {(product.productCategoryName || product.categoryName) && (
                <div className="dp-info-item">
                  <label>Danh mục sản phẩm</label>
                  <p>{product.productCategoryName || product.categoryName}</p>
                </div>
              )}

              {product.businessName && (
                <div className="dp-info-item">
                  <label>Nghiệp vụ</label>
                  <p>{product.businessName}</p>
                </div>
              )}

              <div className="dp-info-item">
                <label>Người tạo</label>
                <p>{product.createdBy || '---'}</p>
              </div>

              <div className="dp-info-item">
                <label>Người kiểm duyệt</label>
                <p>{product.approvedBy || '---'}</p>
              </div>

              <div className="dp-info-item">
                <label>Phiên bản</label>
                <p>
                  {product.version !== undefined && product.version !== null
                    ? typeof product.version === 'number'
                      ? `Phiên bản ${product.version}`
                      : product.version
                    : '1.0.0'}
                </p>
              </div>

              <div className="dp-info-item">
                <label>Ngày tạo</label>
                <p>{formatDateTime(product.createdAt)}</p>
              </div>

              <div className="dp-info-item">
                <label>Lần cập nhật cuối cùng</label>
                <p>{formatDateTime(product.updatedAt || product.createdAt)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductDetailView;