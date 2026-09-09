import React from 'react';
import { createPortal } from 'react-dom';

interface ActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => any;
  title: string;
  desc: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'draft' | 'submit' | 'delete';
  loading?: boolean;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  desc,
  confirmText,
  cancelText = 'Hủy',
  variant = 'submit',
  loading = false,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    if (variant === 'draft') {
      return (
        <div 
          className="confirm-toast-icon" 
          style={{ background: '#E0F2FE', color: '#0284C7', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
        </div>
      );
    }

    if (variant === 'delete') {
      return (
        <div 
          className="confirm-toast-icon" 
          style={{ background: '#FFF0F0', color: '#AE1C3F', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 17 19" fill="none">
            <path d="M0.835938 4.16829H2.5026M2.5026 4.16829H15.8359M2.5026 4.16829V15.835C2.5026 16.277 2.6782 16.7009 2.99076 17.0135C3.30332 17.326 3.72724 17.5016 4.16927 17.5016H12.5026C12.9446 17.5016 13.3686 17.326 13.6811 17.0135C13.9937 16.7009 14.1693 16.277 14.1693 15.835V4.16829H2.5026ZM5.0026 4.16829V2.50163C5.0026 2.0596 5.1782 1.63568 5.49076 1.32312C5.80332 1.01056 6.22724 0.834961 6.66927 0.834961H10.0026C10.4446 0.834961 10.8686 1.01056 11.1811 1.32312C11.4937 1.63568 11.6693 2.0596 11.6693 2.50163V4.16829M6.66927 8.33496V13.335M10.0026 8.33496V13.335" stroke="#AE1C3F" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      );
    }

    // Default: submit (gửi phê duyệt)
    return (
      <div 
        className="confirm-toast-icon" 
        style={{ background: '#FDEBEB', color: '#B01E3E', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" />
        </svg>
      </div>
    );
  };

  const defaultConfirmText = variant === 'draft' ? 'Lưu nháp' : variant === 'delete' ? 'Xóa' : 'Gửi phê duyệt';
  const displayConfirmText = confirmText || defaultConfirmText;

  const getConfirmBtnColor = () => {
    if (variant === 'draft') return '#0284C7';
    if (variant === 'delete') return '#AE1C3F';
    return '#B01E3E';
  };

  const content = (
    <div 
      className="confirm-toast-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        pointerEvents: 'auto',
        animation: 'actionModalFadeIn 0.2s ease-out',
      }}
    >
      <div 
        className="confirm-toast-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          border: '1px solid #E5E7EB',
          width: '380px',
          maxWidth: '90vw',
          gap: '20px',
          pointerEvents: 'auto',
          animation: 'actionModalPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="confirm-toast-body" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {getIcon()}
          <div className="confirm-toast-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p className="confirm-toast-title" style={{ margin: 0, color: '#1A191B', fontSize: '16px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
              {title}
            </p>
            <p className="confirm-toast-desc" style={{ margin: 0, color: '#6B7280', fontSize: '14px', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
              {desc}
            </p>
          </div>
        </div>
        <div className="confirm-toast-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            className="confirm-btn-delete"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: getConfirmBtnColor(),
              border: 'none',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
            }}
          >
            {loading ? 'Đang xử lý...' : displayConfirmText}
          </button>
          <button 
            className="confirm-btn-cancel" 
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid #D1D5DB',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            {cancelText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes actionModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes actionModalPopIn {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default ActionConfirmModal;
