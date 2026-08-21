import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductTable.css'; 

interface ProductCategory {
  id: string;
  name: string;
  businessName?: string | null;
  productCategoryName?: string | null;
  productGroupName?: string | null;
  requestName?: string | null; 
  requestId?: string | null;     // <-- Thêm requestId vào interface
  notes?: string | null;       
  createdAt?: string | null;   
  status: string;
  active?: boolean;       
  createdByFullName?: string | null;
  approvedBy?: string | null;
  version?: number | null;
}

interface Props {
  data: ProductCategory[];
}

// Hàm hỗ trợ loại bỏ thẻ HTML
const stripHtml = (htmlString?: string | null) => {
  if (!htmlString) return '';
  return htmlString.replace(/<\/?[^>]+(>|$)/g, "");
};

// Hàm hỗ trợ format ngày tháng (DD/MM/YYYY)
const formatDate = (dateString?: string | null) => {
  if (!dateString) return '---';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
};

const ProductCategoryTable: React.FC<Props> = ({ data }) => {
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const activeData = useMemo(() => {
    const allowedStatuses = ['DRAFT', 'PENDING_APPROVAL'];
    return (data || []).filter(item => 
      allowedStatuses.includes(item.status?.toUpperCase())
    );
  }, [data]);

  const totalPages = Math.ceil(activeData.length / ITEMS_PER_PAGE);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return activeData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activeData, currentPage]);

  const handleViewDetail = (id: string) => {
    navigate(`/products/${id}`);
  };

  // Hàm xử lý chuyển hướng khi click vào Tên yêu cầu
  const handleViewBatchDetail = (requestId?: string | null) => {
    if (requestId) {
      navigate(`/products/batch/${requestId}`);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DRAFT': return { label: 'Lưu nháp', className: 'status-draft' };
      case 'PENDING_APPROVAL': return { label: 'Chờ duyệt', className: 'status-pending' };
      default: return { label: status, className: 'status-draft' };
    }
  };

  return (
    <div className="table-wrapper">
      <table className="custom-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Sản phẩm</th>     
            <th className="col-group">Nhóm sản phẩm</th> 
            <th>Trạng thái</th>
            <th className="col-highlight col-highlight-first">Tên yêu cầu</th>
            <th className="col-highlight">Ghi chú</th>
            <th className="col-highlight col-highlight-last">Ngày tạo</th>
            <th>Người tạo</th>
            <th>Người kiểm duyệt</th>
            <th>Phiên bản</th>
            <th style={{ width: '60px' }}></th>
          </tr>
        </thead>

        <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, index) => (
              <tr key={item.id || index}>
                {/* 1. STT */}
                <td>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                
                {/* 2. Sản phẩm */}
                <td>
                  <span className="truncate-text" title={stripHtml(item.name)} style={{ fontWeight: 500 }}>
                    {stripHtml(item.name) || '---'} 
                  </span>
                </td>
                
                {/* 3. Nhóm sản phẩm */}
                <td className="col-group">
                  <span className="truncate-text" title={item.productGroupName || ''}>
                    {item.productGroupName || '---'}
                  </span>
                </td>
                
                {/* 4. Trạng thái */}
                <td>
                  {(() => {
                    const statusInfo = getStatusLabel(item.status);
                    return (
                      <div className={`status-badge-custom ${statusInfo.className}`}>
                        <span>{statusInfo.label}</span>
                      </div>
                    );
                  })()}
                </td>
                
                {/* 5. Tên yêu cầu */}
                <td className="col-highlight col-highlight-first">
                  <span 
                    className="truncate-text" 
                    title={stripHtml(item.requestName) || ''}
                    onClick={() => handleViewBatchDetail(item.requestId)}
                    style={{ 
                      cursor: item.requestId ? 'pointer' : 'default', 
                      color: item.requestId ? '#2563EB' : 'inherit',
                      textDecoration: item.requestId ? 'underline' : 'none' 
                    }}
                  >
                    {stripHtml(item.requestName) || '---'}
                  </span>
                </td>
                
                {/* 6. Ghi chú */}
                <td className="col-highlight">
                  <div className="col-highlight-content">
                    <span className="truncate-text" title={item.notes || ''}>
                      {item.notes || '---'}
                    </span>
                  </div>
                </td>

                {/* 7. Ngày tạo */}
                <td className="col-highlight col-highlight-last">{formatDate(item.createdAt)}</td>
                
                {/* 8. Người tạo */}
                <td>{item.createdByFullName || '---'}</td>
                
                {/* 9. Người kiểm duyệt */}
                <td>{item.approvedBy || '---'}</td>
                
                {/* 10. Phiên bản */}
                <td style={{ fontWeight: 600 }}>
                  {item.version ? `Phiên bản ${item.version}` : '---'}
                </td>

                {/* 11. Action */}
                <td>
                  <button
                    className="btn-action-view"
                    onClick={() => handleViewDetail(item.id)}
                    title="Xem chi tiết"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={11} className="text-center" style={{ padding: '30px', color: '#9CA3AF', textAlign: 'center' }}>
                Không có dữ liệu hiển thị
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Khối Phân trang đầy đủ logic */}
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

export default ProductCategoryTable;