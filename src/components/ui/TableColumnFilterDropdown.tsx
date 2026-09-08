import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface FilterOption {
  label: string;
  value: string;
}

export interface TableColumnFilterDropdownProps {
  label: string;
  options: FilterOption[];
  // Hỗ trợ chọn nhiều (multi-select)
  selectedValues?: string[];
  onSelectValues?: (values: string[]) => void;
  // Hỗ trợ tương thích ngược chọn đơn
  selectedValue?: string | null;
  onSelect?: (value: string | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  hasSearch?: boolean;
  searchPlaceholder?: string;
  wrapperRef?: React.RefObject<HTMLDivElement>;
}

export const TableColumnFilterDropdown: React.FC<TableColumnFilterDropdownProps> = ({
  label,
  options = [],
  selectedValues,
  onSelectValues,
  selectedValue,
  onSelect,
  isOpen,
  onToggle,
  hasSearch = false,
  searchPlaceholder = 'Tìm kiếm...',
  wrapperRef,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const safeOptions = Array.isArray(options) ? options : [];

  // Chuẩn hóa danh sách các giá trị đang được chọn
  const currentSelected: string[] = selectedValues !== undefined
    ? selectedValues
    : selectedValue ? [selectedValue] : [];

  const isMultiSelect = Boolean(onSelectValues || selectedValues !== undefined);

  const filteredOptions = hasSearch && searchTerm.trim()
    ? safeOptions.filter((opt) => opt?.label?.toLowerCase().includes(searchTerm.toLowerCase().trim()))
    : safeOptions;

  const handleToggleOption = (val: string) => {
    if (isMultiSelect && onSelectValues) {
      if (currentSelected.includes(val)) {
        onSelectValues(currentSelected.filter((v) => v !== val));
      } else {
        onSelectValues([...currentSelected, val]);
      }
    } else if (onSelect) {
      onSelect(currentSelected.includes(val) ? null : val);
      onToggle();
    }
  };

  const handleSelectAll = () => {
    if (!isMultiSelect || !onSelectValues) return;
    if (currentSelected.length === safeOptions.length) {
      onSelectValues([]);
    } else {
      onSelectValues(safeOptions.map((opt) => opt.value));
    }
  };

  const hasActiveFilter = currentSelected.length > 0;
  const isAllSelected = safeOptions.length > 0 && currentSelected.length === safeOptions.length;

  const localButtonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      const btn = localButtonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = 260;
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - menuWidth - 16);
      }
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(16, left),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (localButtonRef.current?.contains(target)) return;
      if (target.closest('.table-filter-dropdown-menu')) return;
      onToggle();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div className="dropdown-wrapper" ref={wrapperRef} style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, whiteSpace: 'nowrap' }}>
      <button 
        ref={localButtonRef}
        className="btn-dropdown" 
        onClick={onToggle}
        type="button"
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          gap: '6px',
          height: '100%',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontWeight: hasActiveFilter ? 600 : 500, color: hasActiveFilter ? '#AE1C3F' : '#171717', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        {hasActiveFilter && (
          <span 
            style={{
              backgroundColor: '#AE1C3F',
              color: '#FFFFFF',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '11px',
              fontWeight: 600,
              lineHeight: 1.2,
              flexShrink: 0,
            }}
          >
            {currentSelected.length}
          </span>
        )}
        <svg 
          className={`chevron-icon ${isOpen ? 'rotate' : ''}`} 
          width="18" 
          height="18" 
          viewBox="0 0 20 20" 
          fill="none"
          style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke={hasActiveFilter ? '#AE1C3F' : '#737373'} strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && coords && createPortal(
        <div 
          className="dropdown-menu table-filter-dropdown-menu"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            minWidth: '220px',
            maxWidth: '320px',
            background: '#FFFFFF',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            padding: '6px 0',
            zIndex: 999999,
            boxShadow: '0px 10px 25px -5px rgba(0, 0, 0, 0.15)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {hasSearch && (
            <div style={{ padding: '6px 10px 8px', borderBottom: '1px solid #F3F4F6' }}>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '13px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                autoFocus
              />
            </div>
          )}

          {isMultiSelect && safeOptions.length > 1 && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                borderBottom: '1px solid #F3F4F6',
                fontSize: '12px',
                color: '#6B7280',
              }}
            >
              <span>{currentSelected.length}/{safeOptions.length} đã chọn</span>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#AE1C3F',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12px',
                  padding: 0,
                }}
              >
                {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
          )}

          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = currentSelected.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    className={`menu-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleOption(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      backgroundColor: isSelected ? '#FDF2F4' : 'transparent',
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#AE1C3F' : '#374151',
                      gap: '10px',
                      userSelect: 'none',
                    }}
                  >
                    <div 
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: isSelected ? '1.5px solid #AE1C3F' : '1.5px solid #D1D5DB',
                        backgroundColor: isSelected ? '#AE1C3F' : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s',
                      }}
                    >
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.8 7L9 1" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {opt.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '10px 14px', fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>
                Không có dữ liệu
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TableColumnFilterDropdown;
