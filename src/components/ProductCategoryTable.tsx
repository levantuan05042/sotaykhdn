import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatApprovedBy } from '../utils/formatUtils';
import { BASE_URL } from '../config/apiConfig';
import StatusBadge2 from './ui/StatusBadge2';
import './ProductCategoryTable.css';

interface ProductCategory {
  id: string;
  name: string;
  groupName: string;
  status: string;
  active?: boolean;
  createdByFullName?: string | null;
  approvedBy?: string | null;
  version?: number | null;
}

interface Props {
  data: ProductCategory[];
  onToggleActive?: (id: any, newActiveStatus: boolean) => void;
}

const ProductCategoryTable: React.FC<Props> = ({ data, onToggleActive }) => {
  const navigate = useNavigate();
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [tableData, setTableData] = useState<ProductCategory[]>([]);
  const [warningData, setWarningData] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: '',
    message: ''
  });

  useEffect(() => {
    setTableData(data);
    setCurrentPage(1);
  }, [data]);

  const totalItems = tableData?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return tableData.slice(startIndex, startIndex + itemsPerPage);
  }, [tableData, currentPage, itemsPerPage]);

  const handleViewDetail = (id: string) => {
    navigate(`/product-category/${id}`);
  };

  const handleToggleActive = async (item: ProductCategory, currentActive: boolean) => {
    const newActiveStatus = !currentActive;

    setTableData(prevData =>
      prevData.map(d =>
        d.id === item.id ? { ...d, active: newActiveStatus } : d
      )
    );

    try {
      const response = await fetch(`${BASE_URL}/product-category/${item.id}/active?active=${newActiveStatus}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Không thể thay đổi trạng thái');
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
        title: `Không thể ẩn danh mục: "${item.name}"`,
        message: "Danh mục sản phẩm này đang chứa các sản phẩm nghiệp vụ bên trong."
      });
    }
  };

  const renderActiveToggle = (item: ProductCategory) => {
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

  const startRecord = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="product-table-container">
        <table className="product-table table-text-base">
          <thead>
            <tr>
              <th className="px-40 rounded-l-12 w-24">STT</th>
              <th>Tên danh mục sản phẩm</th>
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
                const sttVal = (currentPage - 1) * itemsPerPage + index + 1;
                const activeVal = item.active ? 'Hiện' : 'Ẩn';
                const versionVal = item.version ? `Phiên bản ${item.version}` : '---';
                const createdVal = formatApprovedBy(item.createdByFullName);
                const approvedVal = formatApprovedBy(item.approvedBy);
                const groupVal = item.groupName || '---';

                return (
                  <tr
                    key={item.id || index}
                    onClick={() => handleViewDetail(item.id)}
                  >
                    <td className="px-40">
                      <div className="custom-tooltip-container">
                        <span className="truncate-text">{sttVal}</span>
                        <div className="custom-tooltip">{sttVal}</div>
                      </div>
                    </td>

                    <td>
                      <div className="custom-tooltip-container">
                        <span className="truncate-text">{item.name}</span>
                        <div className="custom-tooltip">{item.name}</div>
                      </div>
                    </td>

                    <td>
                      <div className="custom-tooltip-container">
                        <span className="truncate-text">{groupVal}</span>
                        <div className="custom-tooltip">{groupVal}</div>
                      </div>
                    </td>

                    <td>
                      <div className="custom-tooltip-container">
                        <StatusBadge2 status={item.status} />
                        <div className="custom-tooltip">{item.status}</div>
                      </div>
                    </td>

                    <td>
                      <div className="custom-tooltip-container">
                        {renderActiveToggle(item)}
                        <div className="custom-tooltip">{activeVal}</div>
                      </div>
                    </td>

                    <td>
                      <div className="custom-tooltip-container">
                        <span className="truncate-text">{createdVal}</span>
                        <div className="custom-tooltip">{createdVal}</div>
                      </div>
                    </td>

                    <td>
                      <div className="custom-tooltip-container">
                        <span className="truncate-text">{approvedVal}</span>
                        <div className="custom-tooltip">{approvedVal}</div>
                      </div>
                    </td>

                    <td style={{ color: '#053E2B', fontFamily: 'Inter, sans-serif', fontSize: '16px', fontWeight: 600, lineHeight: '24px' }}>
                      <div className="custom-tooltip-container">
                        <span className="truncate-text">{versionVal}</span>
                        <div className="custom-tooltip">{versionVal}</div>
                      </div>
                    </td>

                    <td className="px-40 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="custom-tooltip-container" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn-view-detail"
                          onClick={() => handleViewDetail(item.id)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <td colSpan={9} className="text-center py-20 text-gray-400">
                  Không có dữ liệu hiển thị
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer-pagination">
        <div className="pagination-info">
          Hiển thị{' '}
          <select
            className="select-items-per-page"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>{' '}
          bản ghi/trang (Hiển thị {startRecord} - {endRecord} trên {totalItems} bản ghi)
        </div>

        {totalPages > 1 && (
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
                    {prevPage && page - prevPage > 1 && <span className="pagination-dots">...</span>}
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
        )}
      </div>

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

export default ProductCategoryTable;