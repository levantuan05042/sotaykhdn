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
  loading?: boolean;
  selectable?: boolean;
  selectedKeys?: (string | number)[];
  onSelectionChange?: (selectedKeys: (string | number)[], selectedRows: T[]) => void;
  isRowSelectable?: (row: T) => boolean;
  onApproveAll?: () => void;
  onRejectAll?: () => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  emptyText = 'Không tìm thấy kết quả phù hợp',
  className = '',
  onRowClick,
  loading = false,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  isRowSelectable,
  onApproveAll,
  onRejectAll,
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

  // Selection helpers
  const selectableRowsInPage = paginatedData.filter(row => isRowSelectable ? isRowSelectable(row) : true);
  const selectableKeysInPage = selectableRowsInPage.map((row) => {
    const actualIdx = startIndex + paginatedData.indexOf(row);
    return keyExtractor ? keyExtractor(row, actualIdx) : actualIdx;
  });

  const isAllPageSelected = selectableKeysInPage.length > 0 && selectableKeysInPage.every(k => selectedKeys.includes(k));

  const handleToggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (isAllPageSelected || selectedKeys.length > 0) {
      const newKeys = selectedKeys.filter(k => !selectableKeysInPage.includes(k));
      const newRows = data.filter((r, idx) => {
        const key = keyExtractor ? keyExtractor(r, idx) : idx;
        return newKeys.includes(key);
      });
      onSelectionChange(newKeys, newRows);
    } else {
      const combinedKeys = Array.from(new Set([...selectedKeys, ...selectableKeysInPage]));
      const newRows = data.filter((r, idx) => {
        const key = keyExtractor ? keyExtractor(r, idx) : idx;
        return combinedKeys.includes(key);
      });
      onSelectionChange(combinedKeys, newRows);
    }
  };

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

  const effectiveColSpan = selectable ? columns.length + 1 : columns.length;

  return (
    <div className={`data-table-wrapper-container ${className}`} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            {selectable && selectedKeys.length > 0 ? (
              <tr className="table-batch-header-row">
                <th className="checkbox-cell">
                  <div
                    className="batch-minus-square-btn"
                    onClick={handleToggleSelectAll}
                    title="Bỏ chọn tất cả"
                  >
                    <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
                      <rect width="10" height="2" rx="1" fill="white" />
                    </svg>
                  </div>
                </th>
                <th colSpan={columns.length} className="batch-header-actions-cell">
                  <div className="batch-header-inline">
                    <span className="batch-header-count">
                      <strong>{selectedKeys.length} nội dung</strong> đang lựa chọn
                    </span>
                    {onApproveAll && (
                      <button
                        type="button"
                        className="btn-batch-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApproveAll();
                        }}
                      >
                        Duyệt tất cả
                      </button>
                    )}
                    {onRejectAll && (
                      <button
                        type="button"
                        className="btn-batch-pill"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRejectAll();
                        }}
                      >
                        Từ chối tất cả
                      </button>
                    )}
                  </div>
                </th>
              </tr>
            ) : (
              <tr>
                {selectable && (
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      className="data-table-checkbox"
                      checked={isAllPageSelected}
                      disabled={selectableKeysInPage.length === 0}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                )}
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
            )}
          </thead>
          <tbody>
            {loading ? (
              <>
                <tr className="table-loading-bar-row">
                  <td colSpan={effectiveColSpan}>
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
                    {selectable && (
                      <td className="checkbox-cell">
                        <div className="table-skeleton-bar" style={{ width: '18px', margin: '0 auto' }} />
                      </td>
                    )}
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
                const canSelect = isRowSelectable ? isRowSelectable(row) : true;
                const isSelected = selectedKeys.includes(key);

                return (
                  <tr 
                    key={key} 
                    onClick={() => onRowClick && onRowClick(row)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    className={`${onRowClick ? 'clickable-row' : ''} ${isSelected ? 'row-selected' : ''}`}
                  >
                    {selectable && (
                      <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="data-table-checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={() => {
                            if (!canSelect || !onSelectionChange) return;
                            let newKeys: (string | number)[] = [];
                            if (isSelected) {
                              newKeys = selectedKeys.filter(k => k !== key);
                            } else {
                              newKeys = [...selectedKeys, key];
                            }
                            const newRows = data.filter((r, idx) => {
                              const k = keyExtractor ? keyExtractor(r, idx) : idx;
                              return newKeys.includes(k);
                            });
                            onSelectionChange(newKeys, newRows);
                          }}
                        />
                      </td>
                    )}
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
                <td colSpan={effectiveColSpan} className="data-table-empty">
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
