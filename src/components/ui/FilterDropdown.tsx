import React, { useState, useRef, useEffect } from 'react';
import './FilterDropdown.css';

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterDropdownProps {
  label: string;
  options?: FilterOption[];
  selectedValue?: string | null;
  onSelect?: (value: string | null) => void;
  customContent?: React.ReactNode;
  className?: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  customContent,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options?.find((opt) => opt.value === selectedValue);
  const buttonLabel = selectedOption ? selectedOption.label : label;

  return (
    <div className={`filter-dropdown-wrapper ${className}`} ref={dropdownRef}>
      <button
        className={`filter-dropdown-btn ${isOpen ? 'active' : ''} ${selectedValue ? 'has-value' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>{buttonLabel}</span>
        <svg
          className={`chevron-icon ${isOpen ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="filter-dropdown-menu">
          {customContent ? (
            customContent
          ) : (
            options?.map((opt) => (
              <button
                key={opt.value}
                className={`filter-menu-item ${selectedValue === opt.value ? 'selected' : ''}`}
                onClick={() => {
                  if (onSelect) {
                    onSelect(selectedValue === opt.value ? null : opt.value);
                  }
                  setIsOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {selectedValue === opt.value && <span className="check-mark">✓</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
