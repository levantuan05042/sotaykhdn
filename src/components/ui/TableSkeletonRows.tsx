import {
  TABLE_SKELETON_ROWS,
  isNarrowSkeleton,
  isStackedNameSkeleton,
  skeletonBarWidth,
} from './tableSkeleton';

type SkeletonColumn = {
  key: string;
  align?: 'left' | 'center' | 'right';
};

interface TableSkeletonRowsProps {
  columns: SkeletonColumn[];
  selectable?: boolean;
}

export function TableSkeletonRows({ columns, selectable = false }: TableSkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: TABLE_SKELETON_ROWS }).map((_, rowIndex) => (
        <tr key={`skeleton-row-${rowIndex}`} className="table-skeleton-row">
          {selectable && (
            <td className="checkbox-cell">
              <div className="table-skeleton-bar table-skeleton-square" />
            </td>
          )}
          {columns.map((col, colIdx) => (
            <td key={`skeleton-cell-${col.key}-${colIdx}`} style={{ textAlign: col.align || 'left' }}>
              {isStackedNameSkeleton(col.key, rowIndex) ? (
                <div className="table-skeleton-stack">
                  <div className="table-skeleton-bar" style={{ width: skeletonBarWidth(col.key, colIdx, rowIndex) }} />
                  <div className="table-skeleton-bar" style={{ width: '42%' }} />
                </div>
              ) : (
                <div
                  className={`table-skeleton-bar${isNarrowSkeleton(col.key) ? ' table-skeleton-square' : ''}`}
                  style={{ width: skeletonBarWidth(col.key, colIdx, rowIndex) }}
                />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface LoadingPaginationFooterProps {
  itemLabel?: string;
}

export function LoadingPaginationFooter({ itemLabel = 'sản phẩm' }: LoadingPaginationFooterProps) {
  return (
    <div className="table-pagination-footer table-pagination-footer--skeleton">
      <div className="pagination-info">
        <span>Hiển thị 1 -</span>
        <select className="pagination-size-select" value={20} tabIndex={-1} onChange={() => undefined}>
          <option value={20}>20</option>
        </select>
        <span> trên 1200 {itemLabel}</span>
      </div>
      <div className="pagination-controls">
        <button type="button" className="pagination-btn" tabIndex={-1}>
          &lsaquo;
        </button>
        <button type="button" className="pagination-btn active" tabIndex={-1}>
          1
        </button>
        <button type="button" className="pagination-btn" tabIndex={-1}>
          2
        </button>
        <button type="button" className="pagination-btn" tabIndex={-1}>
          3
        </button>
        <span className="pagination-dots">...</span>
        <button type="button" className="pagination-btn" tabIndex={-1}>
          8
        </button>
        <button type="button" className="pagination-btn" tabIndex={-1}>
          9
        </button>
        <button type="button" className="pagination-btn" tabIndex={-1}>
          10
        </button>
        <button type="button" className="pagination-btn" tabIndex={-1}>
          &rsaquo;
        </button>
      </div>
    </div>
  );
}
