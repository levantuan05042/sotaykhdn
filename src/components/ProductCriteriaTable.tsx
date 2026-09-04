import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatApprovedBy } from '../utils/formatUtils';
import StatusBadge2 from './ui/StatusBadge2';
import './ProductCriteriaTable.css'; 

interface ProductGroup {
  id: string;
  name: string;
  status: string | null;
}

interface ProductCriteria {
  id: string;
  code: string;
  name: string;
  isRequired?: boolean;
  status: string;
  productGroups: ProductGroup[];
  createdAt: string;
  updatedAt: string;
  active?: boolean;
  createdByFullName?: string | null;
  approvedBy?: string | null;
  version?: number | null;  
}

interface Props {
  data: ProductCriteria[];
  onToggleActive?: (id: any, newActiveStatus: boolean) => void;
}

const STATUS_OPTIONS = [
  { label: 'Đang hoạt động', value: 'ACTIVE' },
  { label: 'Lưu nháp', value: 'DRAFT' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
  { label: 'Từ chối', value: 'REJECTED' },
  { label: 'Lưu trữ', value: 'ARCHIVED' }
];

const ProductCriteriaTable: React.FC<Props> = ({ data, onToggleActive }) => {
  const navigate = useNavigate();
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState<ProductCriteria[]>([]);
  const [warningData, setWarningData] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    setTableData(data);
    setCurrentPage(1);
  }, [data]);

  const totalPages = Math.ceil((tableData?.length || 0) / ITEMS_PER_PAGE);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return tableData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [tableData, currentPage]);

  const handleViewDetail = (id: string) => {
    navigate(`/criteria-management/${id}`);
  };

  const handleToggleActive = async (item: ProductCriteria, currentActive: boolean) => {
    const newActiveStatus = !currentActive;

    setTableData(prevData => 
      prevData.map(d => 
        d.id === item.id ? { ...d, active: newActiveStatus } : d
      )
    );

    try {
      const response = await fetch(`http://localhost:8082/api/v1/criteria/${item.id}/active?active=${newActiveStatus}`, {
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
      console.error(error);
      setTableData(prevData => 
        prevData.map(d => 
          d.id === item.id ? { ...d, active: currentActive } : d
        )
      );

      setWarningData({
        show: true,
        title: `Không thể ẩn tiêu chí: "${item.name}"`,
        message: "Tiêu chí này đang được sử dụng hoặc gặp sự cố khi cập nhật."
      });
    }
  };

  const renderActiveToggle = (item: ProductCriteria) => {
    const disabledStatuses = ['PENDING_APPROVAL', 'REJECTED', 'DRAFT', 'NEEDS_REVISION'];
    const isDisabled = disabledStatuses.includes(item.status);
    const isActive = item.active || false;

    return (
      <div 
        className="toggle-wrapper"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={isActive} 
            disabled={isDisabled}
            onChange={(e) => {
              e.stopPropagation();
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
    <div className="product-table-container">
      <table className="product-table table-text-base">
        <thead>
          <tr>
            <th className="px-40 rounded-l-12 w-24">STT</th>
            <th>Mã tiêu chí</th>
            <th>Tên tiêu chí</th>
            <th>Nhóm sản phẩm</th>
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
            paginatedData.map((item, index) => {
              const activeGroups = item.productGroups && Array.isArray(item.productGroups)
                ? item.productGroups.filter(group => group.status === 'ACTIVE')
                : [];
              
              const groupNamesText = activeGroups.length > 0
                ? activeGroups.map(group => group.name).join(', ')
                : '---';

              const statusText = STATUS_OPTIONS.find(opt => opt.value === item.status)?.label || item.status;
              const serialNumber = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

              return (
                <tr 
                  key={item.id || index}
                  onClick={() => handleViewDetail(item.id)}
                >
                  <td className="px-40">
                    <div className="custom-tooltip-container">
                      <span className="truncate-text">{serialNumber}</span>
                      <div className="custom-tooltip">{serialNumber}</div>
                    </div>
                  </td>

                  <td>
                    <div className="custom-tooltip-container">
                      <span className="truncate-text">{item.code}</span>
                      <div className="custom-tooltip">{item.code}</div>
                    </div>
                  </td>

                  <td>
                    <div className="custom-tooltip-container">
                      <span className="truncate-text">
                        {item.name}
                        {item.isRequired && (
                          <span style={{ color: 'red', marginLeft: '4px' }}>*</span>
                        )}
                      </span>
                      <div className="custom-tooltip">
                        {item.name}
                        {item.isRequired && ' *'}
                      </div>
                    </div>
                  </td>
                  
                  <td>
                    <div className="custom-tooltip-container">
                      <span className="truncate-text">{groupNamesText}</span>
                      <div className="custom-tooltip">{groupNamesText}</div>
                    </div>
                  </td>

                  <td>
                    <div className="custom-tooltip-container">
                      <StatusBadge2 status={item.status} />
                      <div className="custom-tooltip">{statusText}</div>
                    </div>
                  </td>

                  <td>
                    <div className="custom-tooltip-container">
                      {renderActiveToggle(item)}
                      <div className="custom-tooltip">{item.active ? 'Hiện' : 'Ẩn'}</div>
                    </div>
                  </td>

                  <td>
                    <div className="custom-tooltip-container">
                      <span className="truncate-text">{formatApprovedBy(item.createdByFullName)}</span>
                      <div className="custom-tooltip">{formatApprovedBy(item.createdByFullName)}</div>
                    </div>
                  </td>

                  <td>
                    <div className="custom-tooltip-container">
                      <span className="truncate-text">{formatApprovedBy(item.approvedBy)}</span>
                      <div className="custom-tooltip">{formatApprovedBy(item.approvedBy)}</div>
                    </div>
                  </td>

                  <td>
                    <div className="custom-tooltip-container">
                      <span className="truncate-text" style={{ color: '#053E2B', fontWeight: 600 }}>
                        {item.version ? `Phiên bản ${item.version}` : '---'}
                      </span>
                      <div className="custom-tooltip">
                        {item.version ? `Phiên bản ${item.version}` : '---'}
                      </div>
                    </div>
                  </td>

                  <td className="px-40 text-right">
                    <div className="custom-tooltip-container" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn-view-detail"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(item.id);
                        }}
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
                      <div className="custom-tooltip">Xem chi tiết</div>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={10} className="text-center py-20 text-gray-400">
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

export default ProductCriteriaTable;