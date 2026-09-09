import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RequestListPage.css';
import DataTable, { type Column } from '../components/ui/DataTable2';
import StatusBadge2 from '../components/ui/StatusBadgeListRequest';
import ImportProductModal from '../components/ImportProductModal';
import CellWithTooltip from '../components/ui/CellWithTooltip';
import TableColumnFilterDropdown from '../components/ui/TableColumnFilterDropdown';
import FilterScrollContainer from '../components/ui/FilterScrollContainer';
import { API_ENDPOINTS } from '../config/apiConfig';
import { getCachedPageState, setCachedPageState, savePageScroll, restorePageScroll } from '../utils/pageStateCache';

const STATUS_OPTIONS = [
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
  { label: 'Hoàn thành', value: 'ACTIVE' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Từ chối', value: 'REJECTED' },
  { label: 'Lưu nháp', value: 'DRAFT' }
];

const DATE_PRESETS = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Hôm qua', value: 'yesterday' },
  { label: 'Tuần này', value: 'thisWeek' },
  { label: 'Tuần trước', value: 'lastWeek' },
  { label: 'Tháng này', value: 'thisMonth' },
  { label: 'Tháng trước', value: 'lastMonth' },
  { label: 'Năm nay', value: 'thisYear' },
  { label: 'Năm trước', value: 'lastYear' },
  { label: 'Toàn bộ thời gian', value: 'allTime' },
];

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

const stripHtml = (htmlString: string) => {
  if (!htmlString) return '---';
  return htmlString.replace(/<\/?[^>]+(>|$)/g, "");
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

const RequestListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('keyword') || '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => {
    const raw = searchParams.get('status');
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  });
  const [startDate, setStartDate] = useState<string>(searchParams.get('startDate') || ''); 
  const [endDate, setEndDate] = useState<string>(searchParams.get('endDate') || '');    

  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const sDate = searchParams.get('startDate');
    return sDate ? new Date(sDate) : new Date();
  });

  const cached = getCachedPageState('request-list');

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(cached?.selectedTypes ?? []);
  const [selectedCreators, setSelectedCreators] = useState<string[]>(cached?.selectedCreators ?? []);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>(cached?.selectedApprovers ?? []);
  const [currentPage, setCurrentPage] = useState<number>(cached?.currentPage ?? 1);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const timeRef = useRef<HTMLDivElement>(null);
  const timeBtnRef = useRef<HTMLButtonElement>(null);
  const filterSectionRef = useRef<HTMLDivElement>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setCachedPageState('request-list', {
      selectedTypes,
      selectedCreators,
      selectedApprovers,
      currentPage,
    });
  }, [selectedTypes, selectedCreators, selectedApprovers, currentPage]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm.trim()) params.keyword = searchTerm.trim();
    if (selectedStatuses.length > 0) params.status = selectedStatuses.join(',');
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    setSearchParams(params, { replace: true });
  }, [searchTerm, selectedStatuses, startDate, endDate, setSearchParams]);

  useEffect(() => {
    if (openDropdown === 'time') {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
      if (startDate) {
        setCalendarViewDate(new Date(startDate));
      } else {
        setCalendarViewDate(new Date());
      }
    }
  }, [openDropdown, startDate, endDate]);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT_REQUESTS.LIST, {
        params: {
          keyword: searchTerm.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }
      });
      
      const resultData = response.data?.content || response.data;
      const rawList = Array.isArray(resultData) ? resultData : [];

      let userMap: Record<string, string> = {};
      try {
        const rawUsers = sessionStorage.getItem('beadminUsers') || sessionStorage.getItem('headminUsers');
        if (rawUsers) {
          const parsedUsers = JSON.parse(rawUsers);
          const userList = parsedUsers.listUser || (Array.isArray(parsedUsers) ? parsedUsers : []);
          userList.forEach((user: any) => {
            if (user.username) {
              userMap[user.username] = user.fullname || user.fullName || user.username;
            }
          });
        }
      } catch (e) {}

      const enrichedData = rawList.map((item: any) => ({
        ...item,
        createdByFullName: item.createdByFullName || item.CREATED_BY_FULL_NAME || userMap[item.createdBy] || item.createdBy || null,
        approvedByFullName: item.approvedByFullName || item.APPROVED_BY_FULL_NAME || userMap[item.approvedBy] || item.approvedBy || null,
        approvedBy: item.approvedByFullName || item.APPROVED_BY_FULL_NAME || userMap[item.approvedBy] || item.approvedBy || null 
      }));

      setData(enrichedData);
      if (!isBackground) {
        restorePageScroll('request-list');
      }
    } catch (error) {
      if (!isBackground) {
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
  }, [searchTerm, startDate, endDate]);

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
  }, [searchTerm, startDate, endDate]);

  useLayoutEffect(() => {
    if (openDropdown !== 'time') {
      setDropdownCoords(null);
      return;
    }

    const updatePosition = () => {
      const btn = timeBtnRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = 640;
      let left = rect.left;
      if (left + menuWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - menuWidth - 16);
      }
      setDropdownCoords({
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
  }, [openDropdown]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        target?.closest?.('.table-filter-dropdown-menu') ||
        target?.closest?.('.date-picker-dropdown') ||
        target?.closest?.('.dropdown-wrapper')
      ) return;
      setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const TYPE_OPTIONS = [
    { label: 'Tạo theo lô', value: 'batch' },
    { label: 'Tạo lẻ', value: 'single' },
  ];

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
      if (selectedStatuses.length > 0) {
        const status = String(item.status || '');
        if (!selectedStatuses.includes(status)) return false;
      }
      if (selectedTypes.length > 0) {
        const matchesType = selectedTypes.some(t => (t === 'batch' && item.isBatch) || (t === 'single' && !item.isBatch));
        if (!matchesType) return false;
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

  const getStatusLabel = (value: string) => {
    return STATUS_OPTIONS.find(opt => opt.value === value)?.label || value;
  };

  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleImportSuccess = () => {
    fetchData();
    setToast({ type: 'success', message: 'Nhập yêu cầu từ Excel thành công.' });
  };

  const applyPreset = (type: string) => {
    setActivePreset(type);
    const now = new Date();
    let startStr = '';
    let endStr = '';

    if (type === 'today') {
      startStr = formatDateString(now);
      endStr = formatDateString(now);
    } else if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      startStr = formatDateString(y);
      endStr = formatDateString(y);
    } else if (type === 'thisWeek') {
      const day = now.getDay();
      const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now);
      mon.setDate(diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      startStr = formatDateString(mon);
      endStr = formatDateString(sun);
    } else if (type === 'lastWeek') {
      const day = now.getDay();
      const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
      const lastMon = new Date(now);
      lastMon.setDate(diffToMon - 7);
      const lastSun = new Date(lastMon);
      lastSun.setDate(lastMon.getDate() + 6);
      startStr = formatDateString(lastMon);
      endStr = formatDateString(lastSun);
    } else if (type === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      startStr = formatDateString(firstDay);
      endStr = formatDateString(lastDay);
    } else if (type === 'lastMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      startStr = formatDateString(firstDay);
      endStr = formatDateString(lastDay);
    } else if (type === 'thisYear') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      startStr = formatDateString(firstDay);
      endStr = formatDateString(lastDay);
    } else if (type === 'lastYear') {
      const firstDay = new Date(now.getFullYear() - 1, 0, 1);
      const lastDay = new Date(now.getFullYear() - 1, 11, 31);
      startStr = formatDateString(firstDay);
      endStr = formatDateString(lastDay);
    } else if (type === 'allTime') {
      startStr = '';
      endStr = '';
    }

    setTempStartDate(startStr);
    setTempEndDate(endStr);
    if (startStr) setCalendarViewDate(new Date(startStr));
  };

  const handleDayClick = (dateStr: string) => {
    setActivePreset(null);
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(dateStr);
      setTempEndDate('');
    } else if (tempStartDate && !tempEndDate) {
      if (dateStr < tempStartDate) {
        setTempStartDate(dateStr);
      } else {
        setTempEndDate(dateStr);
      }
    }
  };

  const handleSaveDate = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setOpenDropdown(null);
  };

  const handleCancelDate = () => {
    setOpenDropdown(null);
  };

  const getDaysForMonth = (year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    let firstDayOfWeek = firstDayOfMonth.getDay(); 
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; 

    const daysInMonth = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days = [];

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ dateStr: formatDateString(d), dayNum: d.getDate(), isCurrentMonth: false });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ dateStr: formatDateString(d), dayNum: i, isCurrentMonth: true });
    }

    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ dateStr: formatDateString(d), dayNum: i, isCurrentMonth: false });
    }

    return days;
  };

  const leftYear = calendarViewDate.getFullYear();
  const leftMonth = calendarViewDate.getMonth();
  
  const rightViewDate = new Date(leftYear, leftMonth + 1, 1);
  const rightYear = rightViewDate.getFullYear();
  const rightMonth = rightViewDate.getMonth();

  const leftDays = getDaysForMonth(leftYear, leftMonth);
  const rightDays = getDaysForMonth(rightYear, rightMonth);

  const renderCalendarGrid = (days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }>, monthLabel: string, showPrevArrow: boolean, showNextArrow: boolean) => (
    <div className="calendar-month">
      <div className="calendar-month-header">
        {showPrevArrow ? (
          <button type="button" onClick={() => setCalendarViewDate(new Date(leftYear, leftMonth - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '2px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        ) : <div style={{ width: 14 }} />}
        <span style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>{monthLabel}</span>
        {showNextArrow ? (
          <button type="button" onClick={() => setCalendarViewDate(new Date(leftYear, leftMonth + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '2px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        ) : <div style={{ width: 14 }} />}
      </div>
      <div className="calendar-weekdays">
        <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
      </div>
      <div className="calendar-days">
        {days.map((item, idx) => {
          const isStart = tempStartDate === item.dateStr;
          const isEnd = tempEndDate === item.dateStr;
          const isInRange = tempStartDate && tempEndDate && item.dateStr > tempStartDate && item.dateStr < tempEndDate;
          let cellClass = 'calendar-grid-cell';
          if (!item.isCurrentMonth) cellClass += ' disabled';
          if (isStart || isEnd) cellClass += ' selected';
          if (isInRange) cellClass += ' in-range';
          
          return (
            <div key={idx} className={cellClass} onClick={() => { if (item.isCurrentMonth) handleDayClick(item.dateStr); }}>
              {item.dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );

  const formatUIDate = (dateString: string) => {
    if (!dateString) return '---';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const handleViewDetail = (item: any) => {
    if (item.isBatch) {
      navigate(`/products/batch/${item.requestId}`, { state: { requestName: item.requestName, requestId: item.requestId } });
    } else {
      navigate(`/product/${item.productId}`, { state: { requestName: item.requestName, requestId: item.requestId } });
    }
  };

  const STATUS_DETAIL_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
    ACTIVE: { label: 'Hoàn thành', bg: '#E0F9EC', color: '#14532D', border: '#A7F3D0' },
    COMPLETED: { label: 'Hoàn thành', bg: '#E0F9EC', color: '#14532D', border: '#A7F3D0' },
    APPROVED: { label: 'Đã duyệt', bg: '#E0F9EC', color: '#14532D', border: '#A7F3D0' },
    PENDING_APPROVAL: { label: 'Chờ duyệt', bg: '#FED7AA', color: '#7C2D12', border: '#FDBA74' },
    NEEDS_REVISION: { label: 'Yêu cầu chỉnh sửa', bg: '#FFF8B6', color: '#433D1F', border: '#FEF08A' },
    REJECTED: { label: 'Từ chối', bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' },
    DRAFT: { label: 'Lưu nháp', bg: '#BAE6FD', color: '#082F49', border: '#7DD3FC' },
  };

  const ORDERED_STATUS_KEYS = ['ACTIVE', 'APPROVED', 'COMPLETED', 'PENDING_APPROVAL', 'NEEDS_REVISION', 'REJECTED', 'DRAFT'];

  const renderStatusDetail = (row: any) => {
    const counts: Record<string, number> = { ...(row.statusCounts || {}) };

    // Fallback nếu row.statusCounts chưa có từ backend hoặc object rỗng
    if (Object.keys(counts).length === 0 && row.status) {
      counts[row.status] = row.isBatch ? (Number(row.totalProducts) || 1) : 1;
    }

    const activeEntries = Object.entries(counts)
      .filter(([_, count]) => typeof count === 'number' && count > 0)
      .sort(([a], [b]) => {
        const idxA = ORDERED_STATUS_KEYS.indexOf(a.toUpperCase());
        const idxB = ORDERED_STATUS_KEYS.indexOf(b.toUpperCase());
        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
      });

    if (activeEntries.length === 0) {
      return <CellWithTooltip text="—" />;
    }

    const tooltipText = activeEntries
      .map(([statusKey, count]) => {
        const cfg = STATUS_DETAIL_CONFIG[statusKey.toUpperCase()] || { label: statusKey };
        return `${count} ${cfg.label}`;
      })
      .join(', ');

    return (
      <CellWithTooltip
        tooltip={tooltipText}
        className="status-detail-cell"
        contentStyle={{
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          maxHeight: 'none',
          WebkitLineClamp: 'unset',
          WebkitBoxOrient: 'unset',
        }}
      >
        <div 
          className="status-detail-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: '6px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            width: '100%',
          }}
        >
          {activeEntries.map(([statusKey, count]) => {
            const key = statusKey.toUpperCase();
            const cfg = STATUS_DETAIL_CONFIG[key] || {
              label: statusKey,
              bg: '#F3F4F6',
              color: '#374151',
              border: '#E5E7EB',
            };

            return (
              <span
                key={statusKey}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: cfg.bg,
                  color: cfg.color,
                  border: `1px solid ${cfg.border}`,
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  lineHeight: '18px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontWeight: 700 }}>{count}</span>
                <span>{cfg.label}</span>
              </span>
            );
          })}
        </div>
      </CellWithTooltip>
    );
  };

  const columns: Column<any>[] = [
    {
      key: 'stt',
      header: 'STT',
      width: '70px',
      align: 'center',
      render: (_, index) => <CellWithTooltip text={index + 1} style={{ justifyContent: 'center' }} />,
    },
    {
      key: 'requestName',
      header: 'Tên yêu cầu',
      render: (row) => (
        <CellWithTooltip
          text={stripHtml(row.requestName)}
          style={{ fontWeight: 500, color: '#1F2937' }}
        />
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '210px',
      render: (row) => <StatusBadge2 status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      width: '150px',
      render: (row) => <CellWithTooltip text={formatUIDate(row.createdAt)} style={{ color: '#4B5563' }} />,
    },
    {
      key: 'totalProducts',
      header: 'Số lượng',
      width: '130px',
      render: (row) => (
        <CellWithTooltip
          text={row.isBatch ? `${row.totalProducts} Sản phẩm` : 'Tạo lẻ'}
          style={{ color: '#4B5563', fontWeight: row.isBatch ? 600 : 400 }}
        />
      ),
    },
    {
      key: 'statusDetail',
      header: 'Chi tiết trạng thái',
      width: '280px',
      render: (row) => renderStatusDetail(row),
    },
    {
      key: 'createdByFullName',
      header: 'Người tạo',
      render: (row) => <CellWithTooltip text={row.createdByFullName || '---'} style={{ color: '#4B5563' }} />,
    },
    {
      key: 'approvedBy',
      header: 'Người duyệt',
      render: (row) => <CellWithTooltip text={row.approvedBy || '---'} style={{ color: '#4B5563' }} />,
    },
    {
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
              handleViewDetail(row);
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9E1F36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </CellWithTooltip>
      ),
    },
  ];

  return (
    <div className="request-list-container">
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

      <div className="content-wrapper">
        <h2 className="page-title">Danh sách yêu cầu</h2>

        <div className="header-actions">
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
            {/* Trạng thái */}
            <TableColumnFilterDropdown
              label="Trạng thái"
              options={STATUS_OPTIONS}
              selectedValues={selectedStatuses}
              onSelectValues={setSelectedStatuses}
              isOpen={openDropdown === 'status'}
              onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
            />

            {/* Thời gian */}
            <div className="dropdown-wrapper" ref={timeRef} style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, whiteSpace: 'nowrap' }}>
              <button
                type="button"
                ref={timeBtnRef}
                className="btn-dropdown"
                onClick={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}
                style={{ whiteSpace: 'nowrap' }}
              >
                <span>Thời gian</span>
                <svg className={`chevron-icon ${openDropdown === 'time' ? 'rotate' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openDropdown === 'time' && dropdownCoords && createPortal(
                <div
                  className="dropdown-menu date-picker-dropdown"
                  style={{ position: 'fixed', top: dropdownCoords.top, left: dropdownCoords.left, zIndex: 999999 }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="date-picker-body">
                    <div className="date-preset-sidebar">
                      {DATE_PRESETS.map((preset) => (
                        <button key={preset.value} className={`preset-btn ${activePreset === preset.value ? 'active' : ''}`} onClick={() => applyPreset(preset.value)}>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="calendar-wrapper">
                      {renderCalendarGrid(leftDays, `${leftMonth + 1} / ${leftYear}`, true, false)}
                      {renderCalendarGrid(rightDays, `${rightMonth + 1} / ${rightYear}`, false, true)}
                    </div>
                  </div>
                  <div className="date-picker-footer">
                    <button className="btn-cancel" onClick={handleCancelDate}>Hủy</button>
                    <button className="btn-apply" onClick={handleSaveDate}>Áp dụng</button>
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* Số lượng / Loại yêu cầu */}
            <TableColumnFilterDropdown
              label="Số lượng"
              options={TYPE_OPTIONS}
              selectedValues={selectedTypes}
              onSelectValues={setSelectedTypes}
              isOpen={openDropdown === 'type'}
              onToggle={() => setOpenDropdown(openDropdown === 'type' ? null : 'type')}
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

            {/* Người duyệt */}
            <TableColumnFilterDropdown
              label="Người duyệt"
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
            {selectedStatuses.map((val) => (
              <FilterTag
                key={val}
                label={getStatusLabel(val)}
                onRemove={() => setSelectedStatuses((prev) => prev.filter((v) => v !== val))}
              />
            ))}
            {(startDate || endDate) && (
              <FilterTag 
                label={`${startDate ? formatUIDate(startDate) : ''} - ${endDate ? formatUIDate(endDate) : ''}`} 
                onRemove={() => { setStartDate(''); setEndDate(''); }} 
              />
            )}
            {selectedTypes.map((val) => (
              <FilterTag
                key={val}
                label={`Loại: ${TYPE_OPTIONS.find((o) => o.value === val)?.label || val}`}
                onRemove={() => setSelectedTypes((prev) => prev.filter((v) => v !== val))}
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
                label={`Người duyệt: ${val}`}
                onRemove={() => setSelectedApprovers((prev) => prev.filter((v) => v !== val))}
              />
            ))}
            {(selectedTypes.length > 0 || selectedCreators.length > 0 || selectedApprovers.length > 0 || selectedStatuses.length > 0 || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTypes([]);
                  setSelectedCreators([]);
                  setSelectedApprovers([]);
                  setSelectedStatuses([]);
                  setStartDate('');
                  setEndDate('');
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

      <div className="table-placeholder">
        <DataTable
          columns={columns}
          data={getFilteredData()}
          keyExtractor={(row) => row.requestId || row.productId || row.requestName}
          page={currentPage}
          onPageChange={setCurrentPage}
          onRowClick={(row) => {
            savePageScroll('request-list');
            handleViewDetail(row);
          }}
          loading={loading}
          emptyText="Không tìm thấy yêu cầu nào phù hợp."
        />
      </div>
    </div>
  );
};

export default RequestListPage;