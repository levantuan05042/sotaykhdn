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
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  emptyText = 'Không tìm thấy kết quả phù hợp',
  className = '',
  onRowClick,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const totalRecords = data.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // Safeguard current page
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
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
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => {
                const actualIndex = startIndex + index;
                const key = keyExtractor ? keyExtractor(row, actualIndex) : actualIndex;
                return (
                  <tr 
                    key={key} 
                    onClick={() => onRowClick && onRowClick(row)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    className={onRowClick ? 'clickable-row' : ''}
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
              setCurrentPage(1);
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
            onClick={() => setCurrentPage(v => Math.max(1, v - 1))}
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
                onClick={() => setCurrentPage(p as number)}
              >
                {p}
              </button>
            );
          })}

          <button 
            className="pagination-btn"
            disabled={safeCurrentPage === totalPages}
            onClick={() => setCurrentPage(v => Math.min(totalPages, v + 1))}
          >
            &rsaquo;
          </button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
