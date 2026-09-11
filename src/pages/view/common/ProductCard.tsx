import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { BASE_URL } from '../../../config/view/apiConfig';
import { copyTextToClipboard, getViewProductShareUrl } from '../../../utils/clipboard';
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

const ProductCard = ({
  product,
  onClick,
  onUnsave,
  initiallySaved = false,
}: {
  product: ProductInfo;
  onClick: () => void;
  onUnsave?: (id: string) => void;
  initiallySaved?: boolean;
}) => {
  const [imgError, setImgError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(initiallySaved);
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const tooltipText = isCopied ? 'Đã copy' : (product.name || '');

  const updatePosition = useCallback(() => {
    const titleEl = titleRef.current || cardRef.current;
    if (!titleEl) return;

    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const textRects = Array.from(range.getClientRects());
    const lastLine = textRects[textRects.length - 1];
    const firstLine = textRects[0];
    const box = titleEl.getBoundingClientRect();
    const anchor = lastLine || box;

    const tooltipWidth = tooltipRef.current ? tooltipRef.current.offsetWidth : 100;
    const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 32;

    const textLeft = firstLine ? firstLine.left : box.left;
    const textRight = textRects.length
      ? Math.max(...textRects.map((r) => r.right))
      : box.right;
    let left = (textLeft + textRight) / 2 - tooltipWidth / 2;
    if (left + tooltipWidth > window.innerWidth - 12) left = window.innerWidth - tooltipWidth - 12;
    if (left < 12) left = 12;

    let top = anchor.bottom + 2;
    if (top + tooltipHeight > window.innerHeight - 8) {
      top = (firstLine || box).top - tooltipHeight - 2;
    }

    setCoords((prev) => {
      if (prev && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.left - left) < 0.5) return prev;
      return { top, left };
    });
  }, []);

  useLayoutEffect(() => {
    if (isHovered) updatePosition();
  }, [isHovered, tooltipText, updatePosition]);

  useEffect(() => {
    if (!isHovered) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [isHovered, updatePosition]);

  useEffect(() => {
    let isMounted = true;
    const checkSavedStatus = async () => {
      if (!checkIsLoggedIn()) return;
      if (initiallySaved) {
        if (isMounted) setIsSaved(true);
        return;
      }
      try {
        const response = await fetch(`${BASE_URL}/api/saved-products/check?productId=${product.id}`, { 
          credentials: 'include' 
        });
        if (response.ok) {
          const data = await response.json();
          if (isMounted) setIsSaved(data);
        }
      } catch (error) {
        console.error("Lỗi kiểm tra trạng thái lưu sản phẩm:", error);
      }
    };
    if (product.id) checkSavedStatus();
    
    return () => { isMounted = false; };
  }, [product.id, initiallySaved]);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const copied = await copyTextToClipboard(getViewProductShareUrl(product.id));
    if (!copied) return;
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!checkIsLoggedIn()) {
      alert("Vui lòng đăng nhập để lưu sản phẩm!");
      return; 
    }
    
    try {
      const response = await fetch(`${BASE_URL}/api/saved-products/toggle?productId=${product.id}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        credentials: 'include' 
      });
      if (response.ok) {
        const data = await response.json();
        setIsSaved(data);
        if (!data) onUnsave?.(product.id);
      }
    } catch (error) {
      console.error("Lỗi khi lưu/bỏ lưu sản phẩm:", error);
    }
  };

  const imageUrl = toDisplayUrl(product.imageUrl || product.image_url || product.image);
  const firstLetter = product.name?.trim()?.charAt(0)?.toUpperCase() || '?';
  const totalViews = product.viewCount ?? product.views ?? 0;

  return (
    <div
      ref={cardRef}
      className="product-card"
      data-product-id={product.id}
      onClick={onClick}
      onMouseEnter={() => {
        updatePosition();
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="product-img-wrapper">
        {imageUrl && !imgError ? (
          <img 
            src={imageUrl} 
            alt={product.name || 'Hình ảnh sản phẩm'} 
            loading="lazy" 
            onError={() => setImgError(true)} 
          />
        ) : (
          <div className="product-placeholder" style={{ backgroundColor: getColorFromText(product.name || '') }}>
            {firstLetter}
          </div>
        )}
      </div>
      
      <div className="product-info">
        <h4 ref={titleRef} className="product-title">{product.name}</h4>
        
        <div className="product-meta-row product-date">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Tạo mới: {formatDate(product.createdAt)}</span>
        </div>

        <div className="product-footer">
          <div className="product-meta-row">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            <span>{totalViews}</span>
          </div>

          <div className="product-actions" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="product-action-btn" onClick={handleCopyLink}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </button>
            
            <button type="button" className={`product-action-btn ${isSaved ? 'saved-active' : ''}`} onClick={handleToggleSave}>
              <svg width="22" height="22" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isHovered && tooltipText && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          className="custom-tooltip-portal"
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 2147483647 }}
        >
          {tooltipText}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProductCard;
