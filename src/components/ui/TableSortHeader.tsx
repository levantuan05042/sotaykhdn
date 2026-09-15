import React from 'react';
import type { SortDir } from './tableSort';

type TableSortHeaderProps = {
  label: string;
  active: boolean;
  direction: SortDir;
  align?: 'left' | 'center' | 'right';
  onClick: () => void;
};

const TableSortHeader: React.FC<TableSortHeaderProps> = ({
  label,
  active,
  direction,
  align = 'left',
  onClick,
}) => {
  return (
    <button
      type="button"
      className={`th-sort ${active ? 'is-active' : ''}`}
      onClick={onClick}
      style={{
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      <span className="th-sort-label">{label}</span>
      <span className={`th-sort-icons ${active ? `is-${direction}` : ''}`} aria-hidden="true">
        <svg className="th-sort-up" width="8" height="5" viewBox="0 0 8 5" fill="none">
          <path d="M1 4L4 1L7 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg className="th-sort-down" width="8" height="5" viewBox="0 0 8 5" fill="none">
          <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
};

export default TableSortHeader;
