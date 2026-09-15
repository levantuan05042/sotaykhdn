import React from 'react';
import { matchesSearch } from '../../utils/searchText';

export const SUPER_GROUP_OPTIONS = [
  { label: 'Sản phẩm dịch vụ', value: 'SERVICE' },
  { label: 'Sản phẩm bảo hiểm', value: 'INSURANCE' },
  { label: 'Chương trình ưu đãi', value: 'PROGRAM' }
];

export type NestedGroupOption = {
  label: string;
  value: string;
  hidden?: boolean;
  superGroup?: string;
  fromCatalog?: boolean;
};

export const getSuperGroupLabel = (value?: string | null) => {
  if (!value) return '';
  return SUPER_GROUP_OPTIONS.find(o => o.value === value)?.label || value;
};

export type SelectedGroupPart = {
  key: string;
  text: string;
  hidden?: boolean;
  removeIds: string[];
};

const toId = (value: unknown) => String(value ?? '');

export const getSelectedGroupsParts = (
  allOptions: NestedGroupOption[],
  selectedIds: string[],
): SelectedGroupPart[] => {
  const idSet = new Set(selectedIds.map(toId).filter(Boolean));
  const parts: SelectedGroupPart[] = [];
  const usedIds = new Set<string>();

  SUPER_GROUP_OPTIONS.forEach((sg) => {
    const ofSuper = allOptions.filter(opt => String(opt.superGroup || '') === sg.value);
    const catalogOfSuper = ofSuper.filter(opt => !opt.hidden && opt.fromCatalog !== false);
    const selectedCatalog = catalogOfSuper.filter(opt => idSet.has(toId(opt.value)));
    const selectedHidden = ofSuper.filter(opt => opt.hidden && idSet.has(toId(opt.value)));
    if (selectedCatalog.length === 0 && selectedHidden.length === 0) return;

    [...selectedCatalog, ...selectedHidden].forEach(opt => usedIds.add(toId(opt.value)));

    if (catalogOfSuper.length > 0 && selectedCatalog.length === catalogOfSuper.length) {
      parts.push({
        key: sg.value,
        text: `Tất cả nhóm ${sg.label}`,
        removeIds: [...selectedCatalog, ...selectedHidden].map(opt => toId(opt.value)),
      });
      return;
    }

    [...selectedCatalog, ...selectedHidden].forEach(opt => {
      parts.push({
        key: toId(opt.value),
        text: opt.label,
        hidden: opt.hidden,
        removeIds: [toId(opt.value)],
      });
    });
  });

  allOptions.forEach((opt) => {
    const id = toId(opt.value);
    if (!idSet.has(id) || usedIds.has(id)) return;
    usedIds.add(id);
    parts.push({ key: id, text: opt.label, hidden: opt.hidden, removeIds: [id] });
  });

  selectedIds.forEach((rawId) => {
    const id = toId(rawId);
    if (!id || usedIds.has(id)) return;
    usedIds.add(id);
    const opt = allOptions.find(item => toId(item.value) === id);
    parts.push({ key: id, text: opt?.label || id, hidden: opt?.hidden, removeIds: [id] });
  });

  return parts;
};

export const formatSelectedGroupsLabelText = (
  allOptions: NestedGroupOption[],
  selectedIds: string[],
  emptyText: string,
): string => {
  const parts = getSelectedGroupsParts(allOptions, selectedIds);
  if (parts.length === 0) return emptyText;
  return parts.map(part => part.text).join(', ');
};

export const formatSelectedGroupsLabel = (
  allOptions: NestedGroupOption[],
  selectedIds: string[],
  emptyText: string,
): React.ReactNode => {
  if (selectedIds.length === 0) return emptyText;

  const parts = getSelectedGroupsParts(allOptions, selectedIds);
  const shown = parts.slice(0, 3);
  const remaining = parts.length - shown.length;

  return (
    <>
      {shown.map((part, index) => (
        <span
          key={part.key}
          title={part.hidden ? 'Nhóm đang bị ẩn' : undefined}
          style={{
            opacity: part.hidden ? 0.42 : 1,
            color: part.hidden ? '#6B7280' : undefined,
          }}
        >
          {part.text}{index < shown.length - 1 || remaining > 0 ? ', ' : ''}
        </span>
      ))}
      {remaining > 0 && <span>và {remaining} nhóm khác</span>}
    </>
  );
};

type SuperGroupNestedSelectProps = {
  isOpen: boolean;
  onToggleOpen: () => void;
  selectedSuperGroup: string;
  showSuperList: boolean;
  onSelectSuperGroup: (value: string) => void;
  onBackToSuperGroups: () => void;
  options: NestedGroupOption[];
  selectedIds: string[];
  onToggleGroup: (id: string) => void;
  onToggleSelectAll: () => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  closedLabel: React.ReactNode;
  listRef?: React.RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
  loading?: boolean;
  triggerStyle?: React.CSSProperties;
  selectedCountBySuperGroup?: Record<string, number>;
};

const checkboxStyle = (checked: boolean, readOnly?: boolean): React.CSSProperties => ({
  width: '18px',
  height: '18px',
  borderRadius: '4px',
  border: checked ? '1.5px solid #AE1C3F' : '1.5px solid #D1D5DB',
  backgroundColor: checked ? '#AE1C3F' : (readOnly ? '#F9FAFB' : '#FFFFFF'),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease',
  flexShrink: 0,
});

const CheckIcon = () => (
  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
    <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SuperGroupNestedSelect: React.FC<SuperGroupNestedSelectProps> = ({
  isOpen,
  onToggleOpen,
  selectedSuperGroup,
  showSuperList,
  onSelectSuperGroup,
  onBackToSuperGroups,
  options,
  selectedIds,
  onToggleGroup,
  onToggleSelectAll,
  searchTerm,
  onSearchChange,
  closedLabel,
  listRef,
  readOnly = false,
  loading = false,
  triggerStyle,
  selectedCountBySuperGroup = {},
}) => {
  const isSuperLevel = !readOnly && (showSuperList || !selectedSuperGroup);
  const superLabel = SUPER_GROUP_OPTIONS.find(o => o.value === selectedSuperGroup)?.label || '';
  const filteredOptions = options.filter(opt => matchesSearch(opt.label, searchTerm));
  const isAllSelected = options.length > 0 && options.every(opt => selectedIds.includes(opt.value));

  return (
    <div className="custom-select-container" style={{ position: 'relative' }}>
      <div
        className={`select-custom ${isOpen ? 'open' : ''}`}
        onClick={onToggleOpen}
        style={triggerStyle}
      >
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block', minWidth: 0, flex: 1 }}>
          {closedLabel}
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`arrow-icon ${isOpen ? 'up' : ''}`}>
          <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {isOpen && (
        <div
          ref={listRef}
          className="custom-options-list"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 999,
            padding: 0,
            background: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
            maxHeight: '300px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {isSuperLevel ? (
            <div style={{ overflowY: 'auto' }}>
              {SUPER_GROUP_OPTIONS.map((opt) => {
                const selectedCount = selectedCountBySuperGroup[opt.value] || 0;
                const isActive = selectedSuperGroup === opt.value || selectedCount > 0;
                return (
                <div
                  key={opt.value}
                  className={`custom-option ${isActive ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSuperGroup(opt.value);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    cursor: 'pointer',
                    padding: '10px 12px',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#1F2937' }}>{opt.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {selectedCount > 0 && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#AE1C3F' }}>{selectedCount}</span>
                    )}
                    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" aria-hidden="true">
                      <path d="M1.5 1.5L6 6L1.5 10.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </div>
                );
              })}
            </div>
          ) : (
            <>
              {!readOnly && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBackToSuperGroups();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    borderBottom: '1px solid #E5E7EB',
                    background: '#F9FAFB',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
                    <path d="M1 6.5L6 1.5L11 6.5" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                    {superLabel || 'Nhóm lớn'}
                  </span>
                </button>
              )}

              <div className="dropdown-search-wrapper" style={{ padding: '8px', borderBottom: '1px solid #E5E7EB', background: '#fff' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Tìm kiếm nhóm sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ padding: '6px 12px', fontSize: '14px', width: '100%', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #D1D5DB', outline: 'none' }}
                />
              </div>

              <div style={{ overflowY: 'auto', flex: 1 }}>
                {loading ? (
                  <div className="custom-option disabled" style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '14px' }}>
                    Đang tải nhóm sản phẩm...
                  </div>
                ) : (
                  <>
                    {options.length > 0 && !searchTerm && !readOnly && (
                      <div
                        className="custom-option select-all-option"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelectAll();
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB', fontWeight: 500, userSelect: 'none' }}
                      >
                        <div style={checkboxStyle(isAllSelected)}>
                          {isAllSelected && <CheckIcon />}
                        </div>
                        <span style={{ fontSize: '14px', color: '#111827' }}>
                          {superLabel ? `Tất cả nhóm ${superLabel}` : 'Tất cả nhóm'}
                        </span>
                      </div>
                    )}

                    {filteredOptions.length === 0 ? (
                      <div className="custom-option disabled" style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '14px' }}>
                        {readOnly && !searchTerm
                          ? 'Chưa có nhóm sản phẩm áp dụng'
                          : 'Không tìm thấy nhóm sản phẩm phù hợp'}
                      </div>
                    ) : (
                      filteredOptions.map((opt) => {
                        const isChecked = selectedIds.includes(opt.value);
                        return (
                          <div
                            key={opt.value}
                            className={`custom-option ${isChecked ? 'selected' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!readOnly) onToggleGroup(opt.value);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              cursor: readOnly ? 'default' : 'pointer',
                              padding: '10px 12px',
                              userSelect: 'none',
                            }}
                          >
                            <div style={checkboxStyle(isChecked, readOnly)}>
                              {isChecked && <CheckIcon />}
                            </div>
                            <span
                              style={{
                                fontSize: '14px',
                                color: opt.hidden ? '#6B7280' : '#1F2937',
                                opacity: opt.hidden ? 0.55 : 1,
                              }}
                              title={opt.hidden ? 'Nhóm đang bị ẩn' : undefined}
                            >
                              {opt.label}{opt.hidden ? ' (Đang ẩn)' : ''}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SuperGroupNestedSelect;
