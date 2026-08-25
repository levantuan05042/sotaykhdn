import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BASE_URL } from '../../config/view/apiConfig';
// Tái sử dụng lại CSS chung của layout
import './GroupView.css';

// --- Interfaces ---
export interface ProductInfo {
  id: string;
  name: string;
  imageUrl?: string | null;
  image_url?: string | null;
  createdAt?: string | null;
  viewCount?: number;
  [key: string]: any;
}

// --- Helper Functions ---
const toDisplayUrl = (raw?: string | null) => {
  if (!raw) return '';
  if (raw.startsWith('http')) return raw;
  return `${BASE_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;
};

const getColorFromText = (text: string) => {
  const colors = ['#AE1C3F', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0891B2', '#4F46E5', '#9333EA', '#EA580C'];
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const checkIsLoggedIn = () => !!localStorage.getItem('currentUserUsername');

// --- Product Card Component ---
const ProductCard = ({ product, onClick, onUnsave }: { product: ProductInfo; onClick: () => void; onUnsave: (id: string) => void }) => {
  const [imgError, setImgError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(true); // Ở trang này mặc định sản phẩm đã được lưu

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/view/product-detail/${product.id}`).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!checkIsLoggedIn()) return alert("Vui lòng đăng nhập!"); 
    try {
      const response = await fetch(`${BASE_URL}/api/saved-products/toggle?productId=${product.id}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include' 
      });
      if (response.ok) {
        const newState = await response.json();
        setIsSaved(newState);
        if (!newState) {
          // Bỏ lưu thì tự động loại khỏi danh sách hiển thị ngay lập tức
          onUnsave(product.id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const imageUrl = toDisplayUrl(product.imageUrl || product.image_url);
  const firstLetter = product.name?.trim()?.charAt(0)?.toUpperCase() || '?';

  return (
    <div className="product-card" onClick={onClick}>
      <div className="product-img-wrapper">
        {imageUrl && !imgError ? (
          <img src={imageUrl} alt={product.name} loading="lazy" onError={() => setImgError(true)} />
        ) : (
          <div className="product-placeholder" style={{ backgroundColor: getColorFromText(product.name || '') }}>{firstLetter}</div>
        )}
      </div>
      <div className="product-info">
        <h4 className="product-title" title={product.name}>{product.name}</h4>
        
        <div className="product-meta-row product-date">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Tạo mới: {product.createdAt ? new Date(product.createdAt).toLocaleDateString('vi-VN') : '---'}</span>
        </div>

        <div className="product-footer">
          <div className="product-meta-row">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span>{product.viewCount ?? product.views ?? 0}</span> {/* Read viewCount từ DTO */}
          </div>

          <div className="product-actions" onClick={(e) => e.stopPropagation()}>
            <button className="product-action-btn" onClick={handleCopyLink} title="Chia sẻ">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
            <button className={`product-action-btn ${isSaved ? 'saved-active' : ''}`} onClick={handleToggleSave} title="Lưu">
              <svg width="16" height="16" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component: SavedProductsView ---
const SavedProductsView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [products, setProducts] = useState<ProductInfo[]>([]);

  useEffect(() => {
    const fetchSavedProducts = async () => {
      setLoading(true);
      try {
        // Gọi API lấy danh sách sản phẩm đã lưu
        const res = await axios.get(`${BASE_URL}/api/saved-products/list`);
        setProducts(res.data || []);
      } catch (error) {
        console.error("Lỗi khi tải danh sách sản phẩm đã lưu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedProducts();
  }, []);

  const handleNavigate = (id: string) => navigate(`/view/product-detail/${id}`);

  // Hàm xử lý khi người dùng bỏ lưu 1 sản phẩm trên lưới
  const handleUnsave = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  if (loading) return <div className="group-view"><div className="state-message">Đang tải dữ liệu...</div></div>;

  return (
    <div className="group-view">
      
      {/* Tiêu đề trang & Bộ đếm số lượng sản phẩm góc phải */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 className="group-page-title" style={{ margin: 0 }}>Sản phẩm đã lưu</h2>
        <span style={{ color: '#6B7280', fontSize: '36px', fontWeight: 500 }}>
          {products.length} sản phẩm
        </span>
      </div>

      {/* Lưới hiển thị danh sách sản phẩm đã lưu */}
      {products.length > 0 ? (
        <div className="section-block" style={{ margin: 0 }}>
          <div className="products-grid">
            {products.map((prod) => (
              <ProductCard 
                key={prod.id} 
                product={prod} 
                onClick={() => handleNavigate(prod.id)} 
                onUnsave={handleUnsave}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="state-message">Bạn chưa lưu sản phẩm nào.</div>
      )}
    </div>
  );
};

export default SavedProductsView;