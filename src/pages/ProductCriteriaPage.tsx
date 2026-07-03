import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProductCriteriaPage.css';
import ProductCriteriaTable from '../components/ProductCriteriaTable';
import { API_ENDPOINTS } from '../config/apiConfig'; 

const STATUS_OPTIONS = [
  { label: 'Đang hoạt động', value: 'ACTIVE' },
  { label: 'Lưu nháp', value: 'DRAFT' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
  { label: 'Từ chối', value: 'REJECTED' },
  { label: 'Lưu trữ', value: 'ARCHIVED' }
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

const ProductCriteriaPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  // Bộ lọc theo các Nhóm sản phẩm được chọn
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');

  const statusRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  // Gọi API lấy danh sách Nhóm sản phẩm đổ vào bộ lọc Dropdown
  useEffect(() => {
    const fetchGroupOptions = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST);
        const mappedGroups = (response.data || [])
          .filter((item: any) => item.status === 'ACTIVE')
          .map((item: any) => ({
            value: item.id,
            label: item.name
          }));
          
        setGroupOptions(mappedGroups);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách nhóm sản phẩm:', error);
      }
    };
    fetchGroupOptions();
  }, []);

  // Gọi API lấy danh sách Tiêu chí kèm theo các tham số bộ lọc
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT_CRITERIA.LIST, {
        params: {
          keyword: searchTerm.trim() || undefined,
          status: selectedStatus || undefined,
          types: selectedGroups.length > 0 ? selectedGroups : undefined, // Khớp với đầu nhận @RequestParam List<String> types tại Spring Boot
        },
        paramsSerializer: (params) => {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              // Biến đổi mảng thành dạng: ?types=id1&types=id2
              value.forEach(v => searchParams.append(key, v)); 
            } else if (value !== undefined) {
              searchParams.append(key, String(value));
            }
          });
          return searchParams.toString();
        }
      });
      
      const resultData = response.data?.content || response.data;
      setData(Array.isArray(resultData) ? resultData : []);

    } catch (error) {
      console.error('Lỗi khi gọi API danh sách tiêu chí sản phẩm:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce 500ms tự động kích hoạt tìm kiếm khi thay đổi các bộ lọc đầu vào
  useEffect(() => {
    const handler = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedStatus, selectedGroups]);

  // Bắt sự kiện click bên ngoài để ẩn dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node) &&
          groupRef.current && !groupRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (options: any[], value: string) => {
    return options.find(opt => opt.value === value)?.label || value;
  };

  const handleGroupSelect = (val: string) => {
    setSelectedGroups(prev =>
      prev.includes(val) ? prev.filter(item => item !== val) : [...prev, val]
    );
  };

  const handleToggleGroupDropdown = () => {
    if (openDropdown === 'group') {
      setOpenDropdown(null);
    } else {
      setOpenDropdown('group');
      setGroupSearchTerm(''); 
    }
  };

  // Lọc danh sách nhóm hiển thị trực tiếp theo từ khóa search nội bộ dropdown
  const filteredGroupOptions = groupOptions.filter(opt =>
    opt.label.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  return (
    <div className="product-group-container">
      {/* HEADER PAGE */}
      <div className="content-wrapper">
        <h2 className="page-title">Quản lý danh sách tiêu chí</h2>
        <button className="btn-add-new" onClick={() => navigate('/criteria-management/add')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M6.66927 0.834961V12.5016M0.835938 6.66829H12.5026" stroke="#FDFCFD" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Thêm mới</span>
        </button>
      </div>

      {/* FILTER SECTION */}
      <div className="filter-section">
        {/* Ô tìm kiếm từ khóa */}
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

            {/* Dropdown Nhóm sản phẩm */}
            <div className="dropdown-wrapper" ref={groupRef}>
              <button className="btn-dropdown" onClick={handleToggleGroupDropdown}>
                <span>Nhóm sản phẩm</span>
                <svg className={`chevron-icon ${openDropdown === 'group' ? 'rotate' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              
              {openDropdown === 'group' && (
                <div className="dropdown-menu">
                  <div className="dropdown-search-box">
                    <input
                      type="text"
                      placeholder="Tìm nhóm sản phẩm..."
                      className="dropdown-search-input"
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="dropdown-scroll-items">
                    {groupOptions.length === 0 ? (
                      <div className="menu-item disabled">Đang tải dữ liệu...</div>
                    ) : filteredGroupOptions.length === 0 ? (
                      <div className="menu-item disabled">Không tìm thấy kết quả</div>
                    ) : (
                      filteredGroupOptions.map(opt => (
                        <div key={opt.value} className={`menu-item ${selectedGroups.includes(opt.value) ? 'selected' : ''}`}
                          onClick={() => handleGroupSelect(opt.value)}>
                          <span>{opt.label}</span>
                          {selectedGroups.includes(opt.value) && <i className="check-icon">✔</i>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Thanh hiển thị danh sách các Tags bộ lọc hiện tại */}
          <div className="selected-filters-row">
            {selectedStatus && (
              <FilterTag 
                label={getLabel(STATUS_OPTIONS, selectedStatus)} 
                onRemove={() => setSelectedStatus(null)} 
              />
            )}
            {selectedGroups.map(groupVal => (
              <FilterTag 
                key={groupVal} 
                label={getLabel(groupOptions, groupVal)} 
                onRemove={() => handleGroupSelect(groupVal)} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* BẢNG DỮ LIỆU */}
      <div className="table-placeholder">
        {loading ? (
          <div className="loading-spinner">Đang tải dữ liệu...</div>
        ) : data.length > 0 ? (
          <ProductCriteriaTable data={data} />
        ) : (
          <div className="empty-state">Không tìm thấy kết quả phù hợp.</div>
        )}
      </div>
    </div>
  );
};

export default ProductCriteriaPage;