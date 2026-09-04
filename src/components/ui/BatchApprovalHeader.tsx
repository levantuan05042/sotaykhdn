import React from 'react';
import './BatchApprovalHeader.css';

interface BatchApprovalHeaderProps {
  selectedCount: number;
  onApproveAll: () => void;
  onRejectAll: () => void;
}

export const BatchApprovalHeader: React.FC<BatchApprovalHeaderProps> = ({
  selectedCount,
  onApproveAll,
  onRejectAll,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="batch-approval-bar">
      <div className="batch-approval-left">
        <span className="batch-selected-badge">
          Đã chọn <strong>{selectedCount}</strong> hạng mục
        </span>
      </div>

      <div className="batch-approval-actions">
        <button className="btn-batch-approve" onClick={onApproveAll}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Duyệt tất cả</span>
        </button>

        <button className="btn-batch-reject" onClick={onRejectAll}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Từ chối tất cả</span>
        </button>
      </div>
    </div>
  );
};

export default BatchApprovalHeader;
