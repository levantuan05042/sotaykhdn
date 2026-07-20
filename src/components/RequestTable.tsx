import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductTable.css'; 

export interface RequestItem {
  requestId: string;
  requestName: string;   
  status: string; 
  createdAt: string;     
  totalProducts: number;
  isBatch: boolean;      
  productId: string | null; 
  createdBy?: string;    
  approvedBy?: string;   
}

interface Props {
  data: RequestItem[];
}

const stripHtml = (htmlString: string) => {
  if (!htmlString) return '---';
  return htmlString.replace(/<\/?[^>]+(>|$)/g, "");
};

const formatDate = (dateString: string) => {
  if (!dateString) return '---';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
};

const RequestTable: React.FC<Props> = ({ data }) => {
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const totalPages = Math.ceil((data || []).length / ITEMS_PER_PAGE);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return (data || []).slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [data, currentPage]);

  const handleViewDetail = (item: RequestItem) => {
    if (item.isBatch) {
      navigate(`/products/batch/${item.requestId}`);
    } else {
      navigate(`/product/${item.productId}`);
    }
  };

  const renderStatusBadge = (status: string) => {
    const safeStatus = status?.toUpperCase();
    const badgeStyle = (bgColor: string, textColor: string) => ({
      backgroundColor: bgColor, color: textColor, padding: '4px 12px', 
      borderRadius: '12px', display: 'inline-flex', alignItems: 'center', 
      gap: '6px', fontSize: '14px', fontWeight: 500
    });
    const dotStyle = (color: string) => ({
      width: '6px', height: '6px', borderRadius: '50%', backgroundColor: color
    });

    switch (safeStatus) {
      case 'PENDING_APPROVAL':
        return (
          <div className="status-badge-custom" style={badgeStyle('#FFEDD5', '#EA580C')}>
            <span style={dotStyle('#EA580C')}></span><span>Chờ duyệt</span>
          </div>
        );
      case 'COMPLETED':
      case 'ACTIVE': 
        return (
          <div className="status-badge-custom" style={badgeStyle('#DCFCE7', '#16A34A')}>
            <span style={dotStyle('#16A34A')}></span><span>Hoàn thành</span>
          </div>
        );
      case 'NEEDS_REVISION':
        return (
          <div className="status-badge-custom" style={badgeStyle('#FEF9C3', '#CA8A04')}>
            <span style={dotStyle('#CA8A04')}></span><span>Yêu cầu chỉnh sửa</span>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="status-badge-custom" style={badgeStyle('#FEE2E2', '#DC2626')}>
            <span style={dotStyle('#DC2626')}></span><span>Từ chối</span>
          </div>
        );
      case 'DRAFT':
        return (
          <div className="status-badge-custom" style={badgeStyle('#F3F4F6', '#4B5563')}>
            <span style={dotStyle('#4B5563')}></span><span>Lưu nháp</span>
          </div>
        );
      default:
        return <span>{status || '---'}</span>;
    }
  };

  return (
    <div className="table-wrapper">
      <table className="custom-table">
        <thead>
          <tr>
            <th style={{ width: '60px' }}>STT</th>
            <th>Tên yêu cầu</th>     
            <th>Trạng thái</th> 
            <th>Thời gian</th> 
            <th>Số lượng</th>
            <th>Người tạo</th>
            <th>Người duyệt</th>
            <th style={{ width: '60px' }}></th>
          </tr>
        </thead>

        <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, index) => {
              const plainTextName = stripHtml(item.requestName); 
              
              return (
                <tr key={item.requestName || index}>
                  <td>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                  
                  <td>
                    <span className="truncate-text" title={plainTextName} style={{ fontWeight: 500, color: '#1F2937' }}>
                      {plainTextName}
                    </span>
                  </td>

                  <td>{renderStatusBadge(item.status)}</td>
                  <td style={{ color: '#4B5563' }}>{formatDate(item.createdAt)}</td>
                  
                  <td style={{ color: '#4B5563', fontWeight: item.isBatch ? 600 : 400 }}>
                    {item.isBatch ? `${item.totalProducts} Sản phẩm` : 'Tạo lẻ'}
                  </td>

                  {/* Render 2 thẻ td riêng biệt */}
                  <td style={{ color: '#4B5563' }}>
                    {item.createdBy || 'Hệ thống'}
                  </td>
                  <td style={{ color: '#4B5563' }}>
                    {item.approvedBy || '---'}
                  </td>

                  <td>
                    <button
                      className="btn-action-view"
                      onClick={() => handleViewDetail(item)} 
                      title="Xem chi tiết"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9E1F36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })
          ) : (
            <tr>
              {/* Thay đổi colSpan từ 7 thành 8 do đã thêm 1 cột */}
              <td colSpan={8} className="text-center" style={{ padding: '30px', color: '#9CA3AF' }}>
                Không có dữ liệu hiển thị
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination-box">
          <button
            className="p-nav-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            ←
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              return (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              );
            })
            .map((page, index, arr) => {
              const prevPage = arr[index - 1];
              return (
                <React.Fragment key={page}>
                  {prevPage && page - prevPage > 1 && (
                    <span className="pagination-dots">...</span>
                  )}
                  <button
                    className={`p-item ${currentPage === page ? 'active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            className="p-nav-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
};

export default RequestTable;