import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductBusinessTable.css'; 

// Khai báo Interface dữ liệu đầu vào cho Sản phẩm nghiệp vụ
interface ProductBusiness {
  id: string;
  name: string;    
  groupName: string;     // Tên sản phẩm nghiệp vụ
  categoryName: string; // Thuộc danh mục sản phẩm nào
  status: string;
  active?: boolean;
  createdBy?: string | null;
  approvedBy?: string | null;
  version?: number | null; 
}

interface Props {
  data: ProductBusiness[];
}

const ProductBusinessTable: React.FC<Props> = ({ data }) => {
  const navigate = useNavigate();

  // ===== Pagination =====
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Tự động đưa về trang 1 nếu dữ liệu thay đổi (tìm kiếm, bộ lọc...)
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const totalPages = Math.ceil((data?.length || 0) / ITEMS_PER_PAGE);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return (data || []).slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [data, currentPage]);

  const handleViewDetail = (id: string) => {
    navigate(`/business-management/${id}`);
  };

  const renderStatus = (status: string) => {
    let config = { className: '', label: '', showDot: false };

    switch (status) {
      case 'ACTIVE':
        config = {
          className: 'status-active',
          label: 'Đang hoạt động',
          showDot: false
        };
        break;
      case 'DRAFT':
        config = {
          className: 'status-draft',
          label: 'Lưu nháp',
          showDot: false
        };
        break;
      case 'REJECTED':
        config = {
          className: 'status-rejected',
          label: 'Từ chối',
          showDot: false
        };
        break;
      case 'NEEDS_REVISION':
        config = {
          className: 'status-revision',
          label: 'Yêu cầu chỉnh sửa',
          showDot: false
        };
        break;
      case 'PENDING_APPROVAL':
        config = {
          className: 'status-pending',
          label: 'Chờ duyệt',
          showDot: false
        };
        break;
      case 'ARCHIVED':
        config = {
          className: 'status-archived',
          label: 'Lưu trữ',
          showDot: false
        };
        break;
      default:
        config = {
          className: 'status-rejected',
          label: status || 'Không xác định',
          showDot: false
        };
    }

    return (
      <div className={`status-badge ${config.className}`}>
        {config.showDot && (
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="none"
            className="mr-2"
          >
            <circle cx="4" cy="4" r="3" fill="currentColor" />
          </svg>
        )}
        <span>{config.label}</span>
      </div>
    );
  };

  return (
    <div className="product-table-container">
      <table className="product-table table-text-base">
        <thead>
          <tr>
            <th className="px-40 rounded-l-12 w-24">STT</th>
            <th>Tên nghiệp vụ</th>
            <th>Nhóm sản phẩm</th>
            <th>Danh mục sản phẩm</th>
            <th>Trạng thái</th>
            <th>Hiệu lực</th>
            <th>Người tạo</th>
            <th>Người kiểm duyệt</th>
            <th>Phiển bản</th>
            
            <th className="px-40 rounded-r-12"></th>
          </tr>
        </thead>

        <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, index) => (
              <tr key={item.id || index}>
                {/* Số thứ tự tiến trình dựa trên Trang */}
                <td className="px-40">
                  {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                </td>

                {/* Tên sản phẩm nghiệp vụ */}
                <td className="product-name-cell">
                  <span
                    className="truncate-text"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </td>

                 <td>
                  <span className="truncate-text" title={item.groupName}>
                    {item.groupName || '---'}
                  </span>
                </td>
                
                {/* Danh mục sản phẩm */}
                <td>
                  <span className="truncate-text" title={item.categoryName}>
                    {item.categoryName || '---'}
                  </span>
                </td>

                {/* Trạng thái hoạt động */}
                <td>{renderStatus(item.status)}</td>
                <td>
                  {item.active ? (
                    <span className="text-success">Đang hiển thị</span>
                  ) : (
                    <span className="text-danger">Đã ẩn</span>
                  )}
                </td>
                <td>{item.createdBy || '---'}</td>
                <td>{item.approvedBy || '---'}</td>
                <td style={{ 
                  color: '#053E2B', 
                  fontFamily: 'Inter, sans-serif', 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  lineHeight: '24px', 
                  flex: '1 0 0' 
                }}>
                  {item.version ? `Phiên bản ${item.version}` : 'Phiên bản 1'}
                </td>

                {/* Action xem chi tiết */}
                <td className="px-40 text-right">
                  <button
                    className="btn-view-detail"
                    onClick={() => handleViewDetail(item.id)}
                    title='Xem chi tiết'
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-1.5"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={6} // Đã tăng colSpan lên 6 để vừa vặn hoàn toàn với số lượng cột mới
                className="text-center py-20 text-gray-400"
              >
                Không có dữ liệu hiển thị
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ===== Phân trang (Pagination) ===== */}
      {totalPages > 1 && (
        <div className="pagination-wrapper">
          <div className="pagination-container">
            <button
              className="pagination-arrow"
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
                      className={`pagination-number ${
                        currentPage === page ? 'active' : ''
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              className="pagination-arrow"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductBusinessTable;