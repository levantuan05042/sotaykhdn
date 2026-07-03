import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProductGroupPage.css';
import ProductGroupTable from '../components/ProductGroupTable';
import { API_ENDPOINTS } from '../config/apiConfig'; // <-- IMPORT FILE CẤU HÌNH TẬP TRUNG

// --- MAPPING DATA ---
const STATUS_OPTIONS = [
  { label: 'Đang hoạt động', value: 'ACTIVE' },
  { label: 'Lưu nháp', value: 'DRAFT' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
  { label: 'Từ chối', value: 'REJECTED' },
  { label: 'Lưu trữ', value: 'ARCHIVED' }
];

const GROUP_OPTIONS = [
  { label: 'Sản phẩm dịch vụ', value: 'SERVICE' },
  { label: 'Sản phẩm bảo hiểm', value: 'INSURANCE' },
  { label: 'Chương trình ưu đãi', value: 'PROGRAM' }
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

const ProductGroupPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0); // Spring Page bắt đầu từ 0
  const [totalPages, setTotalPages] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const statusRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Thay thế endpoint cứng bằng API_ENDPOINTS.PRODUCT_GROUPS.LIST
      const response = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
        params: {
          keyword: searchTerm.trim() || undefined,
          status: selectedStatus || undefined,
          types: selectedGroups.length > 0 ? selectedGroups : undefined,
          page: currentPage,
          size: 10
        },
        paramsSerializer: (params) => {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(v => searchParams.append(key, v));
            } else if (value !== undefined) {
              searchParams.append(key, String(value));
            }
          });
          return searchParams.toString();
        }
      });
      
      // Giả sử API trả về { content: [], totalPages: 10 }
      setData(response.data.content || response.data); 
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Lỗi khi gọi API:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedStatus, selectedGroups, currentPage]);

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

  const getLabel = (options: { label: string; value: string }[], value: string) => {
    return options.find(opt => opt.value === value)?.label || value;
  };

  const handleGroupSelect = (val: string) => {
    setSelectedGroups(prev =>
      prev.includes(val) ? prev.filter(item => item !== val) : [...prev, val]
    );
    setCurrentPage(0);
  };

  return (
    <div className="product-group-container">
      <div className="content-wrapper">
        <h2 className="page-title">Quản lý nhóm sản phẩm</h2>
        <button className="btn-add-new" onClick={() => navigate('/product-groups/add')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M6.66927 0.834961V12.5016M0.835938 6.66829H12.5026" stroke="#FDFCFD" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Thêm mới</span>
        </button>
      </div>

      <div className="filter-section">
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
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
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
                      onClick={() => { setSelectedStatus(opt.value); setOpenDropdown(null); setCurrentPage(0); }}>
                      <span>{opt.label}</span>
                      {selectedStatus === opt.value && <i className="check-icon">✔</i>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dropdown Nhóm sản phẩm */}
            <div className="dropdown-wrapper" ref={groupRef}>
              <button className="btn-dropdown" onClick={() => setOpenDropdown(openDropdown === 'group' ? null : 'group')}>
                <span>Nhóm sản phẩm</span>
                <svg className={`chevron-icon ${openDropdown === 'group' ? 'rotate' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openDropdown === 'group' && (
                <div className="dropdown-menu">
                  {GROUP_OPTIONS.map(opt => (
                    <div key={opt.value} className={`menu-item ${selectedGroups.includes(opt.value) ? 'selected' : ''}`}
                      onClick={() => handleGroupSelect(opt.value)}>
                      <span>{opt.label}</span>
                      {selectedGroups.includes(opt.value) && <i className="check-icon">✔</i>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="selected-filters-row">
            {selectedStatus && <FilterTag label={getLabel(STATUS_OPTIONS, selectedStatus)} onRemove={() => setSelectedStatus(null)} />}
            {selectedGroups.map(groupVal => (
              <FilterTag key={groupVal} label={getLabel(GROUP_OPTIONS, groupVal)} onRemove={() => handleGroupSelect(groupVal)} />
            ))}
          </div>
        </div>
      </div>

      <div className="table-placeholder">
        {loading ? (
          <div className="loading-spinner">Đang tải dữ liệu...</div>
        ) : data.length > 0 ? (
          <ProductGroupTable data={data} />
        ) : (
          <div className="empty-state">Không tìm thấy kết quả phù hợp.</div>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <button 
            className="p-2 disabled:opacity-30" 
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M15.8333 10H4.16667M4.16667 10L10 15.8333M4.16667 10L10 4.16667" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i} 
              onClick={() => setCurrentPage(i)}
              className={`pagination-btn ${currentPage === i ? 'active' : ''}`}
            >
              {i + 1}
            </button>
          ))}

          <button 
            className="p-2 disabled:opacity-30" 
            disabled={currentPage === totalPages - 1}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M4.16667 10H15.8333M15.8333 10L10 4.16667M15.8333 10L10 15.8333" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductGroupPage;