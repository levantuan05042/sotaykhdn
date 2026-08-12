import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './GroupView.css'; 
import { BASE_URL } from '../../config/view/apiConfig';

const toDisplayUrl = (raw?: string | null) => {
  if (!raw) return '';
  if (raw.startsWith('http')) {
    return raw;
  }
  const path = raw.startsWith('/')
    ? raw
    : `/${raw}`;
  return `${BASE_URL}${path}`;
};


const getColorFromText = (text: string) => {
  const colors = ['#AE1C3F', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0891B2', '#4F46E5', '#9333EA', '#EA580C'];
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// --- Interface ---
interface Product {
  id: string;
  name: string;
  imageUrl?: string | null;
  image_url?: string | null;
  categoryName?: string;
  views?: number;
  createdAt?: string | null;
  [key: string]: any;
}

const ProductCard = ({ product, tagLabel, onClick }: { product: Product; tagLabel: string; onClick: () => void }) => {
  const [imgError, setImgError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const imagePath = product.imageUrl || product.image_url || '';
  const imageUrl = toDisplayUrl(imagePath);
  const firstLetter = product.name?.trim()?.charAt(0)?.toUpperCase() || '?';
  const bgColor = getColorFromText(product.name || '');

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/product-detail/${product.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 123);
    });
  };

  return (
    <div className="product-card glass-card" onClick={onClick}>
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
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              {product.views ?? 0}
            </span>
            <span className="meta-item">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
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

            <button className="product-action-btn" title="Lưu">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadRecentViewed = () => {
      try {
        const saved = localStorage.getItem('recentlyViewed');
        if (saved) {
          const parsed = JSON.parse(saved);
          setRecentProducts(parsed.slice(0, 6)); 
        }
      } catch (error) {
        console.error("Lỗi khi đọc lịch sử:", error);
      }
    };

    loadRecentViewed();
  }, [location]); 

  return (
    <div className="homepage">
      <div className="hero-section">
        <h1 className="hero-title">
          Tra cứu sản phẩm dịch vụ
        </h1>
        <p className="hero-subtitle">dành cho khách hàng doanh nghiệp</p>
      </div>
      {recentProducts.length > 0 && (
        <div className="px-8 -mt-12 mb-12 relative z-10">
          <div className="flex items-center space-x-2 mb-6 text-gray-700 font-semibold text-lg">
             <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16.5"
              height="13.5"
              viewBox="0 0 18 15"
              fill="none"
            >
              <path
                d="M5.25 5.99823H0.75V1.49823M0.75 5.99823L4.23 2.72823C5.03606 1.92176 6.03328 1.33263 7.12861 1.01581C8.22393 0.698982 9.38167 0.664789 10.4938 0.916419C11.6059 1.16805 12.6361 1.6973 13.4884 2.45479C14.3407 3.21228 14.9871 4.17331 15.3675 5.24823M12.75 8.99823H17.25V13.4982M17.25 8.99823L13.77 12.2682C12.9639 13.0747 11.9667 13.6638 10.8714 13.9806C9.77607 14.2975 8.61833 14.3317 7.50621 14.08C6.3941 13.8284 5.36385 13.2991 4.5116 12.5417C3.65935 11.7842 3.01288 10.8231 2.6325 9.74823"
                stroke="#3C393F"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h2
              style={{
                color: "#3C393F",
                fontFamily: "Inter",
                fontSize: "20px",
                fontStyle: "normal",
                fontWeight: 600,
                lineHeight: "30px",
              }}
            >
              Đã xem gần đây
            </h2>
          </div>

          <div className="products-grid">
            {recentProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                tagLabel={product.categoryName || 'Sản phẩm'}
                onClick={() => navigate(`/product-detail/${product.id}`)} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;