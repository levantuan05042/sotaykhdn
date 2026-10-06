import React from 'react';
import { createPortal } from 'react-dom';
import './ApproveConfirmPopup.css';

interface RevisionConfirmPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  message?: string;
  loading?: boolean;
}

export const RevisionConfirmPopup: React.FC<RevisionConfirmPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  message,
  loading = false,
}) => {
  if (!isOpen) return null;

  const desc = message || 'Bạn chắc chắn muốn gửi yêu cầu chỉnh sửa?';

  return createPortal(
    <div className="custom-popup-overlay" onClick={onClose}>
      <div className="custom-popup-confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className="custom-confirm-body">
          <p className="custom-confirm-text">
            {desc}
            {itemName && (
              <>
                {' '}
                <span className="custom-confirm-highlight">{itemName}</span>
              </>
            )}
          </p>
        </div>
        <div className="custom-confirm-footer">
          <button type="button" className="custom-popup-btn-cancel" onClick={onClose} disabled={loading}>
            Đóng
          </button>
          <button type="button" className="custom-popup-btn-approve" onClick={onConfirm} disabled={loading}>
            {loading ? 'Đang gửi...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RevisionConfirmPopup;
