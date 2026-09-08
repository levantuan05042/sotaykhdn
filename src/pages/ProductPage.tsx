import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './ProductPage.css';
import DataTable2, { type Column } from '../components/ui/DataTable2';
import StatusBadge2 from '../components/ui/StatusBadge2';
import StatusBadgeListRequest from '../components/ui/StatusBadgeListRequest';
import ImportProductModal from '../components/ImportProductModal';
import CellWithTooltip from '../components/ui/CellWithTooltip';
import TableColumnFilterDropdown from '../components/ui/TableColumnFilterDropdown';
import FilterScrollContainer from '../components/ui/FilterScrollContainer';
import { API_ENDPOINTS, BASE_URL } from '../config/apiConfig';
import { formatApprovedBy, getCascadeRowClassName, isCascadeHidden } from '../utils/formatUtils';
import hotToast from 'react-hot-toast';
import { getCachedPageState, setCachedPageState, savePageScroll, restorePageScroll } from '../utils/pageStateCache';


const STATUS_OPTIONS = [
  { label: 'Đã duyệt', value: 'ACTIVE' },
  { label: 'Lưu nháp', value: 'DRAFT' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
  { label: 'Từ chối', value: 'REJECTED' },
  // { label: 'Lưu trữ', value: 'ARCHIVED' }
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

const stripHtml = (htmlString?: string | null) => {
  if (!htmlString) return '';
  return htmlString.replace(/<\/?[^>]+(>|$)/g, "");
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '---';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
};

const ImportAction: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="btn-import"
        onClick={() => setIsOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 16px', backgroundColor: '#EBEAEF', border: 'none', borderRadius: '6px', color: '#374151', fontWeight: 500, cursor: 'pointer' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span>Import</span>
      </button>

      <ImportProductModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        onSuccess={onSuccess} 
      />
    </>
  );
};

const ProductPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isProcessingPage = location.pathname.includes('/products/processing');
  const isRejectedPage = location.pathname.includes('/products/rejected');
  const isOfficialPage = location.pathname.includes('/products/official') || (!isProcessingPage && !isRejectedPage);

  let currentListName = 'Danh sách chính thức';
  if (isProcessingPage) currentListName = 'Danh sách sản phẩm đang xử lý';
  if (isRejectedPage) currentListName = 'Danh sách sản phẩm từ chối';

  const pageKey = location.pathname;
  const cached = getCachedPageState(pageKey);

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(cached?.searchTerm ?? '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(cached?.selectedStatuses ?? []);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(cached?.selectedGroups ?? []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(cached?.selectedCategories ?? []);
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>(cached?.selectedBusinesses ?? []);
  const [selectedActives, setSelectedActives] = useState<string[]>(cached?.selectedActives ?? []);
  const [selectedCreators, setSelectedCreators] = useState<string[]>(cached?.selectedCreators ?? []);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>(cached?.selectedApprovers ?? []);
  const [selectedRequestNames, setSelectedRequestNames] = useState<string[]>(cached?.selectedTypes ?? []);
  const [currentPage, setCurrentPage] = useState<number>(cached?.currentPage ?? 1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filterSectionRef = useRef<HTMLDivElement>(null);
  const headerListMenuRef = useRef<HTMLDivElement>(null);

  // Lưu trạng thái trang vào cache
  useEffect(() => {
    setCachedPageState(pageKey, {
      searchTerm,
      selectedStatuses,
      selectedGroups,
      selectedCategories,
      selectedBusinesses,
      selectedActives,
      selectedCreators,
      selectedApprovers,
      selectedTypes: selectedRequestNames,
      currentPage,
    });
  }, [pageKey, searchTerm, selectedStatuses, selectedGroups, selectedCategories, selectedBusinesses, selectedActives, selectedCreators, selectedApprovers, selectedRequestNames, currentPage]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const fetchGroupOptions = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST);
        const mappedGroups = (response.data || [])
          .filter((item: any) => item.status === 'ACTIVE')
          .map((item: any) => ({ value: item.id, label: item.name }));
        setGroupOptions(mappedGroups);
      } catch (error) {
        console.error(error);
      }
    };
    fetchGroupOptions();
  }, []);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT.LIST, {
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
        restorePageScroll(pageKey);
      }
    } catch (error) {
      if (!isBackground) {
        console.error(error);
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
    }, 5000);

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
  }, [searchTerm, pageKey]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target?.closest?.('.table-filter-dropdown-menu')) return;
      if (
        filterSectionRef.current && !filterSectionRef.current.contains(event.target as Node) &&
        headerListMenuRef.current && !headerListMenuRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ACTIVE_OPTIONS = [
    { label: 'Đang hiển thị', value: 'true' },
    { label: 'Đã ẩn', value: 'false' },
  ];

  const groupFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    groupOptions.forEach(g => map.set(g.value, g.label));
    data.forEach(item => {
      if (item.productGroupId && item.productGroupName) {
        map.set(item.productGroupId, item.productGroupName);
      } else if (item.productGroupName) {
        map.set(item.productGroupName, item.productGroupName);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [groupOptions, data]);

  const categoryFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach(item => {
      if (item.productCategoryId && item.productCategoryName) {
        map.set(item.productCategoryId, item.productCategoryName);
      } else if (item.productCategoryName) {
        map.set(item.productCategoryName, item.productCategoryName);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [data]);

  const businessFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    data.forEach(item => {
      if (item.businessId && item.businessName) {
        map.set(item.businessId, item.businessName);
      } else if (item.businessName) {
        map.set(item.businessName, item.businessName);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [data]);

  const creatorFilterOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach(item => {
      const val = item.createdByFullName || item.CREATED_BY_FULL_NAME;
      if (val && val !== '---') set.add(val);
    });
    return Array.from(set).map(val => ({ label: val, value: val }));
  }, [data]);

  const approverFilterOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach(item => {
      const val = item.approvedByFullName || item.APPROVED_BY_FULL_NAME || item.approvedBy;
      if (val && val !== '---') set.add(val);
    });
    return Array.from(set).map(val => ({ label: val, value: val }));
  }, [data]);

  const requestNameFilterOptions = useMemo(() => {
    const set = new Set<string>();
    data.forEach(item => {
      const val = stripHtml(item.requestName);
      if (val && val !== '---') set.add(val);
    });
    return Array.from(set).map(val => ({ label: val, value: val }));
  }, [data]);

  const handleImportSuccess = () => {
    fetchData();
    setToast({ type: 'success', message: 'Nhập sản phẩm từ Excel thành công.' });
    navigate('/request-list');
  };

  const handleToggleActive = async (item: any, currentActive: boolean) => {
    if (isCascadeHidden(item)) return;
    const newActiveStatus = !currentActive;
    setData(prevData =>
      prevData.map(d => d.id === item.id ? { ...d, active: newActiveStatus } : d)
    );
    try {
      const response = await fetch(`${BASE_URL}/products/${item.id}/active?active=${newActiveStatus}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed');
      hotToast.success(newActiveStatus ? 'Hiển thị thành công' : 'Ẩn thành công', { position: 'top-center' });
    } catch (error) {
      setData(prevData =>
        prevData.map(d => d.id === item.id ? { ...d, active: currentActive } : d)
      );
      hotToast.error('Không thể cập nhật trạng thái hiệu lực. Vui lòng thử lại!', { position: 'top-center' });
    }
  };

  const renderActiveToggle = (item: any) => {
    const disabledStatuses = ['PENDING_APPROVAL', 'REJECTED', 'DRAFT', 'NEEDS_REVISION'];
    const isCascadeLocked = isCascadeHidden(item);
    const isDisabled = disabledStatuses.includes(item.status?.toUpperCase()) || isCascadeLocked;
    const isActive = item.active || false;
    return (
      <div className="toggle-wrapper" onClick={(e) => e.stopPropagation()} title={isCascadeLocked ? 'Đang bị ẩn theo đối tượng cha' : undefined}>
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
          {isCascadeLocked ? 'Ẩn theo cha' : (isActive ? 'Hiện' : 'Ẩn')}
        </span>
      </div>
    );
  };

  const getFilteredData = () => {
    let result = data;
    if (isProcessingPage) {
      const allowedStatuses = ['DRAFT', 'PENDING_APPROVAL', 'NEEDS_REVISION'];
      result = result.filter(item => allowedStatuses.includes(item.status?.toUpperCase()));
    } else if (isRejectedPage) {
      result = result.filter(item => item.status?.toUpperCase() === 'REJECTED');
    } else {
      result = result.filter(item => item.status?.toUpperCase() === 'ACTIVE');
    }

    return result.filter(item => {
      if (selectedStatuses.length > 0 && !selectedStatuses.some(s => s.toUpperCase() === item.status?.toUpperCase())) {
        return false;
      }
      if (selectedGroups.length > 0 && !selectedGroups.some(g => g === item.productGroupId || g === item.productGroupName)) {
        return false;
      }
      if (selectedCategories.length > 0 && !selectedCategories.some(c => c === item.productCategoryId || c === item.productCategoryName)) {
        return false;
      }
      if (selectedBusinesses.length > 0 && !selectedBusinesses.some(b => b === item.businessId || b === item.businessName)) {
        return false;
      }
      if (selectedActives.length > 0) {
        const itemActive = Boolean(item.active);
        const matchesActive = selectedActives.some(a => (a === 'true' && itemActive) || (a === 'false' && !itemActive));
        if (!matchesActive) return false;
      }
      if (selectedCreators.length > 0) {
        const creator = item.createdByFullName || item.CREATED_BY_FULL_NAME || '';
        if (!selectedCreators.includes(creator)) return false;
      }
      if (selectedApprovers.length > 0) {
        const approver = item.approvedByFullName || item.APPROVED_BY_FULL_NAME || item.approvedBy || '';
        if (!selectedApprovers.includes(approver)) return false;
      }
      if (selectedRequestNames.length > 0) {
        const reqName = stripHtml(item.requestName);
        if (!selectedRequestNames.includes(reqName)) return false;
      }
      return true;
    });
  };

  const renderNote = (noteVal?: string | null) => {
    if (!noteVal || String(noteVal).trim() === '' || String(noteVal).trim() === '---') {
      return <span>---</span>;
    }
    const val = String(noteVal).trim();
    if (val === '0') return <StatusBadgeListRequest status="NEEDS_REVISION" />;
    if (val === '1') return <StatusBadgeListRequest status="REJECTED" />;
    if (val === '2') return <StatusBadgeListRequest status="APPROVED" />;
    if (val === '3' || val.toUpperCase() === 'REVIEWED') return <StatusBadgeListRequest status="REVIEWED" />;
    return <CellWithTooltip text={stripHtml(noteVal)} />;
  };

  const getColumns = (): Column<any>[] => {
    const baseAction: Column<any> = {
      key: 'action',
      header: '',
      width: '80px',
      align: 'center',
      render: (row) => (
        <CellWithTooltip tooltip="Xem chi tiết" style={{ justifyContent: 'center' }}>
          <button
            className="btn-view-detail"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/products/${row.id}`);
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </CellWithTooltip>
      )
    };

    if (isProcessingPage) {
      return [
        { key: 'stt', header: 'STT', width: '70px', align: 'center', render: (_, index) => <CellWithTooltip text={index + 1} style={{ justifyContent: 'center' }} /> },
        { key: 'name', header: 'Sản phẩm', render: (row) => <CellWithTooltip text={stripHtml(row.name)} style={{ fontWeight: 500 }} /> },
        { key: 'productGroupName', header: 'Nhóm sản phẩm', render: (row) => <CellWithTooltip text={row.productGroupName} /> },
        { key: 'status', header: 'Trạng thái', width: '210px', render: (row) => <StatusBadge2 status={row.status} /> },
        { key: 'requestName', header: 'Tên yêu cầu', render: (row) => (
          <CellWithTooltip
            text={stripHtml(row.requestName)}
            onClick={(e) => {
              if (row.requestId) {
                e.stopPropagation();
                navigate(`/products/batch/${row.requestId}`);
              }
            }}
            style={{ cursor: row.requestId ? 'pointer' : 'default', color: row.requestId ? '#2563EB' : 'inherit', textDecoration: row.requestId ? 'underline' : 'none' }}
          />
        )},
        { key: 'notes', header: 'Ghi chú', render: (row) => renderNote(row.notes) },
        { key: 'createdAt', header: 'Ngày tạo', render: (row) => <CellWithTooltip text={formatDate(row.createdAt)} /> },
        { key: 'createdByFullName', header: 'Người tạo', render: (row) => <CellWithTooltip text={row.createdByFullName || row.CREATED_BY_FULL_NAME || '---'} /> },
        { key: 'approvedByFullName', header: 'Người kiểm duyệt', render: (row) => <CellWithTooltip text={row.approvedByFullName || row.APPROVED_BY_FULL_NAME || row.approvedBy || '---'} /> },
        { key: 'version', header: 'Phiên bản', render: (row) => <span style={{ fontWeight: 600, color: '#053E2B' }}>{row.version ? `Phiên bản ${row.version}` : '---'}</span> },
        baseAction
      ];
    }

    if (isRejectedPage) {
      return [
        { key: 'stt', header: 'STT', width: '70px', align: 'center', render: (_, index) => <CellWithTooltip text={index + 1} style={{ justifyContent: 'center' }} /> },
        { key: 'name', header: 'Sản phẩm', render: (row) => <CellWithTooltip text={stripHtml(row.name)} style={{ fontWeight: 500 }} /> },
        { key: 'productGroupName', header: 'Nhóm sản phẩm', render: (row) => <CellWithTooltip text={row.productGroupName} /> },
        { key: 'productCategoryName', header: 'Danh mục sản phẩm', render: (row) => <CellWithTooltip text={row.productCategoryName} /> },
        { key: 'businessName', header: 'Nghiệp vụ', render: (row) => <CellWithTooltip text={row.businessName} /> },
        { key: 'status', header: 'Trạng thái', width: '210px', render: (row) => <StatusBadge2 status={row.status} /> },
        { key: 'active', header: 'Hiệu lực', render: (row) => renderActiveToggle(row) },
        { key: 'createdByFullName', header: 'Người tạo', render: (row) => <CellWithTooltip text={row.createdByFullName || row.CREATED_BY_FULL_NAME || '---'} /> },
        { key: 'approvedByFullName', header: 'Người kiểm duyệt', render: (row) => <CellWithTooltip text={row.approvedByFullName || row.APPROVED_BY_FULL_NAME || row.approvedBy || '---'} /> },
        { key: 'version', header: 'Phiên bản', render: (row) => <span style={{ fontWeight: 600, color: '#053E2B' }}>{row.version ? `Phiên bản ${row.version}` : '---'}</span> },
        baseAction
      ];
    }

    return [
      { key: 'stt', header: 'STT', width: '70px', align: 'center', render: (_, index) => <CellWithTooltip text={index + 1} style={{ justifyContent: 'center' }} /> },
      { key: 'name', header: 'Sản phẩm', render: (row) => <CellWithTooltip text={stripHtml(row.name)} style={{ fontWeight: 500 }} /> },
      { key: 'productGroupName', header: 'Nhóm sản phẩm', render: (row) => <CellWithTooltip text={row.productGroupName} /> },
      { key: 'productCategoryName', header: 'Danh mục sản phẩm', render: (row) => <CellWithTooltip text={row.productCategoryName} /> },
      { key: 'businessName', header: 'Nghiệp vụ', render: (row) => <CellWithTooltip text={row.businessName} /> },
      { key: 'status', header: 'Trạng thái', width: '210px', render: (row) => <StatusBadge2 status={row.status} /> },
      { key: 'active', header: 'Hiệu lực', render: (row) => renderActiveToggle(row) },
      { key: 'createdByFullName', header: 'Người tạo', render: (row) => <CellWithTooltip text={row.createdByFullName || row.CREATED_BY_FULL_NAME || '---'} /> },
      { key: 'approvedByFullName', header: 'Người kiểm duyệt', render: (row) => <CellWithTooltip text={row.approvedByFullName || row.APPROVED_BY_FULL_NAME || row.approvedBy || '---'} /> },
      { key: 'version', header: 'Phiên bản', render: (row) => <span style={{ fontWeight: 600, color: '#053E2B' }}>{row.version ? `Phiên bản ${row.version}` : '---'}</span> },
      baseAction
    ];
  };

  return (
    <div className="product-container">
      {toast && (
        <div className={`import-toast ${toast.type === 'error' ? 'error' : ''}`} role="status" aria-live="polite">
          {toast.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="8" fill="#22C55E" />
              <path d="M5 8.5L7 10.5L11 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="8" cy="8" r="8" fill="#DC2626" />
              <path d="M8 5v3.5M8 11h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="content-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Quản lý sản phẩm</h2>

        <div className="header-actions" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="dropdown-wrapper" ref={headerListMenuRef} style={{ position: 'relative', zIndex: 99 }}>
            <button
              className="btn-dropdown"
              onClick={() => setOpenDropdown(openDropdown === 'listType' ? null : 'listType')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 8px' }}
            >
              <span style={{ fontWeight: 500, color: '#1F2937', fontSize: '15px' }}>{currentListName}</span>
              <svg className={`chevron-icon ${openDropdown === 'listType' ? 'rotate' : ''}`} width="12" height="12" viewBox="0 0 20 20" fill="none">
                <path d="M5 7.5L10 12.5L15 7.5" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {openDropdown === 'listType' && (
              <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', minWidth: '240px', padding: '8px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '8px', zIndex: 9999 }}>
                <div
                  className={`menu-item ${isOfficialPage ? 'selected' : ''}`}
                  onClick={() => { navigate('/products/official'); setOpenDropdown(null); }}
                  style={{ borderRadius: '6px', marginBottom: '4px', padding: '10px 12px', cursor: 'pointer', backgroundColor: isOfficialPage ? '#F3F4F6' : 'transparent' }}
                >
                  Danh sách chính thức
                </div>
                <div
                  className={`menu-item ${isProcessingPage ? 'selected' : ''}`}
                  onClick={() => { navigate('/products/processing'); setOpenDropdown(null); }}
                  style={{ borderRadius: '6px', marginBottom: '4px', padding: '10px 12px', cursor: 'pointer', backgroundColor: isProcessingPage ? '#F3F4F6' : 'transparent' }}
                >
                  Danh sách sản phẩm đang xử lý
                </div>
                <div
                  className={`menu-item ${isRejectedPage ? 'selected' : ''}`}
                  onClick={() => { navigate('/products/rejected'); setOpenDropdown(null); }}
                  style={{ borderRadius: '6px', padding: '10px 12px', cursor: 'pointer', backgroundColor: isRejectedPage ? '#F3F4F6' : 'transparent' }}
                >
                  Danh sách sản phẩm từ chối
                </div>
              </div>
            )}
          </div>

          <ImportAction onSuccess={handleImportSuccess} />

          <button
            className="btn-add-new"
            onClick={() => navigate('/products/add')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 16px', backgroundColor: '#B01E3E', border: 'none', borderRadius: '6px', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Thêm mới</span>
          </button>
        </div>
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

            {!isProcessingPage && (
              <>
                {/* Danh mục sản phẩm */}
                <TableColumnFilterDropdown
                  label="Danh mục sản phẩm"
                  options={categoryFilterOptions}
                  selectedValues={selectedCategories}
                  onSelectValues={setSelectedCategories}
                  isOpen={openDropdown === 'category'}
                  onToggle={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                  hasSearch={categoryFilterOptions.length > 5}
                  searchPlaceholder="Tìm danh mục..."
                />

                {/* Nghiệp vụ */}
                <TableColumnFilterDropdown
                  label="Nghiệp vụ"
                  options={businessFilterOptions}
                  selectedValues={selectedBusinesses}
                  onSelectValues={setSelectedBusinesses}
                  isOpen={openDropdown === 'business'}
                  onToggle={() => setOpenDropdown(openDropdown === 'business' ? null : 'business')}
                  hasSearch={businessFilterOptions.length > 5}
                  searchPlaceholder="Tìm nghiệp vụ..."
                />
              </>
            )}

            {/* Trạng thái */}
            <TableColumnFilterDropdown
              label="Trạng thái"
              options={STATUS_OPTIONS}
              selectedValues={selectedStatuses}
              onSelectValues={setSelectedStatuses}
              isOpen={openDropdown === 'status'}
              onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
            />

            {!isProcessingPage && (
              /* Hiệu lực */
              <TableColumnFilterDropdown
                label="Hiệu lực"
                options={ACTIVE_OPTIONS}
                selectedValues={selectedActives}
                onSelectValues={setSelectedActives}
                isOpen={openDropdown === 'active'}
                onToggle={() => setOpenDropdown(openDropdown === 'active' ? null : 'active')}
              />
            )}

            {isProcessingPage && (
              /* Tên yêu cầu */
              <TableColumnFilterDropdown
                label="Tên yêu cầu"
                options={requestNameFilterOptions}
                selectedValues={selectedRequestNames}
                onSelectValues={setSelectedRequestNames}
                isOpen={openDropdown === 'requestName'}
                onToggle={() => setOpenDropdown(openDropdown === 'requestName' ? null : 'requestName')}
                hasSearch={requestNameFilterOptions.length > 5}
                searchPlaceholder="Tìm yêu cầu..."
              />
            )}

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
            {selectedCategories.map((val) => (
              <FilterTag
                key={val}
                label={`Danh mục: ${categoryFilterOptions.find((o) => o.value === val)?.label || val}`}
                onRemove={() => setSelectedCategories((prev) => prev.filter((v) => v !== val))}
              />
            ))}
            {selectedBusinesses.map((val) => (
              <FilterTag
                key={val}
                label={`Nghiệp vụ: ${businessFilterOptions.find((o) => o.value === val)?.label || val}`}
                onRemove={() => setSelectedBusinesses((prev) => prev.filter((v) => v !== val))}
              />
            ))}
            {selectedStatuses.map((val) => (
              <FilterTag
                key={val}
                label={`Trạng thái: ${STATUS_OPTIONS.find((o) => o.value === val)?.label || val}`}
                onRemove={() => setSelectedStatuses((prev) => prev.filter((v) => v !== val))}
              />
            ))}
            {selectedActives.map((val) => (
              <FilterTag
                key={val}
                label={`Hiệu lực: ${ACTIVE_OPTIONS.find((o) => o.value === val)?.label || val}`}
                onRemove={() => setSelectedActives((prev) => prev.filter((v) => v !== val))}
              />
            ))}
            {selectedRequestNames.map((val) => (
              <FilterTag
                key={val}
                label={`Yêu cầu: ${val}`}
                onRemove={() => setSelectedRequestNames((prev) => prev.filter((v) => v !== val))}
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
            {(selectedGroups.length > 0 || selectedCategories.length > 0 || selectedBusinesses.length > 0 || selectedStatuses.length > 0 || selectedActives.length > 0 || selectedRequestNames.length > 0 || selectedCreators.length > 0 || selectedApprovers.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedGroups([]);
                  setSelectedCategories([]);
                  setSelectedBusinesses([]);
                  setSelectedStatuses([]);
                  setSelectedActives([]);
                  setSelectedRequestNames([]);
                  setSelectedCreators([]);
                  setSelectedApprovers([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#AE1C3F',
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

      <div className={`table-placeholder ${isProcessingPage ? 'table-processing-highlight' : ''}`} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <DataTable2
          columns={getColumns()}
          data={getFilteredData()}
          keyExtractor={(row) => row.id}
          page={currentPage}
          onPageChange={setCurrentPage}
          onRowClick={(row) => {
            savePageScroll(pageKey);
            navigate(`/products/${row.id}`);
          }}
          loading={loading}
          emptyText="Không tìm thấy sản phẩm nào phù hợp."
          getRowClassName={getCascadeRowClassName}
        />
      </div>
    </div>
  );
};

export default ProductPage;