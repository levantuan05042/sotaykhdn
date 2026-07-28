import React, { useState, useRef, useEffect } from 'react';
import './DateRangePicker.css';

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

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onSave: (startDate: string, endDate: string) => void;
  label?: string;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onSave,
  label = 'Thời gian',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Temp states when the dropdown is open (not saved yet)
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Month showing on the left calendar (default is current month)
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => new Date());

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync temp state when dropdown is opened
  useEffect(() => {
    if (isOpen) {
      setTempStartDate(startDate);
      setTempEndDate(endDate);
      if (startDate) {
        setCalendarViewDate(new Date(startDate));
      } else {
        setCalendarViewDate(new Date());
      }
      // Determine active preset if possible
      setActivePreset(null);
    }
  }, [isOpen, startDate, endDate]);

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
    onSave(tempStartDate, tempEndDate);
    setIsOpen(false);
  };

  const handleCancelDate = () => {
    setIsOpen(false);
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

  const renderCalendarGrid = (
    days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }>, 
    monthLabel: string, 
    showPrevArrow: boolean, 
    showNextArrow: boolean
  ) => (
    <div className="drp-calendar-grid">
      <div className="drp-calendar-header">
        {showPrevArrow ? (
          <button 
            type="button"
            onClick={() => setCalendarViewDate(new Date(leftYear, leftMonth - 1, 1))}
            className="drp-arrow-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        ) : <div className="drp-arrow-placeholder" />}
        
        <span className="drp-month-label">{monthLabel}</span>

        {showNextArrow ? (
          <button 
            type="button"
            onClick={() => setCalendarViewDate(new Date(leftYear, leftMonth + 1, 1))}
            className="drp-arrow-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        ) : <div className="drp-arrow-placeholder" />}
      </div>

      <div className="drp-weekdays">
        <span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span>
      </div>

      <div className="drp-days-grid">
        {days.map((item, idx) => {
          const isStart = tempStartDate === item.dateStr;
          const isEnd = tempEndDate === item.dateStr;
          const isInRange = tempStartDate && tempEndDate && item.dateStr > tempStartDate && item.dateStr < tempEndDate;
          
          let dayClass = 'drp-day-cell';
          if (item.isCurrentMonth) {
            dayClass += ' current-month';
          } else {
            dayClass += ' other-month';
          }

          if (isStart) {
            dayClass += ' range-start';
          } else if (isEnd) {
            dayClass += ' range-end';
          } else if (isInRange) {
            dayClass += ' range-mid';
          }

          return (
            <div
              key={idx}
              onClick={() => handleDayClick(item.dateStr)}
              className={dayClass}
            >
              {item.dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getButtonLabel = () => {
    if (startDate && endDate) {
      return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
    }
    if (startDate) {
      return `Từ ${formatDisplayDate(startDate)}`;
    }
    return label;
  };

  return (
    <div className={`date-range-picker-wrapper ${className}`} ref={dropdownRef}>
      <button
        className={`date-range-picker-btn ${isOpen ? 'active' : ''} ${(startDate || endDate) ? 'has-value' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>{getButtonLabel()}</span>
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
        <div className="date-range-picker-menu">
          <div className="drp-main-content">
            {/* Presets Sidebar */}
            <div className="drp-presets-sidebar">
              {DATE_PRESETS.map(preset => (
                <button
                  type="button"
                  key={preset.value}
                  onClick={() => applyPreset(preset.value)}
                  className={`drp-preset-item ${activePreset === preset.value ? 'active' : ''}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendars */}
            <div className="drp-calendars-container">
              {renderCalendarGrid(leftDays, `Tháng ${leftMonth + 1}/${leftYear}`, true, false)}
              <div className="drp-calendars-divider" />
              {renderCalendarGrid(rightDays, `Tháng ${rightMonth + 1}/${rightYear}`, false, true)}
            </div>
          </div>

          {/* Footer Inputs & Buttons */}
          <div className="drp-footer">
            <div className="drp-inputs-group">
              <input 
                type="date" 
                value={tempStartDate} 
                onChange={(e) => { setTempStartDate(e.target.value); setActivePreset(null); }}
                className="drp-date-input"
              />
              <span className="drp-inputs-separator">-</span>
              <input 
                type="date" 
                value={tempEndDate}
                min={tempStartDate}
                onChange={(e) => { setTempEndDate(e.target.value); setActivePreset(null); }}
                className="drp-date-input"
              />
            </div>

            <div className="drp-buttons-group">
              <button 
                type="button" 
                onClick={handleCancelDate}
                className="drp-btn-cancel"
              >
                Hủy
              </button>
              <button 
                type="button" 
                onClick={handleSaveDate}
                className="drp-btn-save"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
