import React from 'react';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
  visible?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible = true }) => {
  if (!visible) return null;

  return (
    <div className="loading-overlay-container">
      <div className="loading-logo-wrapper">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Stylized leaf logo representing Agribank */}
          <path d="M12 2C12 2 17 7 17 11C17 14.5 14.5 17 12 17C9.5 17 7 14.5 7 11C7 7 12 2 12 2Z" fill="#B42318" />
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2" stroke="#B42318" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="loading-dots-container">
        <span className="loading-dot"></span>
        <span className="loading-dot"></span>
        <span className="loading-dot"></span>
      </div>

      <div className="loading-title-text">Đang tải dữ liệu...</div>

      <div className="loading-progress-bar-container">
        <div className="loading-progress-bar-indicator"></div>
      </div>

      <div className="loading-subtitle-text">Vui lòng chờ trong giây lát</div>
    </div>
  );
};

export default LoadingOverlay;
