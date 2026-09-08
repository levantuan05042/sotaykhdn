import React, { useState, useEffect } from 'react';
import './DataTable.css';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (row: T, index: number) => string | number;
  emptyText?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string;
  loading?: boolean;
  page?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  emptyText = 'Không tìm thấy kết quả phù hợp',
  className = '',
  onRowClick,
  getRowClassName,
  loading = false,
  page,
  onPageChange,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isControlled = page !== undefined;
  const activePage = isControlled ? page : currentPage;

  const changePage = (newPage: number) => {
    setCurrentPage(newPage);
    if (onPageChange) {
      onPageChange(newPage);
    }
  };

  // Reset to page 1 when data changes only if uncontrolled
  useEffect(() => {
    if (!isControlled) {
      setCurrentPage(1);
    }
  }, [data, isControlled]);

  const totalRecords = data.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Safeguard current page
  const safeCurrentPage = Math.min(Math.max(1, activePage), totalPages);
  
  const startIndex = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);

  const paginatedData = data.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={`data-table-wrapper-container ${className}`} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                <tr className="table-loading-bar-row">
                  <td colSpan={columns.length}>
                    <div className="table-loading-bar">
                      <div className="loading-dots-pulse">
                        <span className="loading-dot-pulse-item"></span>
                        <span className="loading-dot-pulse-item"></span>
                        <span className="loading-dot-pulse-item"></span>
                      </div>
                      <strong>Đang tải dữ liệu...</strong>
                      <span style={{ fontSize: 'inherit', color: 'inherit' }}>Vui lòng chờ trong giây lát</span>
                    </div>
                  </td>
                </tr>
                {Array.from({ length: 6 }).map((_, rowIndex) => (
                  <tr key={`skeleton-row-${rowIndex}`}>
                    {columns.map((col, colIdx) => (
                      <td key={`skeleton-cell-${colIdx}`} style={{ textAlign: col.align || 'left' }}>
                        <div
                          className="table-skeleton-bar"
                          style={{
                            width: col.key === 'stt' ? '24px' : col.key === 'actions' ? '40px' : `${Math.max(40, 80 + (colIdx % 3) * 30)}px`
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row, index) => {
                const actualIndex = startIndex + index;
                const key = keyExtractor ? keyExtractor(row, actualIndex) : actualIndex;
                return (
                  <tr 
                    key={key} 
                    onClick={() => onRowClick && onRowClick(row)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    className={[onRowClick ? 'clickable-row' : '', getRowClassName ? getRowClassName(row) : ''].filter(Boolean).join(' ')}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        style={{
                          textAlign: col.align || 'left',
                        }}
                      >
                        {col.render ? col.render(row, actualIndex) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length} className="data-table-empty">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-pagination-footer">
        <div className="pagination-info">
          <span>Hiển thị </span>
          <select 
            className="pagination-size-select" 
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              changePage(1);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span> bản ghi/trang (Hiển thị {startIndex + 1} - {endIndex} trên {totalRecords} bản ghi)</span>
        </div>

        <div className="pagination-controls">
          <button 
            className="pagination-btn"
            disabled={safeCurrentPage === 1}
            onClick={() => changePage(Math.max(1, safeCurrentPage - 1))}
          >
            &lsaquo;
          </button>
          
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return <span key={`dots-${idx}`} className="pagination-dots">...</span>;
            }
            return (
              <button
                key={`page-${p}`}
                className={`pagination-btn ${safeCurrentPage === p ? 'active' : ''}`}
                onClick={() => changePage(p as number)}
              >
                {p}
              </button>
            );
          })}

          <button 
            className="pagination-btn"
            disabled={safeCurrentPage === totalPages}
            onClick={() => changePage(Math.min(totalPages, safeCurrentPage + 1))}
          >
            &rsaquo;
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
