import React, { useState } from 'react';
import { toDisplayUrl } from '../../config/apiConfig';

interface ProductImageCardProps {
  imageUrl?: string | null;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ProductImageCard: React.FC<ProductImageCardProps> = ({
  imageUrl,
  title = 'Hình ảnh',
  className = '',
  style
}) => {
  const [imgError, setImgError] = useState(false);
  const displayUrl = toDisplayUrl(imageUrl);

  return (
    <div
      className={`product-image-card-container ${className}`}
      style={{
        backgroundColor: 'transparent',
        borderRadius: 0,
        border: 'none',
        boxShadow: 'none',
        padding: 0,
        boxSizing: 'border-box',
        width: '100%',
        margin: 0,
        ...style
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 500,
            lineHeight: '24px',
            color: '#404040'
          }}
        >
          {title}
        </h3>
      </div>

      <div
        style={{
          border: '1px solid #E3DFE6',
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '140px',
          boxSizing: 'border-box',
          width: '100%'
        }}
      >
        {displayUrl && !imgError ? (
          <img
            src={displayUrl}
            alt="Ảnh sản phẩm"
            onError={() => setImgError(true)}
            style={{
              maxHeight: '260px',
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#D1FAE5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <span
              style={{
                fontSize: '14px',
                color: '#6B7280',
                fontWeight: 500
              }}
            >
              Ảnh
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageCard;
