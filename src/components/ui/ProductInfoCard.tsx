import React, { useState, useRef, useEffect, useMemo } from 'react';
import { filterApprovedVersions } from '../../utils/formatUtils';

export interface VersionItem {
  id: string;
  version?: number | null;
  status?: string;
  name?: string;
  createdAt?: string;
  createdByFullName?: string;
  approvedByFullName?: string;
  active?: boolean;
}

interface ProductInfoCardProps {
  creatorName: string;
  approverName: string;
  createdAt: string;
  version: number | string;
  versions?: VersionItem[];
  currentId?: string;
  onSelectVersion?: (item: VersionItem) => void;
  showEngagementStats?: boolean;
  viewCount?: number | null;
  savedCount?: number | null;
}

const ProductInfoCard: React.FC<ProductInfoCardProps> = ({
  creatorName,
  approverName,
  createdAt,
  version,
  versions = [],
  currentId,
  onSelectVersion,
  showEngagementStats = false,
  viewCount,
  savedCount,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVersionDropdownOpen(false);
      }
    };

    if (isVersionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVersionDropdownOpen]);

  const approvedVersions = useMemo(() => filterApprovedVersions(versions), [versions]);

  const getStatusBadgeStyle = () => ({ bg: '#E0F9EC', text: '#14532D', label: 'Đã duyệt' });

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const hasMultipleVersions = approvedVersions.length > 0;

  return (
    <div className="infoCard">
      <div className="infoHeader" onClick={() => setIsOpen(!isOpen)}>
        <span className="infoTitle">Thông tin sản phẩm</span>
        <svg 
          className={`infoChevron ${isOpen ? 'open' : ''}`} 
          width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M5 7.5L10 12.5L15 7.5"/>
        </svg>
      </div>
      
      {isOpen && (
        <div className="infoContent">
          <div className="infoGrid">
            <div className="infoItem">
              <span className="infoLabel">Người tạo</span>
              <span className="infoValue">{creatorName}</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Người kiểm duyệt</span>
              <span className="infoValue">{approverName}</span>
            </div>
            <div className="infoItem">
              <span className="infoLabel">Thời gian tạo</span>
              <span className="infoValue">{createdAt}</span>
            </div>
            <div className="infoItem" style={{ position: 'relative' }} ref={dropdownRef}>
              <span className="infoLabel">Phiên bản</span>
              <div 
                className="versionBadge"
                onClick={(e) => {
                  if (hasMultipleVersions) {
                    e.stopPropagation();
                    setIsVersionDropdownOpen(!isVersionDropdownOpen);
                  }
                }}
                style={{
                  cursor: hasMultipleVersions ? 'pointer' : 'default',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  position: 'relative',
                  userSelect: 'none',
                  transition: 'background-color 0.15s',
                }}
                title={hasMultipleVersions ? 'Nhấn để chọn xem phiên bản khác' : undefined}
              >
                <span>{version !== null && version !== undefined && String(version).trim() !== '' && String(version).trim().toLowerCase() !== 'null' ? `Phiên bản ${version}` : '---'}</span>
                {hasMultipleVersions && (
                  <svg 
                    width="12" height="12" viewBox="0 0 20 20" fill="none"
                    style={{
                      transition: 'transform 0.2s',
                      transform: isVersionDropdownOpen ? 'rotate(180deg)' : 'none',
                    }}
                  >
                    <path d="M5 7.5L10 12.5L15 7.5" stroke="#14532D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {isVersionDropdownOpen && hasMultipleVersions && (
                <div
                  className="version-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    minWidth: '270px',
                    maxWidth: '340px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.05)',
                    zIndex: 2000,
                    padding: '6px 0',
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div 
                    style={{
                      padding: '8px 14px 6px',
                      borderBottom: '1px solid #F3F4F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                      Lịch sử phiên bản ({approvedVersions.length})
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      Chọn để xem
                    </span>
                  </div>

                  <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {approvedVersions.map((v) => {
                      const isCurrent = currentId ? v.id === currentId : String(v.version) === String(version);
                      const badge = getStatusBadgeStyle();
                      const versionDisplay = (v.version !== null && v.version !== undefined && String(v.version).trim() !== '' && String(v.version).trim().toLowerCase() !== 'null')
                        ? `Phiên bản ${v.version}` 
                        : '---';

                      return (
                        <div
                          key={v.id}
                          onClick={() => {
                            setIsVersionDropdownOpen(false);
                            if (onSelectVersion) {
                              onSelectVersion(v);
                            }
                          }}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            backgroundColor: isCurrent ? '#FDF2F4' : 'transparent',
                            borderBottom: '1px solid #F9FAFB',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrent) e.currentTarget.style.backgroundColor = '#F9FAFB';
                          }}
                          onMouseLeave={(e) => {
                            if (!isCurrent) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: isCurrent ? 700 : 600, color: isCurrent ? '#AE1C3F' : '#111827' }}>
                                {versionDisplay}
                              </span>
                              {isCurrent && (
                                <span style={{ fontSize: '10px', backgroundColor: '#AE1C3F', color: '#FFF', borderRadius: '4px', padding: '1px 5px', fontWeight: 600 }}>
                                  Đang xem
                                </span>
                              )}
                            </div>
                            <span 
                              style={{
                                fontSize: '11px',
                                backgroundColor: badge.bg,
                                color: badge.text,
                                borderRadius: '100px',
                                padding: '2px 8px',
                                fontWeight: 500,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280' }}>
                            <span>{v.createdByFullName || '---'}</span>
                            <span>{formatShortDate(v.createdAt)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {showEngagementStats && (
              <>
                <div className="infoItem">
                  <span className="infoLabel">Lượt xem</span>
                  <span className="infoValue">
                    {viewCount !== null && viewCount !== undefined ? viewCount : 'Chưa có'}
                  </span>
                </div>
                <div className="infoItem">
                  <span className="infoLabel">Lượt lưu</span>
                  <span className="infoValue">{savedCount ?? 0}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductInfoCard;
