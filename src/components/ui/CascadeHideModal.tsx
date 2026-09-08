import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ChildCounts {
  categories?: number;
  businesses?: number;
  products?: number;
  criteria?: number;
  total?: number;
}

export interface CascadeHideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemTypeLabel: string; // e.g. "nhóm sản phẩm", "danh mục", "nghiệp vụ", "tiêu chí"
  itemName: string;
  counts: ChildCounts;
  isProcessing?: boolean;
}

export const CascadeHideModal: React.FC<CascadeHideModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemTypeLabel,
  itemName,
  counts,
  isProcessing = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isProcessing]);

  if (!isOpen) return null;

  const modalNode = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'cascadeFadeIn 0.2s ease-out',
      }}
      onClick={() => {
        if (!isProcessing) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '520px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'cascadePopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111827', lineHeight: '1.35' }}>
              Xác nhận ẩn {itemTypeLabel}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
              "{itemName}"
            </p>
          </div>
        </div>

        {/* Content & Details list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
            Đối tượng này hiện đang có các thành phần trực thuộc đang hoạt động:
          </p>

          <div
            style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {counts.categories !== undefined && counts.categories > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#92400E', fontWeight: 500 }}>📁 Danh mục sản phẩm:</span>
                <span style={{ fontWeight: 700, color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '4px' }}>
                  {counts.categories}
                </span>
              </div>
            )}
            {counts.businesses !== undefined && counts.businesses > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#92400E', fontWeight: 500 }}>📑 Mảng nghiệp vụ:</span>
                <span style={{ fontWeight: 700, color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '4px' }}>
                  {counts.businesses}
                </span>
              </div>
            )}
            {counts.products !== undefined && counts.products > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#92400E', fontWeight: 500 }}>📦 Sản phẩm:</span>
                <span style={{ fontWeight: 700, color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '4px' }}>
                  {counts.products}
                </span>
              </div>
            )}
            {counts.criteria !== undefined && counts.criteria > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#92400E', fontWeight: 500 }}>📋 Tiêu chí áp dụng:</span>
                <span style={{ fontWeight: 700, color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '4px' }}>
                  {counts.criteria}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#166534',
              lineHeight: '1.5',
            }}
          >
            <strong>Lưu ý:</strong> Khi xác nhận ẩn, các thành phần trực thuộc vẫn hiện trong danh sách quản trị (tối màu, chỉ xem, không sửa). Chúng không xuất hiện ở kênh tra cứu. Khi bạn hiển thị lại {itemTypeLabel} này, hệ thống sẽ phục hồi đúng trạng thái hiệu lực trước khi ẩn.
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '9px 18px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isProcessing) e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              if (!isProcessing) e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            Hủy
          </button>

          <button
            onClick={onConfirm}
            disabled={isProcessing}
            style={{
              padding: '9px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!isProcessing) e.currentTarget.style.backgroundColor = '#B45309';
            }}
            onMouseLeave={(e) => {
              if (!isProcessing) e.currentTarget.style.backgroundColor = '#D97706';
            }}
          >
            {isProcessing ? 'Đang xử lý...' : 'Xác nhận ẩn tất cả'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cascadeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cascadePopIn {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );

  return createPortal(modalNode, document.body);
};

export default CascadeHideModal;
