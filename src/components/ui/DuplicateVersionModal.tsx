import React from 'react';

export interface PriorVersionInfo {
  id: string;
  version?: number | null;
  status: string;
  name?: string;
  createdBy?: string;
  createdByFullName?: string;
  createdAt?: string;
}

interface DuplicateVersionModalProps {
  isOpen: boolean;
  itemName?: string;
  priorVersion: PriorVersionInfo | null;
  canReplace?: boolean;
  onConfirm?: () => void;
  onCancel: () => void;
  onViewPrior: () => void;
  isProcessing?: boolean;
}

export const DuplicateVersionModal: React.FC<DuplicateVersionModalProps> = ({
  isOpen,
  itemName = 'mục này',
  priorVersion,
  canReplace = false,
  onConfirm,
  onCancel,
  onViewPrior,
  isProcessing = false,
}) => {
  const openedAtRef = React.useRef(0);
  const confirmingRef = React.useRef(false);

  React.useEffect(() => {
    if (isOpen) {
      openedAtRef.current = Date.now();
      confirmingRef.current = false;
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onCancel]);

  if (!isOpen || !priorVersion) return null;

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Lưu nháp';
      case 'PENDING_APPROVAL':
        return 'Chờ phê duyệt';
      case 'ACTIVE':
        return 'Đang áp dụng';
      case 'REJECTED':
        return 'Bị từ chối';
      case 'NEEDS_REVISION':
        return 'Yêu cầu chỉnh sửa';
      case 'ARCHIVED':
        return 'Lưu trữ';
      default:
        return status;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes} ngày ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const statusLabel = getStatusText(priorVersion.status);
  const creatorLabel = priorVersion.createdByFullName || 'Người dùng hệ thống';
  const timeLabel = formatDateTime(priorVersion.createdAt);

  return (
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        animation: 'dupModalFadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing && Date.now() - openedAtRef.current >= 400) {
          onCancel();
        }
      }}
    >
      <div 
        className="modal-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'dupModalPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px 24px 16px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div 
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 600, color: '#111827' }}>
              {canReplace ? 'Thông báo phiên bản đã tồn tại' : 'Không thể tạo phiên bản mới'}
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#4B5563', lineHeight: 1.5 }}>
              {canReplace
                ? <>Hệ thống ghi nhận đã có phiên bản mới hơn của <strong style={{ color: '#111827' }}>{itemName}</strong> đang ở trạng thái <strong style={{ color: '#AE1C3F' }}>{statusLabel}</strong></>
                : <>Đã có phiên bản mới hơn của <strong style={{ color: '#111827' }}>{itemName}</strong> đang ở trạng thái <strong style={{ color: '#AE1C3F' }}>{statusLabel}</strong></>
              }
              {creatorLabel && <> (tạo bởi <strong style={{ color: '#111827' }}>{creatorLabel}</strong>{timeLabel ? ` lúc ${timeLabel}` : ''})</>}.
            </p>
            <p style={{ margin: '12px 0 0', fontSize: '14px', fontWeight: 500, color: '#1F2937' }}>
              {canReplace
                ? 'Bạn có muốn xóa để lấy cái bạn đang làm không?'
                : 'Không thể tạo thêm phiên bản mới khi phiên bản này chưa được duyệt xong.'}
            </p>
          </div>
        </div>

        <div 
          style={{
            padding: '16px 24px',
            backgroundColor: '#F9FAFB',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 500,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              opacity: isProcessing ? 0.6 : 1,
            }}
          >
            {canReplace ? 'Hủy' : 'Đóng'}
          </button>
          
          <button
            type="button"
            onClick={onViewPrior}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #93C5FD',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 10s3-6 9-6 9 6 9 6-3 6-9 6-9-6-9-6z" />
              <circle cx="10" cy="10" r="3" />
            </svg>
            {canReplace ? 'Xem cái sinh trước' : 'Xem phiên bản đang xử lý'}
          </button>

          {canReplace && (
            <button
              type="button"
              onClick={() => {
                if (isProcessing || confirmingRef.current || !onConfirm) return;
                confirmingRef.current = true;
                onConfirm();
              }}
              disabled={isProcessing}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#AE1C3F',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              {isProcessing ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes dupModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dupModalPopIn {
          from { opacity: 0; transform: scale(0.95) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DuplicateVersionModal;
