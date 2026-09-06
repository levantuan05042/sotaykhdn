
import React, { useState } from 'react';
import { toDisplayUrl } from '../../config/apiConfig';

interface ProductImageCardProps {
  imageUrl?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

export const ProductImageCard: React.FC<ProductImageCardProps> = ({
  imageUrl,
  className = '',
  style
}) => {
  const [imgError, setImgError] = useState(false);
  const displayUrl = toDisplayUrl(imageUrl);

  // Không có ảnh hoặc ảnh lỗi thì không hiển thị gì
  if (!displayUrl || imgError) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        ...style
      }}
    >
      <img
        src={displayUrl}
        alt="Ảnh sản phẩm"
        onError={() => setImgError(true)}
        style={{
          display: 'block',
          maxWidth: '100%',
          maxHeight: '260px',
          objectFit: 'contain',
          borderRadius: '8px'
        }}
      />
    </div>
  );
};

export default ProductImageCard;

