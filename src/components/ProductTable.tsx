import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatApprovedBy } from '../utils/formatUtils';
import StatusBadge2 from './ui/StatusBadge2'; 
import './ProductTable.css'; 
import { BASE_URL } from '../config/apiConfig';

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

const CellWithTooltip = ({ text, weight = 400 }: { text: string; weight?: number }) => {
  if (!text || text === '---') {
    return <span style={{ fontWeight: weight }}>{text || '---'}</span>;
  }
  
  return (
    <div className="truncate-wrapper">
      <span className="truncate-text" style={{ fontWeight: weight }}>
        {text}
      </span>
      <span className="custom-tooltip">{text}</span>
    </div>
  );
};

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

  const handleViewDetail = (id: string) => {
    navigate(`/products/${id}`);
  };

  const handleToggleActive = async (e: React.ChangeEvent<HTMLInputElement>, item: ProductCategory) => {
    e.stopPropagation(); 
    const newActiveStatus = e.target.checked;

    setTableData(prev =>
      prev.map(d => d.id === item.id ? { ...d, active: newActiveStatus } : d)
    );

    try {
      const response = await fetch(
        `${BASE_URL}/products/${item.id}/active?active=${newActiveStatus}`,
        {
          method: 'GET', 
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('API failed');
      }
      if (onToggleActive) {
        onToggleActive(item.id, newActiveStatus);
      }
    } catch (error) {
      setTableData(prev =>
        prev.map(d => d.id === item.id ? { ...d, active: !newActiveStatus } : d)
      );
      alert('Không thể cập nhật trạng thái hiệu lực. Vui lòng thử lại!');
    }
  };

  const stripHtml = (htmlString: string) => {
    if (!htmlString) return '';
    return htmlString.replace(/<\/?[^>]+(>|$)/g, "");
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
            <th className="col-creator">Người tạo</th>
            <th className="col-reviewer">Người kiểm duyệt</th>
            <th>Phiên bản</th>
            <th style={{ width: '60px' }}></th>
          </tr>
        </thead>

        <tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item, index) => (
              <tr 
                key={item.id || index}
                onClick={() => handleViewDetail(item.id)}
              >
                <td>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                <td>
                  <CellWithTooltip text={stripHtml(item.name)} weight={500} />
                </td>
                <td className="col-group">
                  <CellWithTooltip text={item.productGroupName || ''} />
                </td>
                <td className="col-category">
                  <CellWithTooltip text={item.productCategoryName || ''} />
                </td>
                <td className="col-business">
                  <CellWithTooltip text={item.businessName || ''} />
                </td>

                <td>
                  <StatusBadge2 status={item.status} />
                </td>

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

                <td className="col-creator">
                  <CellWithTooltip text={formatApprovedBy(item.createdByFullName)} />
                </td>
                <td className="col-reviewer">
                  <CellWithTooltip text={formatApprovedBy(item.approvedBy)} />
                </td>
                <td>
                  <CellWithTooltip text={item.version ? `Phiên bản ${item.version}` : ''} weight={600} />
                </td>

                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn-action-view"
                    onClick={() => handleViewDetail(item.id)}
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