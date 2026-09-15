import React from 'react';
import type { ProductsViewMode } from '../../hooks/useProductsViewMode';
import './ProductsViewToggle.css';

type ProductsViewToggleProps = {
  value: ProductsViewMode;
  onChange: (mode: ProductsViewMode) => void;
  className?: string;
};

const ProductsViewToggle: React.FC<ProductsViewToggleProps> = ({ value, onChange, className = '' }) => {
  return (
    <div className={`products-view-toggle ${className}`.trim()} role="group" aria-label="Kiểu hiển thị sản phẩm">
      <button
        type="button"
        className={`products-view-toggle-btn${value === 'grid' ? ' is-active' : ''}`}
        onClick={() => onChange('grid')}
        title="Dạng lưới"
        aria-label="Dạng lưới"
        aria-pressed={value === 'grid'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      </button>
      <button
        type="button"
        className={`products-view-toggle-btn${value === 'list' ? ' is-active' : ''}`}
        onClick={() => onChange('list')}
        title="Dạng danh sách"
        aria-label="Dạng danh sách"
        aria-pressed={value === 'list'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </div>
  );
};

export default ProductsViewToggle;
