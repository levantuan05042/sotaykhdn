import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onStay,
  onLeave,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onStay();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onStay]);

  if (!isOpen) return null;

  const content = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483647,
        animation: 'unsavedFadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          border: '1px solid #E5E7EB',
          width: '400px',
          maxWidth: '90vw',
          gap: '20px',
          animation: 'unsavedPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div
            style={{
              background: '#FEF3C7',
              color: '#D97706',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ margin: 0, color: '#1A191B', fontSize: '16px', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
              Bạn có chắc chắn muốn thoát khỏi trang?
            </p>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '14px', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
              Các thông tin bạn đã nhập sẽ không được lưu.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onStay}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid #D1D5DB',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Ở lại
          </button>
          <button
            type="button"
            onClick={onLeave}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#AE1C3F',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Thoát
          </button>
        </div>
      </div>
      <style>{`
        @keyframes unsavedFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes unsavedPopIn {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};

export default UnsavedChangesModal;
