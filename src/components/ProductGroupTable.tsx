import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatApprovedBy } from '../utils/formatUtils';
import { BASE_URL } from '../config/apiConfig';
import StatusBadge2 from './ui/StatusBadge2';
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

  const handleToggleActive = async (item: ProductGroup, currentActive: boolean) => {
    const newActiveStatus = !currentActive;

    setTableData(prevData => 
      prevData.map(d => 
        d.id === item.id ? { ...d, active: newActiveStatus } : d
      )
    );

    try {
      const response = await fetch(`${BASE_URL}/product-groups/${item.id}/active?active=${newActiveStatus}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Lỗi cập nhật');
      }

      if (onToggleActive) {
        onToggleActive(item.id, newActiveStatus);
      }

    } catch (error) {
      setTableData(prevData => 
        prevData.map(d => 
          d.id === item.id ? { ...d, active: currentActive } : d
        )
      );

      setWarningData({
        show: true,
        title: `Không thể ẩn nhóm: "${item.name}"`,
        message: "Nhóm sản phẩm này đang chứa các danh mục hoặc sản phẩm bên trong."
      });
    }
  };

  const renderActiveToggle = (item: ProductGroup) => {
    const disabledStatuses = ['PENDING_APPROVAL', 'REJECTED', 'DRAFT', 'NEEDS_REVISION'];
    const isDisabled = disabledStatuses.includes(item.status);
    const isActive = item.active || false;

    return (
      <div className="toggle-wrapper" onClick={(e) => e.stopPropagation()}>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={isActive} 
            disabled={isDisabled}
            onChange={() => {
              if (!isDisabled) {
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="product-table-container">
        <table className="product-table table-text-base">
          <colgroup>
            <col style={{ width: '70px' }} />
            <col style={{ width: '220px' }} />
            <col style={{ width: '160px' }} />
            <col style={{ width: '150px' }} />
            <col style={{ width: '220px' }} />
            <col style={{ width: '220px' }} />
            <col style={{ width: '140px' }} />
            <col style={{ width: '80px' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="rounded-l-12 text-center">STT</th>
              <th>Tên nhóm sản phẩm</th>
              <th>Trạng thái</th>
              <th>Hiệu lực</th>
              <th>Người tạo</th>
              <th>Người kiểm duyệt</th>
              <th>Phiên bản</th>
              <th className="rounded-r-12"></th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, index) => {
                const stt = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                
                return (
                  <tr key={item.id || index} onClick={() => handleViewDetail(item.id)}>
                    
                    {/* 1. Cột STT */}
                    <td className="text-center tooltip-cell" style={{ overflow: 'visible' }}>
                      <div className="custom-tooltip-container" style={{ justifyContent: 'center' }}>
                        <span>{stt}</span>
                      </div>
                    </td>
                    
                    {/* 2. Cột Tên nhóm sản phẩm */}
                    <td className="tooltip-cell" style={{ overflow: 'visible' }}>
                      <div className="custom-tooltip-container">
                        <span className="truncate-text" title={item.name}>{item.name}</span>
                        <div className="custom-tooltip">{item.name}</div>
                      </div>
                    </td>
                    
                    {/* 3. Cột Trạng thái */}
                    <td className="tooltip-cell" style={{ overflow: 'visible' }}>
                      <div className="custom-tooltip-container">
                        <StatusBadge2 status={item.status} />
                      </div>
                    </td>
                    
                    {/* 4. Cột Hiệu lực */}
                    <td className="tooltip-cell" style={{ overflow: 'visible' }}>
                      <div className="custom-tooltip-container">
                        {renderActiveToggle(item)}
                      </div>
                    </td>
                    
                    {/* 5. Cột Người tạo */}
                    <td className="tooltip-cell" style={{ overflow: 'visible' }}>
                      <div className="custom-tooltip-container">
                        <span className="truncate-text" title={formatApprovedBy(item.createdByFullName) || ''}>
                          {formatApprovedBy(item.createdByFullName)}
                        </span>
                        <div className="custom-tooltip">{formatApprovedBy(item.createdByFullName)}</div>
                      </div>
                    </td>
                    
                    {/* 6. Cột Người kiểm duyệt */}
                    <td className="tooltip-cell" style={{ overflow: 'visible' }}>
                      <div className="custom-tooltip-container">
                        <span className="truncate-text" title={formatApprovedBy(item.approvedBy) || ''}>
                          {formatApprovedBy(item.approvedBy)}
                        </span>
                        <div className="custom-tooltip">{formatApprovedBy(item.approvedBy)}</div>
                      </div>
                    </td>
                    
                    {/* 7. Cột Phiên bản */}
                    <td className="tooltip-cell" style={{ color: '#053E2B', fontWeight: 600, overflow: 'visible' }}>
                      <div className="custom-tooltip-container">
                        <span className="truncate-text" title={item.version ? `Phiên bản ${item.version}` : ''}>
                          {item.version ? `Phiên bản ${item.version}` : '---'}
                        </span>
                        <div className="custom-tooltip">{item.version ? `Phiên bản ${item.version}` : '---'}</div>
                      </div>
                    </td>
                    
                    {/* 8. Cột Nút hành động */}
                    <td className="text-right tooltip-cell" style={{ overflow: 'visible' }} onClick={(e) => e.stopPropagation()}>
                      <div className="custom-tooltip-container" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn-view-detail" onClick={() => handleViewDetail(item.id)} title="Xem chi tiết">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-20 text-gray-400">Không có dữ liệu hiển thị</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-wrapper" style={{ marginTop: '12px', marginBottom: '0px' }}>
          <div className="pagination-container">
            <button className="pagination-arrow" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>←</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1))
              .map((page, index, arr) => {
                const prevPage = arr[index - 1];
                return (
                  <React.Fragment key={page}>
                    {prevPage && page - prevPage > 1 && <span className="pagination-dots">...</span>}
                    <button className={`pagination-number ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
            <button className="pagination-arrow" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => prev + 1)}>→</button>
          </div>
        </div>
      )}

      {warningData.show && (
        <div className="warning-toast-wrapper">
          <div className="warning-toast-card">
            <div className="warning-toast-icon-container">
              <div className="warning-bg-outer"></div>
              <div className="warning-bg-inner"></div>
              <svg className="warning-toast-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            
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