import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProductBusinessPage.css';
// Giả định bạn đã hoặc sẽ tạo component Table riêng cho Sản phẩm nghiệp vụ, hoặc tái sử dụng table cũ
import ProductBusinessTable from '../components/ProductBusinessTable'; 
import { API_ENDPOINTS } from '../config/apiConfig'; 

const STATUS_OPTIONS = [
  { label: 'Đang hoạt động', value: 'ACTIVE' },
  { label: 'Lưu nháp', value: 'DRAFT' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
  { label: 'Từ chối', value: 'REJECTED' },
  { label: 'Lưu trữ', value: 'ARCHIVED' }
];

interface CategoryOption {
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

const ProductBusinessPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  // Lưu danh sách các Danh mục sản phẩm được chọn để lọc cho Sản phẩm nghiệp vụ
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');

  const statusRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  // Gọi API lấy danh sách Danh mục sản phẩm để cho vào bộ lọc Dropdown
  useEffect(() => {
    const fetchCategoryOptions = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCT_CATEGORY.LIST);
        // data backend có thể trả về mảng trực tiếp hoặc bọc trong object có field content
        const rawData = response.data?.content || response.data || [];
        const mappedCategories = rawData
          .filter((item: any) => item.status === 'ACTIVE')
          .map((item: any) => ({
            value: item.id,
            label: item.name
          }));
          
        setCategoryOptions(mappedCategories);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách danh mục sản phẩm:', error);
      }
    };
    fetchCategoryOptions();
  }, []);

  // Gọi API lấy danh sách Sản phẩm nghiệp vụ theo các bộ lọc
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT_BUSINESS.LIST, {
        params: {
          keyword: searchTerm.trim() || undefined,
          status: selectedStatus || undefined,
          // Gửi danh sách ID danh mục lên bản Backend (Ví dụ param: categoryIds)
          categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined, 
        },
        paramsSerializer: (params) => {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              // Biến mảng thành dạng: ?categoryIds=1&categoryIds=2 đúng chuẩn Spring Boot
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
      console.error('Lỗi khi gọi API danh sách sản phẩm nghiệp vụ:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce tìm kiếm 500ms
  useEffect(() => {
    const handler = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedStatus, selectedCategories]);

  // Click outside đóng dropdown menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(event.target as Node) &&
          categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (options: any[], value: string) => {
    return options.find(opt => opt.value === value)?.label || value;
  };

  const handleCategorySelect = (val: string) => {
    setSelectedCategories(prev =>
      prev.includes(val) ? prev.filter(item => item !== val) : [...prev, val]
    );
  };

  const handleToggleCategoryDropdown = () => {
    if (openDropdown === 'category') {
      setOpenDropdown(null);
    } else {
      setOpenDropdown('category');
      setCategorySearchTerm(''); 
    }
  };

  // Tìm kiếm nội bộ danh mục tại ô Search mini trong Dropdown
  const filteredCategoryOptions = categoryOptions.filter(opt =>
    opt.label.toLowerCase().includes(categorySearchTerm.toLowerCase())
  );

  return (
    <div className="product-group-container">
      {/* HEADER PAGE */}
      <div className="content-wrapper">
        <h2 className="page-title">Quản lý sản phẩm nghiệp vụ</h2>
        <button className="btn-add-new" onClick={() => navigate('/business-management/add')}>
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
            placeholder="Tìm kiếm theo mã, tên sản phẩm..." 
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

            {/* Dropdown Danh mục sản phẩm */}
            <div className="dropdown-wrapper" ref={categoryRef}>
              <button className="btn-dropdown" onClick={handleToggleCategoryDropdown}>
                <span>Danh mục sản phẩm</span>
                <svg className={`chevron-icon ${openDropdown === 'category' ? 'rotate' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 7.5L10 12.5L15 7.5" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              
              {openDropdown === 'category' && (
                <div className="dropdown-menu">
                  <div className="dropdown-search-box">
                    <input
                      type="text"
                      placeholder="Tìm danh mục..."
                      className="dropdown-search-input"
                      value={categorySearchTerm}
                      onChange={(e) => setCategorySearchTerm(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="dropdown-scroll-items">
                    {categoryOptions.length === 0 ? (
                      <div className="menu-item disabled">Đang tải dữ liệu...</div>
                    ) : filteredCategoryOptions.length === 0 ? (
                      <div className="menu-item disabled">Không tìm thấy kết quả</div>
                    ) : (
                      filteredCategoryOptions.map(opt => (
                        <div key={opt.value} className={`menu-item ${selectedCategories.includes(opt.value) ? 'selected' : ''}`}
                          onClick={() => handleCategorySelect(opt.value)}>
                          <span>{opt.label}</span>
                          {selectedCategories.includes(opt.value) && <i className="check-icon">✔</i>}
                        </div>
                      ))
                    )}
                  </div>
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
            {selectedCategories.map(catVal => (
              <FilterTag 
                key={catVal} 
                label={getLabel(categoryOptions, catVal)} 
                onRemove={() => handleCategorySelect(catVal)} 
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
          <ProductBusinessTable data={data} />
        ) : (
          <div className="empty-state">Không tìm thấy kết quả phù hợp.</div>
        )}
      </div>
    </div>
  );
};

export default ProductBusinessPage;