import React from 'react';
import './StatusBadge.css';

export type StatusType = 'PENDING' | 'COMPLETED' | 'REVISION' | 'REJECTED' | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const STATUS_MAP: Record<string, { label: string; variant: string }> = {
  PENDING: { label: 'Chờ duyệt', variant: 'pending' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', variant: 'pending' },
  COMPLETED: { label: 'Hoàn thành', variant: 'completed' },
  ACTIVE: { label: 'Hoàn thành', variant: 'completed' },
  APPROVED: { label: 'Hoàn thành', variant: 'completed' },
  REVISION: { label: 'Yêu cầu chỉnh sửa', variant: 'revision' },
  NEEDS_REVISION: { label: 'Yêu cầu chỉnh sửa', variant: 'revision' },
  REJECTED: { label: 'Từ chối', variant: 'rejected' },
  DRAFT: { label: 'Lưu nháp', variant: 'draft' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
  const normalizedKey = String(status).toUpperCase();
  const config = STATUS_MAP[normalizedKey] || { label: label || status, variant: 'default' };
  const displayLabel = label || config.label;

  return (
    <span className={`status-badge status-badge--${config.variant} ${className}`}>
      <span className="status-badge-dot">•</span>
      <span className="status-badge-text">{displayLabel}</span>
    </span>
  );
};

interface CountBadgeProps {
  count: number | string;
  className?: string;
}

export const CountBadge: React.FC<CountBadgeProps> = ({ count, className = '' }) => {
  return (
    <span className={`count-badge ${className}`}>
      {count}
    </span>
  );
};

export default StatusBadge;
