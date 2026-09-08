import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ChildCounts {
  categories?: number;
  businesses?: number;
  products?: number;
  criteria?: number;
  total?: number;
  pendingOrRevisionCount?: number;
}

export interface CascadeHideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemTypeLabel: string;
  itemName: string;
  counts: ChildCounts;
  isProcessing?: boolean;
}

const buildHideSummary = (counts: ChildCounts): string => {
  const parts: string[] = [];
  if (counts.categories) parts.push(`${counts.categories} danh mục`);
  if (counts.businesses) parts.push(`${counts.businesses} nghiệp vụ`);
  if (counts.products) parts.push(`${counts.products} sản phẩm`);
  if (parts.length === 0) return 'Các thành phần bên trong sẽ được ẩn cùng lúc.';
  return `${parts.join(', ')} bên trong sẽ được ẩn cùng lúc`;
};

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
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
          borderRadius: '12px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18)',
          padding: '28px 32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '12px',
          animation: 'cascadePopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path
              d="M24 6L44 41H4L24 6Z"
              fill="#F5C518"
            />
            <path
              d="M24 19V28"
              stroke="#1A191B"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="24" cy="33.5" r="1.6" fill="#1A191B" />
          </svg>
        </div>

        <h3
          style={{
            margin: '4px 0 0',
            fontSize: '16px',
            fontWeight: 700,
            color: '#1A191B',
            lineHeight: 1.4,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Ẩn {itemTypeLabel} "{itemName}"
        </h3>

        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#6B7280',
            lineHeight: 1.5,
            fontFamily: 'Inter, sans-serif',
            maxWidth: '340px',
          }}
        >
          {buildHideSummary(counts)}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            marginTop: '8px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              color: '#AE1C3F',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#AE1C3F',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.7 : 1,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {isProcessing ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cascadeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cascadePopIn {
          from { opacity: 0; transform: scale(0.96) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );

  return createPortal(modalNode, document.body);
};

export default CascadeHideModal;
