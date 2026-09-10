import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProductCategoryPage.css';
import DataTable, { type Column } from '../components/ui/DataTable2';
import StatusBadge2 from '../components/ui/StatusBadge2';
import CellWithTooltip from '../components/ui/CellWithTooltip';
import TableColumnFilterDropdown from '../components/ui/TableColumnFilterDropdown';
import FilterScrollContainer from '../components/ui/FilterScrollContainer';
import { API_ENDPOINTS, BASE_URL } from '../config/apiConfig'; 
import { formatApprovedBy, getCascadeRowClassName } from '../utils/formatUtils';
import toast from 'react-hot-toast';
import CascadeHideModal, { type ChildCounts } from '../components/ui/CascadeHideModal';
import {
  displaySuccessMessage,
  getHideBlockedByPendingCopy,
  hasPendingOrRevisionChildren,
  notifyIfCannotShowChild,
  showDisplayStatusFromApi,
  showErrorToast,
  showSuccessToast,
} from '../utils/appToast';
import { getCachedPageState, setCachedPageState, savePageScroll, restorePageScroll } from '../utils/pageStateCache';

const STATUS_OPTIONS = [
  { label: 'Đã duyệt', value: 'ACTIVE' },
  { label: 'Lưu nháp', value: 'DRAFT' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
  { label: 'Từ chối', value: 'REJECTED' },
  // { label: 'Lưu trữ', value: 'ARCHIVED' }
];

const ACTIVE_OPTIONS = [
  { label: 'Đang hiển thị', value: 'true' },
  { label: 'Đã ẩn', value: 'false' },
];

interface GroupOption {
  value: string;
  label: string;
}

const FilterTag: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => (
  <div className="filter-tag">
    <span>{label}</span>
    <button className="btn-remove-tag" onClick={onRemove}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  </div>
);

const ProductCategoryPage: React.FC = () => {
  const navigate = useNavigate();
  const cached = getCachedPageState('product-category');
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(cached?.searchTerm ?? '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(cached?.selectedStatuses ?? []);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(cached?.selectedGroups ?? []);
  const [selectedActives, setSelectedActives] = useState<string[]>(cached?.selectedActives ?? []);
  const [selectedCreators, setSelectedCreators] = useState<string[]>(cached?.selectedCreators ?? []);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>(cached?.selectedApprovers ?? []);
  const [currentPage, setCurrentPage] = useState<number>(cached?.currentPage ?? 1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);

  // Cascade hide state
  const [cascadeTarget, setCascadeTarget] = useState<any | null>(null);
  const [cascadeCounts, setCascadeCounts] = useState<ChildCounts>({});
  const [showCascadeModal, setShowCascadeModal] = useState(false);
  const [isCascadeProcessing, setIsCascadeProcessing] = useState(false);

  const [warningData, setWarningData] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: '',
    message: ''
  });

  const filterSectionRef = useRef<HTMLDivElement>(null);

  // Lưu trạng thái bộ lọc và phân trang vào cache
  useEffect(() => {
    setCachedPageState('product-category', {
      searchTerm,
      selectedStatuses,
      selectedGroups,
      selectedActives,
      selectedCreators,
      selectedApprovers,
      currentPage,
    });
  }, [searchTerm, selectedStatuses, selectedGroups, selectedActives, selectedCreators, selectedApprovers, currentPage]);

  useEffect(() => {
    const fetchGroupOptions = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST);
        const mappedGroups = (response.data || [])
          .filter((item: any) => item.status === 'ACTIVE' && item.active === true)
          .map((item: any) => ({ value: item.id, label: item.name }));
        setGroupOptions(mappedGroups);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách nhóm sản phẩm:', error);
      }
    };
    fetchGroupOptions();
  }, []);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT_CATEGORY.LIST, {
        params: {
          keyword: searchTerm.trim() || undefined,
        },
      });
      
      const resultData = response.data?.content || response.data;
      const rawList = Array.isArray(resultData) ? resultData : [];

      const enrichedData = rawList.map((item: any) => {
        const creator = (item.createdByFullName && String(item.createdByFullName).trim() && item.createdByFullName !== '---')
          ? String(item.createdByFullName).trim()
          : (item.CREATED_BY_FULL_NAME && String(item.CREATED_BY_FULL_NAME).trim() && item.CREATED_BY_FULL_NAME !== '---'
              ? String(item.CREATED_BY_FULL_NAME).trim()
              : (formatApprovedBy(item.createdBy) || item.createdBy || '---'));

        const approver = (item.approvedByFullName && String(item.approvedByFullName).trim() && item.approvedByFullName !== '---')
          ? String(item.approvedByFullName).trim()
          : (item.APPROVED_BY_FULL_NAME && String(item.APPROVED_BY_FULL_NAME).trim() && item.APPROVED_BY_FULL_NAME !== '---'
              ? String(item.APPROVED_BY_FULL_NAME).trim()
              : (formatApprovedBy(item.approvedBy) || item.approvedBy || '---'));

        return {
          ...item,
          createdByFullName: creator,
          approvedByFullName: approver,
          approvedBy: approver
        };
      });

      setData(enrichedData);
      if (!isBackground) {
        restorePageScroll('product-category');
      }
    } catch (error) {
      if (!isBackground) {
        console.error('Lỗi khi gọi API danh sách danh mục sản phẩm:', error);
        setData([]);
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Tự động load lại dữ liệu mới khi DB thay đổi: Polling 5s và lắng nghe focus/visibilitychange
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 15000);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target?.closest?.('.table-filter-dropdown-menu')) return;
      if (target?.closest?.('.dropdown-wrapper')) return;
      setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (options: any[], value: string) => {
    return options.find(opt => opt.value === value)?.label || value;
  };

  const groupFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    groupOptions.forEach(opt => map.set(opt.value, opt.label));
    data.forEach(item => {
      if (item.groupId && item.groupName) {
        map.set(item.groupId, item.groupName);
      } else if (item.groupName) {
        map.set(item.groupName, item.groupName);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [groupOptions, data]);

  const creatorFilterOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach(item => {
      const name = item.createdByFullName || item.CREATED_BY_FULL_NAME;
      if (name && name !== '---') set.add(name);
    });
    return Array.from(set).map(name => ({ label: name, value: name }));
  }, [data]);

  const approverFilterOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach(item => {
      const name = item.approvedByFullName || item.APPROVED_BY_FULL_NAME || item.approvedBy;
      if (name && name !== '---') set.add(name);
    });
    return Array.from(set).map(name => ({ label: name, value: name }));
  }, [data]);

  const getFilteredData = () => {
    return data.filter(item => {
      if (selectedStatuses.length > 0 && !selectedStatuses.some(s => s.toUpperCase() === item.status?.toUpperCase())) {
        return false;
      }
      if (selectedGroups.length > 0 && !selectedGroups.some(g => g === item.groupId || g === item.groupName)) {
        return false;
      }
      if (selectedActives.length > 0) {
        const itemActive = item.active !== false;
        const matchesActive = selectedActives.some(a => (a === 'true' && itemActive) || (a === 'false' && !itemActive));
        if (!matchesActive) return false;
      }
      if (selectedCreators.length > 0) {
        const c = item.createdByFullName || item.CREATED_BY_FULL_NAME || '';
        if (!selectedCreators.includes(c)) return false;
      }
      if (selectedApprovers.length > 0) {
        const a = item.approvedByFullName || item.APPROVED_BY_FULL_NAME || item.approvedBy || '';
        if (!selectedApprovers.includes(a)) return false;
      }
      return true;
    });
  };

  const handleToggleActive = async (item: any, currentActive: boolean) => {
    if (!currentActive) {
      if (await notifyIfCannotShowChild('danh mục', item.name, item)) return;
      await executeToggleActive(item, true, false);
      return;
    }
    try {
      const res = await axios.get(`${BASE_URL}/product-category/${item.id}/children-count`);
      const counts: ChildCounts = res.data?.data || {};
      if (hasPendingOrRevisionChildren(counts)) {
        const copy = getHideBlockedByPendingCopy('category', item.name);
        showErrorToast(copy.title, copy.description);
        return;
      }
      if (counts.total && counts.total > 0) {
        setCascadeTarget(item);
        setCascadeCounts(counts);
        setShowCascadeModal(true);
        return;
      }
    } catch (err) {
      console.warn("Lỗi kiểm tra con danh mục:", err);
    }

    await executeToggleActive(item, false, false);
  };

  const executeToggleActive = async (item: any, newActive: boolean, cascade: boolean) => {
    setIsCascadeProcessing(true);
    try {
      const url = `${BASE_URL}/product-category/${item.id}/active?active=${newActive}${cascade ? '&cascade=true' : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        showDisplayStatusFromApi(errJson);
        return;
      }

      setData(prevData => prevData.map(d => d.id === item.id ? { ...d, active: newActive } : d));
      setShowCascadeModal(false);
      setCascadeTarget(null);
      showSuccessToast(displaySuccessMessage(newActive, 'danh mục', item.name));

      if (cascade) {
        fetchData();
      }
    } catch (error: any) {
      console.error("Lỗi cập nhật hiệu lực danh mục:", error);
      toast.error(error.message || 'Không thể cập nhật hiệu lực', { position: 'top-center' });
    } finally {
      setIsCascadeProcessing(false);
    }
  };

  const renderActiveToggle = (item: any) => {
    const disabledStatuses = ['PENDING_APPROVAL', 'REJECTED', 'DRAFT', 'NEEDS_REVISION'];
    const isDisabled = disabledStatuses.includes(item.status);
    const isActive = item.active || false;

    return (
      <div className="toggle-wrapper" onClick={(e) => e.stopPropagation()}>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={isActive} 
            disabled={isDisabled}
            onChange={() => { if (!isDisabled) handleToggleActive(item, isActive); }}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className={`toggle-label ${isDisabled ? 'disabled-text' : ''}`}>
          {isActive ? 'Hiện' : 'Ẩn'}
        </span>
      </div>
    );
  };

  const columns: Column<any>[] = [
    { key: 'stt', header: 'STT', width: '70px', align: 'center', render: (_, index) => <CellWithTooltip text={index + 1} style={{ justifyContent: 'center' }} /> },
    { key: 'name', header: 'Tên danh mục sản phẩm', render: (row) => <CellWithTooltip text={row.name} style={{ fontWeight: 500 }} /> },
    { key: 'groupName', header: 'Nhóm sản phẩm', render: (row) => <CellWithTooltip text={row.groupName} /> },
    { key: 'status', header: 'Trạng thái', width: '210px', render: (row) => <StatusBadge2 status={row.status} /> },
    { key: 'active', header: 'Hiệu lực', render: (row) => renderActiveToggle(row) },
    { key: 'createdByFullName', header: 'Người tạo', render: (row) => <CellWithTooltip text={row.createdByFullName || row.CREATED_BY_FULL_NAME || '---'} /> },
    { key: 'approvedByFullName', header: 'Người kiểm duyệt', render: (row) => <CellWithTooltip text={row.approvedByFullName || row.APPROVED_BY_FULL_NAME || row.approvedBy || '---'} /> },
    { key: 'version', header: 'Phiên bản', render: (row) => <span style={{ fontWeight: 600, color: '#053E2B' }}>{row.version ? `Phiên bản ${row.version}` : '---'}</span> },
    {
      key: 'action',
      header: '',
      width: '80px',
      align: 'center',
      render: (row) => (
        <CellWithTooltip tooltip="Xem chi tiết" style={{ justifyContent: 'center' }}>
          <button
            className="btn-view-detail"
            onClick={(e) => { e.stopPropagation(); navigate(`/product-category/${row.id}`); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </CellWithTooltip>
      ),
    },
  ];

  return (
    <div className="product-group-container">
      <div className="content-wrapper">
        <h2 className="page-title">Quản lý danh mục sản phẩm</h2>
        <button className="btn-add-new" onClick={() => navigate('/product-category/add')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M6.66927 0.834961V12.5016M0.835938 6.66829H12.5026" stroke="#FDFCFD" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Thêm mới</span>
        </button>
      </div>

      <div className="filter-section" ref={filterSectionRef}>
        <div className="dropdown-group-container">
          <FilterScrollContainer className="dropdown-row">
            {/* Nhóm sản phẩm */}
            <TableColumnFilterDropdown
              label="Nhóm sản phẩm"
              options={groupFilterOptions}
              selectedValues={selectedGroups}
              onSelectValues={setSelectedGroups}
              isOpen={openDropdown === 'group'}
              onToggle={() => setOpenDropdown(openDropdown === 'group' ? null : 'group')}
              hasSearch={groupFilterOptions.length > 5}
              searchPlaceholder="Tìm nhóm..."
            />

            {/* Trạng thái */}
            <TableColumnFilterDropdown
              label="Trạng thái"
              options={STATUS_OPTIONS}
              selectedValues={selectedStatuses}
              onSelectValues={setSelectedStatuses}
              isOpen={openDropdown === 'status'}
              onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
            />

            {/* Hiệu lực */}
            <TableColumnFilterDropdown
              label="Hiệu lực"
              options={ACTIVE_OPTIONS}
              selectedValues={selectedActives}
              onSelectValues={setSelectedActives}
              isOpen={openDropdown === 'active'}
              onToggle={() => setOpenDropdown(openDropdown === 'active' ? null : 'active')}
            />

            {/* Người tạo */}
            <TableColumnFilterDropdown
              label="Người tạo"
              options={creatorFilterOptions}
              selectedValues={selectedCreators}
              onSelectValues={setSelectedCreators}
              isOpen={openDropdown === 'creator'}
              onToggle={() => setOpenDropdown(openDropdown === 'creator' ? null : 'creator')}
              hasSearch={creatorFilterOptions.length > 5}
              searchPlaceholder="Tìm người tạo..."
            />

            {/* Người kiểm duyệt */}
            <TableColumnFilterDropdown
              label="Người kiểm duyệt"
              options={approverFilterOptions}
              selectedValues={selectedApprovers}
              onSelectValues={setSelectedApprovers}
              isOpen={openDropdown === 'approver'}
              onToggle={() => setOpenDropdown(openDropdown === 'approver' ? null : 'approver')}
              hasSearch={approverFilterOptions.length > 5}
              searchPlaceholder="Tìm người duyệt..."
            />
          </FilterScrollContainer>

          <div className="selected-filters-row">
            {selectedGroups.map((val) => (
              <FilterTag
                key={val}
                label={`Nhóm: ${groupFilterOptions.find((o) => o.value === val)?.label || val}`}
                onRemove={() => setSelectedGroups((prev) => prev.filter((v) => v !== val))}
              />
            ))}
            {selectedStatuses.map((val) => (
              <FilterTag
                key={val}
                label={getLabel(STATUS_OPTIONS, val)}
                onRemove={() => setSelectedStatuses((prev) => prev.filter((v) => v !== val))}
              />
            ))}
            {selectedActives.map((val) => (
              <FilterTag
                key={val}
                label={getLabel(ACTIVE_OPTIONS, val)}
                onRemove={() => setSelectedActives((prev) => prev.filter((v) => v !== val))}
              />
            ))}
            {selectedCreators.map((val) => (
              <FilterTag
                key={val}
                label={`Người tạo: ${val}`}
                onRemove={() => setSelectedCreators((prev) => prev.filter((v) => v !== val))}
              />
            ))}
            {selectedApprovers.map((val) => (
              <FilterTag
                key={val}
                label={`Người kiểm duyệt: ${val}`}
                onRemove={() => setSelectedApprovers((prev) => prev.filter((v) => v !== val))}
              />
            ))}
            {(selectedGroups.length > 0 || selectedStatuses.length > 0 || selectedActives.length > 0 || selectedCreators.length > 0 || selectedApprovers.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedGroups([]);
                  setSelectedStatuses([]);
                  setSelectedActives([]);
                  setSelectedCreators([]);
                  setSelectedApprovers([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#84828E',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '4px 8px',
                }}
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>
        </div>

        <div className="search-container">
          <span className="search-icon">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M19 19L14.65 14.65M17 9C17 13.4183 13.4183 17 9 17C4.58172 17 1 13.4183 1 9C1 4.58172 4.58172 1 9 1C13.4183 1 17 4.58172 17 9Z" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <input 
            type="text" 
            placeholder="Tìm kiếm" 
            className="search-input" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-placeholder" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <DataTable
          columns={columns}
          data={getFilteredData()}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => {
            savePageScroll('product-category');
            navigate(`/product-category/${row.id}`);
          }}
          loading={loading}
          page={currentPage}
          onPageChange={setCurrentPage}
          emptyText="Không tìm thấy danh mục sản phẩm nào phù hợp."
          getRowClassName={getCascadeRowClassName}
        />
      </div>

      <CascadeHideModal
        isOpen={showCascadeModal}
        onClose={() => {
          setShowCascadeModal(false);
          setCascadeTarget(null);
        }}
        onConfirm={() => {
          if (cascadeTarget) {
            executeToggleActive(cascadeTarget, false, true);
          }
        }}
        itemTypeLabel="danh mục sản phẩm"
        itemName={cascadeTarget?.name || ''}
        counts={cascadeCounts}
        isProcessing={isCascadeProcessing}
      />

      {warningData.show && (
        <div className="warning-toast-wrapper">
          <div className="warning-toast-card">
            <div className="warning-toast-icon-container">
              <div className="warning-bg-outer"></div><div className="warning-bg-inner"></div>
              <svg className="warning-toast-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h3 className="warning-toast-title">{warningData.title}</h3>
            <p className="warning-toast-desc">{warningData.message}</p>
            <div className="warning-toast-actions">
              <button className="warning-btn-close" onClick={() => setWarningData({ ...warningData, show: false })}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCategoryPage;