import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RequestListPage.css';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge2 from '../components/ui/StatusBadge2';
import { API_ENDPOINTS } from '../config/apiConfig';

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

const RequestListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('keyword') || '');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(searchParams.get('status') || null);
  const [startDate, setStartDate] = useState<string>(searchParams.get('startDate') || ''); 
  const [endDate, setEndDate] = useState<string>(searchParams.get('endDate') || '');    

  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const sDate = searchParams.get('startDate');
    return sDate ? new Date(sDate) : new Date();
  });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const statusRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm.trim()) params.keyword = searchTerm.trim();
    if (selectedStatus) params.status = selectedStatus;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    setSearchParams(params, { replace: true });
  }, [searchTerm, selectedStatus, startDate, endDate, setSearchParams]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT_REQUESTS.LIST, {
        params: {
          keyword: searchTerm.trim() || undefined,
          status: selectedStatus || undefined,
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
        createdByFullName: item.createdByFullName || userMap[item.createdBy] || item.createdBy || null,
        approvedBy: userMap[item.approvedBy] || item.approvedBy || null 
      }));

      setData(enrichedData);
    } catch (error) {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedStatus, startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusRef.current && !statusRef.current.contains(event.target as Node) &&
        timeRef.current && !timeRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusLabel = (value: string) => {
    return STATUS_OPTIONS.find(opt => opt.value === value)?.label || value;
  };

  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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

    const remainingCells = 42 - days.length;
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
    <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        {showPrevArrow ? (
          <button onClick={() => setCalendarViewDate(new Date(leftYear, leftMonth - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        ) : <div style={{ width: 16 }} />}
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{monthLabel}</span>
        {showNextArrow ? (
          <button onClick={() => setCalendarViewDate(new Date(leftYear, leftMonth + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        ) : <div style={{ width: 16 }} />}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>
        <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '4px', textAlign: 'center' }}>
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
      navigate(`/products/batch/${item.requestId}`);
    } else {
      navigate(`/product/${item.productId}`);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'stt',
      header: 'STT',
      width: '70px',
      align: 'center',
      render: (_, index) => index + 1,
    },
    {
      key: 'requestName',
      header: 'Tên yêu cầu',
      render: (row) => (
        <span className="truncate-text" style={{ fontWeight: 500, color: '#1F2937' }} title={stripHtml(row.requestName)}>
          {stripHtml(row.requestName)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '180px',
      render: (row) => <StatusBadge2 status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      width: '150px',
      render: (row) => <span style={{ color: '#4B5563' }}>{formatUIDate(row.createdAt)}</span>,
    },
    {
      key: 'totalProducts',
      header: 'Số lượng',
      width: '150px',
      render: (row) => (
        <span style={{ color: '#4B5563', fontWeight: row.isBatch ? 600 : 400 }}>
          {row.isBatch ? `${row.totalProducts} Sản phẩm` : 'Tạo lẻ'}
        </span>
      ),
    },
    {
      key: 'createdByFullName',
      header: 'Người tạo',
      render: (row) => <span style={{ color: '#4B5563' }}>{row.createdByFullName || '---'}</span>,
    },
    {
      key: 'approvedBy',
      header: 'Người duyệt',
      render: (row) => <span style={{ color: '#4B5563' }}>{row.approvedBy || '---'}</span>,
    },
    {
      key: 'action',
      header: '',
      width: '80px',
      align: 'center',
      render: (row) => (
        <button
          className="btn-view-detail"
          title="Xem chi tiết"
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
      ),
    },
  ];

  return (
    <div className="request-list-container">
      <div className="content-wrapper">
        <h2 className="page-title">Danh sách yêu cầu</h2>
      </div>

      <div className="filter-section">
        <div className="dropdown-group-container">
          <div className="dropdown-row">
            <div className="dropdown-wrapper" ref={statusRef}>
              <button className="btn-dropdown" onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}>
                <span>Trạng thái</span>
                <svg className={`chevron-icon ${openDropdown === 'status' ? 'rotate' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openDropdown === 'status' && (
                <div className="dropdown-menu">
                  {STATUS_OPTIONS.map(opt => (
                    <div key={opt.value} className={`menu-item ${selectedStatus === opt.value ? 'selected' : ''}`}
                      onClick={() => { setSelectedStatus(opt.value); setOpenDropdown(null); }}>
                      <span>{opt.label}</span>
                      {selectedStatus === opt.value && <i className="check-icon">✔</i>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dropdown-wrapper" ref={timeRef}>
              <button className="btn-dropdown" onClick={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}>
                <span>Thời gian</span>
                <svg className={`chevron-icon ${openDropdown === 'time' ? 'rotate' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openDropdown === 'time' && (
                <div className="dropdown-menu date-picker-dropdown">
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
                </div>
              )}
            </div>
          </div>

          <div className="selected-filters-row">
            {selectedStatus && <FilterTag label={getStatusLabel(selectedStatus)} onRemove={() => setSelectedStatus(null)} />}
            {(startDate || endDate) && (
              <FilterTag 
                label={`${startDate ? formatUIDate(startDate) : ''} - ${endDate ? formatUIDate(endDate) : ''}`} 
                onRemove={() => { setStartDate(''); setEndDate(''); }} 
              />
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
          data={data}
          keyExtractor={(row) => row.requestId || row.productId || row.requestName}
          onRowClick={(row) => handleViewDetail(row)}
          loading={loading}
          emptyText="Không tìm thấy yêu cầu nào phù hợp."
        />
      </div>
    </div>
  );
};

export default RequestListPage;