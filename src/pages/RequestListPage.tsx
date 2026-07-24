import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './ProductPage.css';
import RequestTable from '../components/RequestTable';
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

const RequestListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Khởi tạo state trực tiếp từ URL Parameters để giữ lại khi chuyển trang/quay lại
  const [searchTerm, setSearchTerm] = useState(searchParams.get('keyword') || '');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(searchParams.get('status') || null);
  const [startDate, setStartDate] = useState<string>(searchParams.get('startDate') || ''); 
  const [endDate, setEndDate] = useState<string>(searchParams.get('endDate') || '');    

  // Temp states khi mở dropdown thời gian (chưa bấm Lưu)
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  
  // State quản lý tháng hiển thị ở lịch bên trái (mặc định là tháng hiện tại)
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const sDate = searchParams.get('startDate');
    return sDate ? new Date(sDate) : new Date();
  });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const statusRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  // Đồng bộ state bộ lọc vào URL mỗi khi giá trị thay đổi
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm.trim()) params.keyword = searchTerm.trim();
    if (selectedStatus) params.status = selectedStatus;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    // Cập nhật URLSearchParams mà không làm reload lại trang
    setSearchParams(params, { replace: true });
  }, [searchTerm, selectedStatus, startDate, endDate, setSearchParams]);

  // Khi mở dropdown thời gian, đồng bộ temp state và đưa lịch về tháng của startDate (nếu có)
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

  // Gọi API lấy danh sách yêu cầu dựa vào bộ lọc
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT?.LIST2, {
        params: {
          keyword: searchTerm.trim() || undefined,
          status: selectedStatus || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }
      });
      
      const resultData = response.data?.content || response.data;
      setData(Array.isArray(resultData) ? resultData : []);
    } catch (error) {
      console.error('Lỗi khi gọi API danh sách yêu cầu:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce tìm kiếm 500ms để tránh spam API liên tục
  useEffect(() => {
    const handler = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedStatus, startDate, endDate]);

  // Click outside để tự động đóng dropdown menu
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
    if (startStr) {
      setCalendarViewDate(new Date(startStr));
    }
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

  // Tạo mảng ngày cho một tháng cụ thể (Bắt đầu bằng Thứ Hai - Mo)
  const getDaysForMonth = (year: number, month: number) => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    let firstDayOfWeek = firstDayOfMonth.getDay(); // 0: Sun, 1: Mon...
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Chuyển sang chuẩn Thứ 2 đầu tuần

    const daysInMonth = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days = [];

    // Ngày của tháng trước bù vào đầu tuần
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ dateStr: formatDateString(d), dayNum: d.getDate(), isCurrentMonth: false });
    }

    // Ngày của tháng hiện tại
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ dateStr: formatDateString(d), dayNum: i, isCurrentMonth: true });
    }

    // Ngày của tháng sau bù vào cuối để đủ 42 ô (6 hàng x 7 cột)
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
    <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
      {/* Header tháng và nút chuyển */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        {showPrevArrow ? (
          <button 
            onClick={() => setCalendarViewDate(new Date(leftYear, leftMonth - 1, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        ) : <div style={{ width: 16 }} />}
        
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{monthLabel}</span>

        {showNextArrow ? (
          <button 
            onClick={() => setCalendarViewDate(new Date(leftYear, leftMonth + 1, 1))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        ) : <div style={{ width: 16 }} />}
      </div>

      {/* Tiêu đề thứ trong tuần */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: '#4B5563' }}>
        <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
      </div>

      {/* Lưới các ngày */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '4px', textAlign: 'center' }}>
        {days.map((item, idx) => {
          const isStart = tempStartDate === item.dateStr;
          const isEnd = tempEndDate === item.dateStr;
          const isInRange = tempStartDate && tempEndDate && item.dateStr > tempStartDate && item.dateStr < tempEndDate;
          
          let bg = 'transparent';
          let color = item.isCurrentMonth ? '#111827' : '#9CA3AF';
          let borderRadius = '50%';
          let fontWeight = 400;

          if (isStart || isEnd) {
            bg = '#9F1239';
            color = '#FFFFFF';
            fontWeight = 600;
          } else if (isInRange) {
            bg = '#FFE4E6';
            color = '#9F1239';
            borderRadius = '0%';
          }

          return (
            <div
              key={idx}
              onClick={() => handleDayClick(item.dateStr)}
              style={{
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                cursor: 'pointer',
                background: bg,
                color: color,
                borderRadius: borderRadius,
                fontWeight: fontWeight,
                transition: 'all 0.15s ease'
              }}
            >
              {item.dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Hàm render Tag lọc cho thời gian linh hoạt
  const renderDateTag = () => {
    if (!startDate && !endDate) return null;
    
    let label = '';
    if (startDate && endDate) {
      if (startDate === endDate) {
        label = `Ngày: ${startDate}`;
      } else {
        label = `${startDate} đến ${endDate}`;
      }
    } else if (startDate) {
      label = `Từ: ${startDate}`;
    } else if (endDate) {
      label = `Đến: ${endDate}`;
    }

    return (
      <FilterTag 
        label={label} 
        onRemove={() => { setStartDate(''); setEndDate(''); }} 
      />
    );
  };

  return (
    <div className="product-group-container">
      {/* HEADER PAGE */}
      <div className="content-wrapper">
        <h2 className="page-title">Danh sách yêu cầu</h2>
      </div>

      {/* FILTER SECTION */}
      <div className="filter-section">
        {/* Ô tìm kiếm */}
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

        <div className="dropdown-group-container">
          <div className="dropdown-row">
            {/* Dropdown Trạng thái */}
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

            {/* Dropdown Thời gian chuẩn phong cách Figma */}
            <div className="dropdown-wrapper" ref={timeRef}>
              <button className="btn-dropdown" onClick={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}>
                <span>Thời gian</span>
                <svg className={`chevron-icon ${openDropdown === 'time' ? 'rotate' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openDropdown === 'time' && (
                <div className="dropdown-menu" style={{ 
                  padding: '0', 
                  display: 'flex', 
                  flexDirection: 'column',
                  width: '680px', 
                  maxWidth: '95vw',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#fff',
                  zIndex: 1000
                }}>
                  {/* Phần trên: Sidebar bên trái + 2 Lịch đôi bên phải */}
                  <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {/* Sidebar Presets */}
                    <div style={{ 
                      width: '180px', 
                      borderRight: '1px solid #E5E7EB', 
                      padding: '12px 0', 
                      display: 'flex', 
                      flexDirection: 'column',
                      background: '#FFFFFF',
                      flexShrink: 0
                    }}>
                      {DATE_PRESETS.map(preset => (
                        <div 
                          key={preset.value}
                          onClick={() => applyPreset(preset.value)}
                          style={{
                            padding: '10px 16px',
                            fontSize: '13px',
                            color: activePreset === preset.value ? '#9F1239' : '#374151',
                            fontWeight: activePreset === preset.value ? 600 : 400,
                            background: activePreset === preset.value ? '#FFE4E6' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            if (activePreset !== preset.value) (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
                          }}
                          onMouseLeave={(e) => {
                            if (activePreset !== preset.value) (e.currentTarget as HTMLElement).style.background = 'transparent';
                          }}
                        >
                          {preset.label}
                        </div>
                      ))}
                    </div>

                    {/* Dual Month Calendar View */}
                    <div style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
                      {renderCalendarGrid(leftDays, `Tháng ${leftMonth + 1}/${leftYear}`, true, false)}
                      <div style={{ width: '1px', background: '#E5E7EB' }} />
                      {renderCalendarGrid(rightDays, `Tháng ${rightMonth + 1}/${rightYear}`, false, true)}
                    </div>
                  </div>

                  {/* Phần dưới: Footer chứa Input Từ ngày - Đến ngày và Nút Hủy / Lưu */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    borderTop: '1px solid #E5E7EB', 
                    padding: '12px 16px',
                    background: '#FAFAFA'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="date" 
                        value={tempStartDate} 
                        onChange={(e) => { setTempStartDate(e.target.value); setActivePreset(null); }}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', outline: 'none', fontSize: '13px', background: '#fff' }}
                      />
                      <span style={{ color: '#9CA3AF' }}>-</span>
                      <input 
                        type="date" 
                        value={tempEndDate}
                        min={tempStartDate}
                        onChange={(e) => { setTempEndDate(e.target.value); setActivePreset(null); }}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', outline: 'none', fontSize: '13px', background: '#fff' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={handleCancelDate}
                        style={{ padding: '6px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                      >
                        Hủy
                      </button>
                      <button 
                        onClick={handleSaveDate}
                        style={{ padding: '6px 20px', borderRadius: '6px', border: 'none', background: '#9F1239', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                      >
                        Lưu
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Thanh hiển thị các Tag điều kiện đã chọn */}
          <div className="selected-filters-row">
            {selectedStatus && (
              <FilterTag 
                label={getStatusLabel(selectedStatus)} 
                onRemove={() => setSelectedStatus(null)} 
              />
            )}
            
            {/* Render Tag thời gian linh hoạt */}
            {renderDateTag()}
          </div>
        </div>
      </div>

      {/* TABLE RENDERING */}
      <div className="table-placeholder">
        {loading ? (
          <div className="loading-spinner">Đang tải dữ liệu...</div>
        ) : data.length > 0 ? (
          <RequestTable data={data} />
        ) : (
          <div className="empty-state">Không tìm thấy kết quả phù hợp.</div>
        )}
      </div>
    </div>
  );
};

export default RequestListPage;