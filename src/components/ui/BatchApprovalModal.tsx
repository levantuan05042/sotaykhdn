import React, { useState } from 'react';
import './BatchApprovalModal.css';

interface BatchApprovalModalProps {
  isOpen: boolean;
  type: 'APPROVE' | 'REJECT' | null;
  selectedCount: number;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  loading?: boolean;
}

export const BatchApprovalModal: React.FC<BatchApprovalModalProps> = ({
  isOpen,
  type,
  selectedCount,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !type) return null;

  const isApprove = type === 'APPROVE';

  const handleConfirm = () => {
    onConfirm(reason);
    setReason('');
  };

  const handleClose = () => {
    if (loading) return;
    setReason('');
    onClose();
  };

  return (
    <div className="batch-modal-overlay" onClick={handleClose} role="presentation">
      <div className="batch-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="batch-modal-header">
          <h3 className="batch-modal-title">
            {isApprove ? 'Xác nhận phê duyệt hàng loạt' : 'Xác nhận từ chối hàng loạt'}
          </h3>
          <button
            type="button"
            className="batch-modal-close-btn"
            onClick={handleClose}
            disabled={loading}
            aria-label="Đóng"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="batch-modal-body">
          <p className="batch-modal-message">
            {isApprove
              ? `Bạn có chắc chắn muốn phê duyệt ${selectedCount} hạng mục đã chọn không?`
              : `Bạn có chắc chắn muốn từ chối ${selectedCount} hạng mục đã chọn không?`}
          </p>

          {!isApprove && (
            <div className="batch-modal-reason-box">
              <label className="batch-modal-label">Lý do từ chối (không bắt buộc):</label>
              <textarea
                className="batch-modal-textarea"
                rows={3}
                placeholder="Nhập lý do từ chối..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={loading}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="batch-modal-footer">
          <button type="button" className="btn-batch-modal-cancel" onClick={handleClose} disabled={loading}>
            Hủy
          </button>

          <button
            type="button"
            className="btn-batch-modal-confirm"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : isApprove ? 'Xác nhận Phê duyệt' : 'Xác nhận Từ chối'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchApprovalModal;
