import React, { useState } from 'react';

// Khai báo các props cần thiết truyền từ màn hình cha vào
interface ProductInfoCardProps {
  creatorName: string;
  approverName: string;
  createdAt: string;
  version: number | string;
}

const ProductInfoCard: React.FC<ProductInfoCardProps> = ({
  creatorName,
  approverName,
  createdAt,
  version
}) => {
  // Chuyển state quản lý đóng/mở accordion vào bên trong component
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="infoCard">
      <div className="infoHeader" onClick={() => setIsOpen(!isOpen)}>
        <span className="infoTitle">Thông tin sản phẩm</span>
        <svg 
          className={`infoChevron ${isOpen ? 'open' : ''}`} 
          width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M5 7.5L10 12.5L15 7.5"/>
        </svg>
      </div>
      
      {isOpen && (
        <div className="infoContent">
          <div className="infoGrid">
            <div className="infoItem">
              <span className="infoLabel">Người tạo</span>
              <span className="infoValue">{creatorName}</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Người kiểm duyệt</span>
              <span className="infoValue">{approverName}</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Thời gian tạo</span>
              <span className="infoValue">{createdAt}</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Phiên bản</span>
              <div className="versionBadge">
                Phiên bản {version ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductInfoCard;