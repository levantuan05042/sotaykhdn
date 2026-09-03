import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge2 from './ui/StatusBadge2';
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
}

interface CellWithTooltipProps {
  text?: string | null;
  style?: React.CSSProperties;
  className?: string;
}

const CellWithTooltip: React.FC<CellWithTooltipProps> = ({ text, style, className }) => {
  const content = text && text.trim() !== '' ? text : '---';

  if (content === '---') {
    return <span style={style} className={className}>{content}</span>;
  }

  return (
    <div className="truncate-wrapper">
      <span className={`truncate-text ${className || ''}`} style={style}>
        {content}
      </span>
      <span className="custom-tooltip">{content}</span>
    </div>
  );
};

const stripHtml = (htmlString?: string | null) => {
  if (!htmlString) return '';
  return htmlString.replace(/<\/?[^>]+(>|$)/g, "");
};

const ProductCategoryTable: React.FC<Props> = ({ data }) => {
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const activeData = useMemo(() => {
    return (data || []).filter(item => item.status?.toUpperCase() === 'REJECTED');
  }, [data]);

  const totalPages = Math.ceil(activeData.length / ITEMS_PER_PAGE);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return activeData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activeData, currentPage]);

  const handleViewDetail = (id: string) => {
    navigate(`/products/${id}`);
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
              <tr key={item.id || index}>
                <td>
                  {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                </td>
                <td>
                  <CellWithTooltip 
                    text={stripHtml(item.name)} 
                    style={{ fontWeight: 500 }} 
                  />
                </td>
                <td className="col-group">
                  <CellWithTooltip text={item.productGroupName} />
                </td>
                <td className="col-category">
                  <CellWithTooltip text={item.productCategoryName} />
                </td>
                <td className="col-business">
                  <CellWithTooltip text={item.businessName} />
                </td>
                <td>
                  <StatusBadge2 status={item.status} />
                </td>
                <td>
                  {item.active ? (
                    <CellWithTooltip text="Đang hiển thị" className="text-success" />
                  ) : (
                    <CellWithTooltip text="Đã ẩn" className="text-danger" />
                  )}
                </td>
                <td>
                  <CellWithTooltip text={item.createdByFullName} />
                </td>
                <td>
                  <CellWithTooltip text={item.approvedBy} />
                </td>
                <td>
                  <CellWithTooltip 
                    text={item.version ? `Phiên bản ${item.version}` : ''} 
                    style={{ fontWeight: 600 }} 
                  />
                </td>
                <td>
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