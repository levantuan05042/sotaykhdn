import React, { useState, useMemo, useEffect } from 'react';
import { matchesSearch } from '../../utils/searchText';

export const SUPER_GROUP_OPTIONS = [
  { label: 'Sản phẩm dịch vụ', value: 'SERVICE' },
  { label: 'Sản phẩm bảo hiểm', value: 'INSURANCE' },
  { label: 'Chương trình ưu đãi', value: 'PROGRAM' }
];

export const SUPER_GROUP_CATEGORIES: { superGroup: string; label: string }[] = [
  { superGroup: 'SERVICE', label: 'Tất cả các nhóm sản phẩm dịch vụ' },
  { superGroup: 'INSURANCE', label: 'Tất cả các nhóm sản phẩm bảo hiểm' },
  { superGroup: 'PROGRAM', label: 'Tất cả các nhóm chương trình ưu đãi' },
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
    const ofSuper = allOptions.filter(opt => String(opt.superGroup || '').trim().toUpperCase() === sg.value);
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

export type SuperGroupNestedSelectProps = {
  isOpen: boolean;
  onToggleOpen: () => void;
  options: NestedGroupOption[];
  selectedIds: string[];
  onToggleGroup: (id: string) => void;
  onToggleGroupBatch?: (ids: string[], select: boolean) => void;
  selectedSuperGroup?: string;
  showSuperList?: boolean;
  onSelectSuperGroup?: (value: string) => void;
  onBackToSuperGroups?: () => void;
  onToggleSelectAll?: () => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  closedLabel?: React.ReactNode;
  listRef?: React.RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
  loading?: boolean;
  triggerStyle?: React.CSSProperties;
  selectedCountBySuperGroup?: Record<string, number>;
  placeholder?: string;
};

const CheckboxIcon: React.FC<{ checked: boolean; indeterminate?: boolean }> = ({ checked, indeterminate }) => (
  <div
    style={{
      width: '16px',
      height: '16px',
      borderRadius: '4px',
      border: checked || indeterminate ? '1.5px solid #AE1C3F' : '1.5px solid #D1D5DB',
      backgroundColor: checked || indeterminate ? '#AE1C3F' : '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'all 0.15s ease',
    }}
  >
    {checked && (
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
    {indeterminate && !checked && (
      <svg width="8" height="2" viewBox="0 0 8 2" fill="none">
        <path d="M1 1H7" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )}
  </div>
);

const SuperGroupNestedSelect: React.FC<SuperGroupNestedSelectProps> = ({
  isOpen,
  onToggleOpen,
  options,
  selectedIds,
  onToggleGroup,
  onToggleGroupBatch,
  closedLabel,
  listRef,
  readOnly = false,
  loading = false,
  triggerStyle,
  placeholder = 'Chọn nhóm sản phẩm',
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    SERVICE: false,
    INSURANCE: false,
    PROGRAM: false,
  });

  useEffect(() => {
    if (isOpen) {
      setExpandedGroups(prev => {
        const next = { ...prev };
        SUPER_GROUP_CATEGORIES.forEach(sg => {
          const children = options.filter(o => o.superGroup === sg.superGroup);
          const hasSelected = children.some(c => selectedIds.includes(String(c.value)));
          if (hasSelected) {
            next[sg.superGroup] = true;
          }
        });
        return next;
      });
    }
  }, [isOpen, options, selectedIds]);

  const toggleExpand = (superGroup: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [superGroup]: !prev[superGroup],
    }));
  };

  const handleToggleSuperGroup = (childIds: string[], select: boolean) => {
    if (readOnly) return;
    if (onToggleGroupBatch) {
      onToggleGroupBatch(childIds, select);
    } else {
      childIds.forEach(id => {
        const isCurrentSelected = selectedIds.includes(id);
        if (select && !isCurrentSelected) {
          onToggleGroup(id);
        } else if (!select && isCurrentSelected) {
          onToggleGroup(id);
        }
      });
    }
  };

  const triggerDisplay = useMemo(() => {
    if (selectedIds.length === 0) {
      return <span style={{ color: '#9CA3AF' }}>{placeholder}</span>;
    }
    if (closedLabel) {
      return closedLabel;
    }
    return formatSelectedGroupsLabel(options, selectedIds, placeholder);
  }, [selectedIds, options, placeholder, closedLabel]);

  const triggerTooltip = useMemo(() => {
    if (selectedIds.length === 0) return '';
    return formatSelectedGroupsLabelText(options, selectedIds, placeholder);
  }, [selectedIds, options, placeholder]);

  // Total matching search count
  const hasSearch = internalSearch.trim().length > 0;
  let totalMatchCount = 0;

  return (
    <div className="custom-select-container" style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Box */}
      <div
        className={`select-custom ${isOpen ? 'open' : ''}`}
        onClick={onToggleOpen}
        style={{
          border: isOpen ? '1px solid #AE1C3F' : '1px solid #D4D4D8',
          boxShadow: isOpen ? '0 0 0 2px rgba(174, 28, 63, 0.1)' : undefined,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderRadius: '8px',
          minHeight: '44px',
          padding: '10px 14px',
          backgroundColor: readOnly ? '#F9FAFB' : '#FFFFFF',
          boxSizing: 'border-box',
          width: '100%',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          ...triggerStyle,
        }}
      >
        <span
          style={{
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            display: 'block',
            minWidth: 0,
            flex: 1,
            fontSize: '14px',
            color: selectedIds.length === 0 ? '#9CA3AF' : '#1A191B',
            fontWeight: 400,
          }}
          title={triggerTooltip || undefined}
        >
          {triggerDisplay}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6B7280"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0,
            marginLeft: '8px',
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div
          ref={listRef}
          className="custom-options-list"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            maxHeight: '340px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid #F3F4F6',
              position: 'sticky',
              top: 0,
              backgroundColor: '#FFFFFF',
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                padding: '6px 10px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '13.5px',
                  color: '#1F2937',
                  width: '100%',
                  backgroundColor: 'transparent',
                }}
              />
            </div>
          </div>

          {/* Super Groups Tree */}
          {loading ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: '13.5px' }}>
              Đang tải danh sách nhóm sản phẩm...
            </div>
          ) : (
            <div>
              {SUPER_GROUP_CATEGORIES.map((sg) => {
                const allChildren = options.filter(o => o.superGroup === sg.superGroup);
                const activeChildren = allChildren.filter(o => !o.hidden);
                const visibleChildren = activeChildren.filter(o => matchesSearch(o.label, internalSearch));

                totalMatchCount += visibleChildren.length;

                // When searching, hide super group if no matching children
                if (hasSearch && visibleChildren.length === 0) {
                  return null;
                }

                // If searching, auto-expand. Otherwise respect user expand state
                const isExpanded = hasSearch ? true : Boolean(expandedGroups[sg.superGroup]);
                const activeChildIds = activeChildren.map(c => String(c.value));
                const selectedCount = activeChildIds.filter(id => selectedIds.includes(id)).length;
                const isAllSelected = activeChildIds.length > 0 && selectedCount === activeChildIds.length;
                const isSomeSelected = selectedCount > 0 && !isAllSelected;

                return (
                  <div key={sg.superGroup} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {/* Super Group Header Row */}
                    <div
                      onClick={() => toggleExpand(sg.superGroup)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        backgroundColor: '#FFFFFF',
                        userSelect: 'none',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        {/* Super Group Checkbox */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (readOnly) return;
                            handleToggleSuperGroup(activeChildIds, !isAllSelected);
                          }}
                          style={{ cursor: readOnly ? 'not-allowed' : 'pointer', display: 'flex' }}
                        >
                          <CheckboxIcon checked={isAllSelected} indeterminate={isSomeSelected} />
                        </div>

                        <span
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 500,
                            color: '#1F2937',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {sg.label}
                        </span>
                      </div>

                      {/* Chevron Arrow */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#9CA3AF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                          flexShrink: 0,
                          marginLeft: '8px',
                        }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>

                    {/* Children List */}
                    {isExpanded && (
                      <div style={{ paddingBottom: '4px' }}>
                        {visibleChildren.length === 0 ? (
                          <div style={{ padding: '6px 14px 6px 38px', color: '#9CA3AF', fontSize: '13px' }}>
                            (Chưa có nhóm nào)
                          </div>
                        ) : (
                          visibleChildren.map((child) => {
                            const isChildSelected = selectedIds.includes(String(child.value));
                            return (
                              <div
                                key={child.value}
                                onClick={() => {
                                  if (readOnly) return;
                                  onToggleGroup(String(child.value));
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '7px 14px 7px 38px',
                                  cursor: readOnly ? 'not-allowed' : 'pointer',
                                  userSelect: 'none',
                                  backgroundColor: isChildSelected ? '#FFF5F6' : '#FFFFFF',
                                  transition: 'background-color 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isChildSelected) e.currentTarget.style.backgroundColor = '#F9FAFB';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isChildSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                                }}
                              >
                                <CheckboxIcon checked={isChildSelected} />

                                <span
                                  style={{
                                    fontSize: '13.5px',
                                    color: isChildSelected ? '#AE1C3F' : '#374151',
                                    fontWeight: isChildSelected ? 500 : 400,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {child.label}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {hasSearch && totalMatchCount === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '13.5px' }}>
                  Không tìm thấy kết quả phù hợp.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuperGroupNestedSelect;
