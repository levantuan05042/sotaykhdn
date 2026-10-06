import React from 'react';
import { createPortal } from 'react-dom';
import './ApproveConfirmPopup.css';

interface ApproveConfirmPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
}

export const ApproveConfirmPopup: React.FC<ApproveConfirmPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName
}) => {
  if (!isOpen) return null;

  const cleanName = (itemName || '').replace(/<[^>]*>/g, '').trim();
  const displayName = cleanName.length > 45 ? `${cleanName.slice(0, 45)}...` : cleanName;

  return createPortal(
    <div className="custom-popup-overlay" onClick={onClose}>
      <div className="custom-popup-confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className="custom-confirm-body">
          <p className="custom-confirm-text">
            Bạn muốn phê duyệt <span className="custom-confirm-highlight" title={cleanName}>"{displayName}"</span>
          </p>
        </div>
        <div className="custom-confirm-footer">
          <button type="button" className="custom-popup-btn-cancel" onClick={onClose}>Hủy</button>
          <button type="button" className="custom-popup-btn-approve" onClick={onConfirm}>Phê duyệt</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ApproveConfirmPopup;
