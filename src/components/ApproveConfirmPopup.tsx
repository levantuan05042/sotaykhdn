import React from 'react';
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

  return (
    <div className="custom-popup-overlay" onClick={onClose}>
      <div className="custom-popup-confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className="custom-confirm-body">
          <p className="custom-confirm-text">
            Bạn muốn gửi Phê duyệt <span className="custom-confirm-highlight">{itemName}</span>
          </p>
        </div>
        <div className="custom-confirm-footer">
          <button className="custom-popup-btn-cancel" onClick={onClose}>Hủy</button>
          <button className="custom-popup-btn-approve" onClick={onConfirm}>Phê duyệt</button>
        </div>
      </div>
    </div>
  );
};

export default ApproveConfirmPopup;
