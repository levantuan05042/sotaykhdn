import React from 'react';

export const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT: { bg: '#BAE6FD', color: '#082F49', label: 'Lưu nháp' },
  REJECTED: { bg: '#eae7ec', color: '#65636d', label: 'Từ chối' },
  ACTIVE: { bg: '#e0f9ec', color: '#14532d', label: 'Hoàn thành' },
  PENDING_APPROVAL: { bg: '#fed7aa', color: '#7c2d12', label: 'Chờ duyệt' },
  NEEDS_REVISION: { bg: '#fff8b6', color: '#433d1f', label: 'Yêu cầu chỉnh sửa' },
  ARCHIVED: { bg: '#BAE6FD', color: '#0C4A6E', label: 'Lưu trữ' },
  REVIEWED: { bg: '#CCF4E0', color: '#053E2B', label: 'Đã review' }
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadgeListRequest: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const config = STATUS_MAP[status] || {
    bg: '#eae7ec',
    color: '#65636d',
    label: status || 'Không xác định'
  };

  return (
    <div
      className={`status-badge ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '9999px',
        padding: '4px 16px',
        height: '32px',
        fontFamily: "'Inter', sans-serif",
        fontSize: '14px',
        fontWeight: 500,
        lineHeight: '100%',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        gap: '6px' 
      }}
    >
      {status === 'REVIEWED' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="8 12 11 15 16 9"></polyline>
        </svg>
      )}
      <span>{config.label}</span>
    </div>
  );
};

export default StatusBadgeListRequest;