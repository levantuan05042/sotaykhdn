import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import './RejectReasonPopup.css';
import { FIELD_LIMITS, getRejectReasonError } from '../utils/fieldValidation';
import CharCountHint from './ui/CharCountHint';

interface RejectReasonPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  title?: string;
}

export const RejectReasonPopup: React.FC<RejectReasonPopupProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title = 'Lý do từ chối'
}) => {
  const [reason, setReason] = useState('');
  const reasonError = getRejectReasonError(reason);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason.trim() || reasonError) return;
    onSubmit(reason.trim());
    setReason('');
  };

  return createPortal(
    <div className="custom-popup-overlay" onClick={onClose}>
      <div className="custom-popup-card" onClick={(e) => e.stopPropagation()}>
        <div className="custom-popup-header">
          <span className="custom-popup-title">{title}</span>
          <button type="button" className="custom-popup-close-btn" onClick={onClose} title="Đóng">✕</button>
        </div>
        <div className="custom-popup-body">
          <label className="custom-popup-label">Nội dung từ chối (*)</label>
          <textarea
            className={`custom-popup-textarea ${reasonError ? 'input-invalid' : ''}`}
            placeholder="Nhập nội dung..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <CharCountHint
            current={reason.length}
            max={FIELD_LIMITS.rejectReason}
            error={reasonError}
          />
        </div>
        <div className="custom-popup-footer">
          <button type="button" className="custom-popup-btn-cancel" onClick={onClose}>Hủy</button>
          <button
            type="button"
            className={`custom-popup-btn-submit ${reason.trim() && !reasonError ? 'active' : 'disabled'}`}
            disabled={!reason.trim() || Boolean(reasonError)}
            onClick={handleSubmit}
          >
            Gửi
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RejectReasonPopup;
