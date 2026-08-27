import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge2 from './ui/StatusBadge2'; // Import component dùng chung
import './ProductTable.css'; 

interface ProductCategory {
  id: string;
  name: string;
  businessName: string | null;
  productCategoryName: string | null;
  productGroupName: string | null;
  status: string;
  active?: boolean;       
  createdByFullName?: string | null;
  approvedBy?: string | null;
  version?: number | null;
}

interface Props {
  data: ProductCategory[];
  onToggleActive?: (id: string, newActiveStatus: boolean) => void;
}

const ProductCategoryTable: React.FC<Props> = ({ data, onToggleActive }) => {
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState<ProductCategory[]>([]);

  useEffect(() => {
    setTableData(data || []);
    setCurrentPage(1);
  }, [data]);

  const activeData = useMemo(() => {
    return tableData.filter(item => item.status?.toUpperCase() === 'ACTIVE');
  }, [tableData]);

  const totalPages = Math.ceil(activeData.length / ITEMS_PER_PAGE);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return activeData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activeData, currentPage]);

  // Chuyển hướng sang chi tiết
  const handleViewDetail = (id: string) => {
    navigate(`/products/${id}`);
  };

  // Cập nhật lại hàm handleToggleActive trong ProductCategoryTable.tsx
  const handleToggleActive = async (e: React.ChangeEvent<HTMLInputElement>, item: ProductCategory) => {
    e.stopPropagation(); // Chặn sự kiện click lan ra hàng tr
    const newActiveStatus = e.target.checked;

    // 1. Cập nhật UI ngay lập tức (Optimistic UI)
    setTableData(prev =>
      prev.map(d => d.id === item.id ? { ...d, active: newActiveStatus } : d)
    );

    try {
      // 2. Gọi API cập nhật trạng thái Hiệu lực
      const response = await fetch(
        `http://localhost:8082/api/v1/products/${item.id}/active?active=${newActiveStatus}`,
        {
          method: 'GET', 
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Gọi API thất bại');
      }
      if (onToggleActive) {
        onToggleActive(item.id, newActiveStatus);
      }
    } catch (error) {
      console.error('Lỗi khi gọi API cập nhật hiệu lực:', error);
      setTableData(prev =>
        prev.map(d => d.id === item.id ? { ...d, active: !newActiveStatus } : d)
      );
      alert('Không thể cập nhật trạng thái hiệu lực. Vui lòng thử lại!');
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
            <th className="col-category">Danh mục sản phẩm</th> 
            <th className="col-business">Nghiệp vụ</th> 
            <th>Trạng thái</th>
            <th>Hiệu lực</th>
            <th>Người tạo</th>
            <th>Người kiểm duyệt</th>
            <th>Phiên bản</th>
            <th style={{ width: '60px' }}></th>
          </tr>
        </thead>

        <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, index) => (
              <tr 
                key={item.id || index}
                onClick={() => handleViewDetail(item.id)} // Click hàng chuyển sang chi tiết
              >
                <td>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                <td>
                  {(() => {
                    const stripHtml = (htmlString: string) => {
                      if (!htmlString) return '';
                      return htmlString.replace(/<\/?[^>]+(>|$)/g, "");
                    };
                    const plainText = stripHtml(item.name);
                    return (
                      <span className="truncate-text" title={plainText} style={{ fontWeight: 500 }}>
                        {plainText || '---'} 
                      </span>
                    );
                  })()}
                </td>
                <td className="col-group">
                  <span className="truncate-text" title={item.productGroupName || ''}>
                    {item.productGroupName || '---'}
                  </span>
                </td>
                <td className="col-category">
                  <span className="truncate-text" title={item.productCategoryName || ''}>
                    {item.productCategoryName || '---'}
                  </span>
                </td>
                <td className="col-business">
                  <span className="truncate-text" title={item.businessName || ''}>
                    {item.businessName || '---'}
                  </span>
                </td>

                {/* Sử dụng Component StatusBadge2 dùng chung */}
                <td>
                  <StatusBadge2 status={item.status} />
                </td>

                {/* Cột Hiệu lực: Gạt bật/tắt */}
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="toggle-wrapper">
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={item.active || false} 
                        onChange={(e) => handleToggleActive(e, item)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                    <span className="toggle-label">
                      {item.active ? 'Hiện' : 'Ẩn'}
                    </span>
                  </div>
                </td>

                <td>{item.createdByFullName || '---'}</td>
                <td>{item.approvedBy || '---'}</td>
                <td style={{ fontWeight: 600 }}>
                  {item.version ? `Phiên bản ${item.version}` : '---'}
                </td>

                {/* Cột Thao tác */}
                <td onClick={(e) => e.stopPropagation()}>
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
              <td colSpan={11} className="text-center" style={{ padding: '30px', color: '#9CA3AF' }}>
                Không có dữ liệu hiển thị
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Phân trang */}
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
            .filter((page) => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
            .map((page, index, arr) => {
              const prevPage = arr[index - 1];
              return (
                <React.Fragment key={page}>
                  {prevPage && page - prevPage > 1 && <span className="pagination-dots">...</span>}
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