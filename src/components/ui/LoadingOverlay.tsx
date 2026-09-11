import React from 'react';
import './LoadingOverlay.css';
import logoAgribank from '../../assets/logo-agribank.png';

interface LoadingOverlayProps {
  visible?: boolean;
  title?: string;
  subtitle?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible = true,
  title = 'Đang tải dữ liệu...',
  subtitle = 'Vui lòng chờ trong giây lát',
}) => {
  if (!visible) return null;

  return (
    <div className="loading-overlay-container">
      <div className="loading-logo-wrapper">
        <img src={logoAgribank} alt="Agribank" className="loading-agri-logo" />
      </div>

      <div className="loading-dots-container">
        <span className="loading-dot"></span>
        <span className="loading-dot"></span>
        <span className="loading-dot"></span>
      </div>

      <div className="loading-title-text">{title}</div>

      <div className="loading-progress-bar-container">
        <div className="loading-progress-bar-indicator"></div>
      </div>

      <div className="loading-subtitle-text">{subtitle}</div>
    </div>
  );
};

export default LoadingOverlay;
