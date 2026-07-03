import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Đã thêm để tránh lỗi "Cannot find name 'axios'"
import './ProductPage.css'; // Dùng chung file css layout của hệ thống
import RequestTable from '../components/RequestTable';
import { API_ENDPOINTS } from '../config/apiConfig'; 

// Khớp với các trạng thái thực tế trong ảnh thiết kế của bạn
const STATUS_OPTIONS = [
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
  { label: 'Hoàn thành', value: 'COMPLETED' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' }
];

const TIME_OPTIONS = [
  { label: 'Tất cả thời gian', value: 'ALL' },
  { label: 'Hôm nay', value: 'TODAY' },
  { label: '7 ngày qua', value: 'LAST_7_DAYS' },
  { label: 'Tháng này', value: 'THIS_MONTH' }
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
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const statusRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  // Gọi API lấy danh sách yêu cầu dựa vào bộ lọc
  const fetchData = async () => {
    setLoading(true);
    try {
      // Giả định API endpoint, bạn đổi lại cho khớp config thực tế của bạn nhé
      const response = await axios.get(API_ENDPOINTS.PRODUCT?.LIST, {
        params: {
          keyword: searchTerm.trim() || undefined,
          status: selectedStatus || undefined,
          timeRange: selectedTime !== 'ALL' ? selectedTime : undefined,
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

  // Debounce tìm kiếm 500ms để tránh spam API liên tục khi gõ phím
  useEffect(() => {
    const handler = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedStatus, selectedTime]);

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

  const getLabel = (options: any[], value: string) => {
    return options.find(opt => opt.value === value)?.label || value;
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

            {/* Dropdown Thời gian */}
            <div className="dropdown-wrapper" ref={timeRef}>
              <button className="btn-dropdown" onClick={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}>
                <span>Thời gian</span>
                <svg className={`chevron-icon ${openDropdown === 'time' ? 'rotate' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openDropdown === 'time' && (
                <div className="dropdown-menu">
                  {TIME_OPTIONS.map(opt => (
                    <div key={opt.value} className={`menu-item ${selectedTime === opt.value ? 'selected' : ''}`}
                      onClick={() => { setSelectedTime(opt.value); setOpenDropdown(null); }}>
                      <span>{opt.label}</span>
                      {selectedTime === opt.value && <i className="check-icon">✔</i>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Thanh hiển thị các Tag điều kiện đã chọn */}
          <div className="selected-filters-row">
            {selectedStatus && (
              <FilterTag 
                label={getLabel(STATUS_OPTIONS, selectedStatus)} 
                onRemove={() => setSelectedStatus(null)} 
              />
            )}
            {selectedTime && selectedTime !== 'ALL' && (
              <FilterTag 
                label={getLabel(TIME_OPTIONS, selectedTime)} 
                onRemove={() => setSelectedTime(null)} 
              />
            )}
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