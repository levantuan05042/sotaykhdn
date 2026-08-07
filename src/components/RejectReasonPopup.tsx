import React, { useState } from 'react';
import './RejectReasonPopup.css';

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

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onSubmit(reason.trim());
    setReason('');
  };

  return (
    <div className="custom-popup-overlay" onClick={onClose}>
      <div className="custom-popup-card" onClick={(e) => e.stopPropagation()}>
        <div className="custom-popup-header">
          <span className="custom-popup-title">{title}</span>
          <button className="custom-popup-close-btn" onClick={onClose} title="Đóng">✕</button>
        </div>
        <div className="custom-popup-body">
          <label className="custom-popup-label">Nội dung từ chối (*)</label>
          <textarea
            className="custom-popup-textarea"
            placeholder="Nhập nội dung..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
        <div className="custom-popup-footer">
          <button className="custom-popup-btn-cancel" onClick={onClose}>Hủy</button>
          <button
            className={`custom-popup-btn-submit ${reason.trim() ? 'active' : 'disabled'}`}
            disabled={!reason.trim()}
            onClick={handleSubmit}
          >
            Gửi
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectReasonPopup;
