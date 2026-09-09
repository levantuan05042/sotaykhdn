import React, { useState, useRef, useEffect } from 'react';
import './FilterDropdown.css';

export interface FilterOption {
  label: string;
  value: string;
}

export const FilterTag: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <div className="filter-tag">
    <span>{label}</span>
    <button type="button" className="btn-remove-tag" onClick={onRemove} aria-label={`Bỏ chọn ${label}`}>
      <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
        <path d="M15 5L5 15M5 5L15 15" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  </div>
);

export const ClearFilterButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ onClick, disabled = false, className = '' }) => (
  <button
    type="button"
    className={`btn-clear-filter ${className}`}
    onClick={onClick}
    disabled={disabled}
    title="Xóa bộ lọc"
  >
    <span className="btn-clear-filter-icon">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </span>
    <span>Xóa bộ lọc</span>
  </button>
);

interface FilterDropdownProps {
  label: string;
  options?: FilterOption[];
  selectedValue?: string | null;
  onSelect?: (value: string | null) => void;
  selectedValues?: string[];
  onChange?: (values: string[]) => void;
  multiple?: boolean;
  customContent?: React.ReactNode;
  className?: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  selectedValues,
  onChange,
  multiple = false,
  customContent,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const multiSelected = selectedValues ?? [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOptionSelected = (value: string) => {
    if (!value) return false;
    if (multiple) return multiSelected.includes(value);
    return selectedValue === value;
  };

  const handleOptionClick = (value: string) => {
    if (multiple) {
      if (!value) {
        onChange?.([]);
        return;
      }
      const next = multiSelected.includes(value)
        ? multiSelected.filter((v) => v !== value)
        : [...multiSelected, value];
      onChange?.(next);
      return;
    }

    onSelect?.(selectedValue === value || !value ? null : value);
    setIsOpen(false);
  };

  return (
    <div className={`dropdown-wrapper filter-dropdown-wrapper ${className}`} ref={dropdownRef}>
      <button
        className={`btn-dropdown filter-dropdown-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>{label}</span>
        <svg
          className={`chevron-icon ${isOpen ? 'rotate open' : ''}`}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu filter-dropdown-menu">
          {customContent ? (
            customContent
          ) : (
            options?.map((opt) => (
              <div
                key={opt.value || '__all__'}
                className={`menu-item filter-menu-item ${isOptionSelected(opt.value) ? 'selected' : ''}`}
                onClick={() => handleOptionClick(opt.value)}
              >
                <span>{opt.label}</span>
                {isOptionSelected(opt.value) && <i className="check-icon check-mark">✔</i>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
