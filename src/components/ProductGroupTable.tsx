import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductGroupTable.css'; 

interface ProductGroup {
  id: any;
  name: string;
  status: string;
  active?: boolean;
  createdByFullName?: string | null;
  approvedBy?: string | null;
  version?: number | null;  
}

interface Props {
  data: ProductGroup[];
  onToggleActive?: (id: any, newActiveStatus: boolean) => void;
}

const ProductGroupTable: React.FC<Props> = ({ data, onToggleActive }) => {
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  
  const [tableData, setTableData] = useState<ProductGroup[]>([]);
  
  // State quản lý chi tiết popup thông báo lỗi theo đúng thiết kế
  const [warningData, setWarningData] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    setTableData(data);
  }, [data]);

  const totalPages = Math.ceil((tableData?.length || 0) / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return tableData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [tableData, currentPage]);

  const handleViewDetail = (id: string) => {
    navigate(`/product-groups/${id}`);
  };

  // Truyền cả object `item` vào thay vì chỉ `id` để lấy được `name`
  const handleToggleActive = async (item: ProductGroup, currentActive: boolean) => {
    const newActiveStatus = !currentActive;

    // 1. Optimistic Update
    setTableData(prevData => 
      prevData.map(d => 
        d.id === item.id ? { ...d, active: newActiveStatus } : d
      )
    );

    try {
      // 2. Gọi API
      const response = await fetch(`http://localhost:8082/api/v1/product-groups/${item.id}/active?active=${newActiveStatus}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Không thể thay đổi trạng thái');
      }

      if (onToggleActive) {
        onToggleActive(item.id, newActiveStatus);
      }

    } catch (error) {
      console.error("Lỗi cập nhật hiệu lực:", error);
      
      // 3. Rollback UI
      setTableData(prevData => 
        prevData.map(d => 
          d.id === item.id ? { ...d, active: currentActive } : d
        )
      );

      // 4. Mở popup hiển thị đúng text như thiết kế ảnh
      setWarningData({
        show: true,
        title: `Không thể ẩn nhóm: "${item.name}"`,
        message: "Nhóm sản phẩm này đang chứa các danh mục hoặc sản phẩm bên trong."
      });
    }
  };

  const renderStatus = (status: string) => {
    let config = { className: '', label: '', showDot: false };
    switch (status) {
      case 'ACTIVE':
        config = { className: 'status-active', label: 'Đang hoạt động', showDot: false };
        break;
      case 'DRAFT':
        config = { className: 'status-draft', label: 'Lưu nháp', showDot: false };
        break;
      case 'REJECTED':
        config = { className: 'status-rejected', label: 'Từ chối', showDot: false };
        break;
      case 'NEEDS_REVISION':
        config = { className: 'status-revision', label: 'Yêu cầu chỉnh sửa', showDot: false };
        break;
      case 'PENDING_APPROVAL':
        config = { className: 'status-pending', label: 'Chờ duyệt', showDot: false };
        break;
      case 'ARCHIVED':
        config = { className: 'status-archived', label: 'Lưu trữ', showDot: false };
        break;
      default:
        config = { className: 'status-rejected', label: status || 'Không xác định', showDot: false };
    }

    return (
      <div className={`status-badge ${config.className}`}>
        {config.showDot && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="mr-2">
            <circle cx="4" cy="4" r="3" fill="currentColor" />
          </svg>
        )}
        <span>{config.label}</span>
      </div>
    );
  };

  const renderActiveToggle = (item: ProductGroup) => {
    const disabledStatuses = ['PENDING_APPROVAL', 'REJECTED', 'DRAFT', 'NEEDS_REVISION'];
    const isDisabled = disabledStatuses.includes(item.status);
    const isActive = item.active || false;

    return (
      <div className="toggle-wrapper">
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={isActive} 
            disabled={isDisabled}
            onChange={() => {
              if (!isDisabled) {
                // Sửa thành truyền toàn bộ item vào hàm
                handleToggleActive(item, isActive);
              }
            }}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className={`toggle-label ${isDisabled ? 'disabled-text' : ''}`}>
          {isActive ? 'Hiện' : 'Ẩn'}
        </span>
      </div>
    );
  };

  return (
    <div className="product-table-container">
      <table className="product-table table-text-base">
        <thead>
          <tr>
            <th className="px-40 rounded-l-12 w-24">STT</th>
            <th>Tên nhóm sản phẩm</th>
            <th>Trạng thái</th>
            <th>Hiệu lực</th>
            <th>Người tạo</th>
            <th>Người kiểm duyệt</th>
            <th>Phiên bản</th>
            <th className="px-40 rounded-r-12"></th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, index) => (
              <tr key={item.id || index}>
                <td className="px-40">
                  {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                </td>
                <td className="product-name-cell">
                  <span className="truncate-text" title={item.name}>
                    {item.name}
                  </span>
                </td>
                <td>{renderStatus(item.status)}</td>
                <td>{renderActiveToggle(item)}</td>
                <td>{item.createdByFullName || '---'}</td>
                <td>{item.approvedBy || '---'}</td>
                <td style={{ 
                  color: '#053E2B', 
                  fontFamily: 'Inter, sans-serif', 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  lineHeight: '24px', 
                  flex: '1 0 0' 
                }}>
                  {item.version ? `Phiên bản ${item.version}` : '---'}
                </td>
                <td className="px-40 text-right">
                  <button
                    className="btn-view-detail"
                    onClick={() => handleViewDetail(item.id)}
                    title="Xem chi tiết"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg> 
                  </button>
                </td>
              </tr>
            ))
          ) : (
             <tr>
              <td colSpan={8} className="text-center py-20 text-gray-400">
                Không có dữ liệu hiển thị
              </td>
            </tr>
          )}
        </tbody>
      </table>

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
              .filter((page) => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
              .map((page, index, arr) => {
                const prevPage = arr[index - 1];
                return (
                  <React.Fragment key={page}>
                    {prevPage && page - prevPage > 1 && (
                      <span className="pagination-dots">...</span>
                    )}
                    <button
                      className={`pagination-number ${currentPage === page ? 'active' : ''}`}
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

      {/* MODAL CẢNH BÁO TÙY CHỈNH THEO THIẾT KẾ MỚI */}
      {warningData.show && (
        <div className="warning-toast-wrapper">
          <div className="warning-toast-card">
            <div className="warning-toast-icon-container">
              <div className="warning-bg-outer"></div>
              <div className="warning-bg-inner"></div>
              {/* Icon cảnh báo (Alert Triangle) */}
              <svg className="warning-toast-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            
            {/* Nội dung text sinh động theo API / Thiết kế */}
            <h3 className="warning-toast-title">{warningData.title}</h3>
            <p className="warning-toast-desc">{warningData.message}</p>
            
            <div className="warning-toast-actions">
              <button 
                className="warning-btn-close" 
                onClick={() => setWarningData({ ...warningData, show: false })}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductGroupTable;