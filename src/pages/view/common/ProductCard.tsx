import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../../../config/view/apiConfig';
import './ProductCard.css';

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
  viewCount?: number; 
  [key: string]: any;
}

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

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '---';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '---';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

const ProductCard = ({ product, onClick }: { product: ProductInfo; onClick: () => void }) => {
  const [imgError, setImgError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!checkIsLoggedIn()) return;
      try {
        const response = await fetch(`${BASE_URL}/api/saved-products/check?productId=${product.id}`, { credentials: 'include' });
        if (response.ok) setIsSaved(await response.json());
      } catch (error) {}
    };
    if (product.id) checkSavedStatus();
  }, [product.id]);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/view/product-detail/${product.id}`).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!checkIsLoggedIn()) return alert("Vui lòng đăng nhập để lưu sản phẩm!"); 
    try {
      const response = await fetch(`${BASE_URL}/api/saved-products/toggle?productId=${product.id}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include' 
      });
      if (response.ok) setIsSaved(await response.json());
    } catch (error) {}
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
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Tạo mới: {formatDate(product.createdAt)}</span>
        </div>

        <div className="product-footer">
          <div className="product-meta-row">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            {/* LẤY CẢ VIEWCOUNT VÀ VIEWS ĐỂ ĐẢM BẢO KHÔNG BỊ UNDEFINED */}
            <span>{product.viewCount ?? product.views ?? 0}</span>
          </div>

          <div className="product-actions" onClick={(e) => e.stopPropagation()}>
            <div className="product-share-wrapper">
              <button className="product-action-btn" onClick={handleCopyLink} title="Chia sẻ">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
              {isCopied && <span className="product-copied-tip">Đã copy</span>}
            </div>
            
            <button className={`product-action-btn ${isSaved ? 'saved-active' : ''}`} onClick={handleToggleSave} title="Lưu">
              <svg width="22" height="22" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;