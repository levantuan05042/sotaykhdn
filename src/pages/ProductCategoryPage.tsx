import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProductCategoryPage.css';
import DataTable, { type Column } from '../components/ui/DataTable2';
import StatusBadge2 from '../components/ui/StatusBadge2';
import { API_ENDPOINTS, BASE_URL } from '../config/apiConfig'; 
import { getUserMap, getFullName } from '../utils/userUtils';

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

const ProductCategoryPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');

  const [warningData, setWarningData] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: '',
    message: ''
  });

  const statusRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT_CATEGORY.LIST, {
        params: {
          keyword: searchTerm.trim() || undefined,
          status: selectedStatus || undefined,
          types: selectedGroups.length > 0 ? selectedGroups : undefined, 
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
      
      const resultData = response.data?.content || response.data;
      const rawList = Array.isArray(resultData) ? resultData : [];
      const userMap = getUserMap();

      const enrichedData = rawList.map((item: any) => {
        const creatorCode = item.createdBy || item.createdByFullName; 
        const approverCode = item.approvedBy;
        return {
          ...item,
          createdByFullName: getFullName(creatorCode, userMap) || '---',
          approvedBy: getFullName(approverCode, userMap) || '---' 
        };
      });

      setData(enrichedData);
    } catch (error) {
      console.error('Lỗi khi gọi API danh sách danh mục sản phẩm:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => fetchData(), 500);
    return () => clearTimeout(handler);
  }, [searchTerm, selectedStatus, selectedGroups]);

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

  const handleToggleActive = async (item: any, currentActive: boolean) => {
    const newActiveStatus = !currentActive;
    setData(prevData => prevData.map(d => d.id === item.id ? { ...d, active: newActiveStatus } : d));

    try {
      const response = await fetch(`${BASE_URL}/product-category/${item.id}/active?active=${newActiveStatus}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Không thể thay đổi trạng thái');
    } catch (error) {
      console.error("Lỗi cập nhật hiệu lực danh mục:", error);
      setData(prevData => prevData.map(d => d.id === item.id ? { ...d, active: currentActive } : d));
      setWarningData({
        show: true,
        title: `Không thể ẩn danh mục: "${item.name}"`,
        message: "Danh mục sản phẩm này đang chứa các sản phẩm nghiệp vụ bên trong."
      });
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
    { key: 'stt', header: 'STT', width: '70px', align: 'center', render: (_, index) => index + 1 },
    { key: 'name', header: 'Tên danh mục sản phẩm', render: (row) => <span className="truncate-text" title={row.name}>{row.name}</span> },
    { key: 'groupName', header: 'Nhóm sản phẩm', render: (row) => <span className="truncate-text" title={row.groupName}>{row.groupName || '---'}</span> },
    { key: 'status', header: 'Trạng thái', width: '180px', render: (row) => <StatusBadge2 status={row.status} /> },
    { key: 'active', header: 'Hiệu lực', render: (row) => renderActiveToggle(row) },
    { key: 'createdByFullName', header: 'Người tạo', render: (row) => row.createdByFullName || '---' },
    { key: 'approvedBy', header: 'Người kiểm duyệt', render: (row) => row.approvedBy || '---' },
    { key: 'version', header: 'Phiên bản', render: (row) => <span style={{ fontWeight: 600, color: '#053E2B' }}>{row.version ? `Phiên bản ${row.version}` : '---'}</span> },
    {
      key: 'action',
      header: '',
      width: '80px',
      align: 'center',
      render: (row) => (
        <button
          className="btn-view-detail"
          title="Xem chi tiết"
          onClick={(e) => { e.stopPropagation(); navigate(`/product-category/${row.id}`); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
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

      <div className="filter-section">
        <div className="dropdown-group-container">
          <div className="dropdown-row">
            <div className="dropdown-wrapper" ref={statusRef}>
              <button className="btn-dropdown" onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}>
                <span>Trạng thái</span>
                <svg className={`chevron-icon ${openDropdown === 'status' ? 'rotate' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {openDropdown === 'status' && (
                <div className="dropdown-menu">
                  {STATUS_OPTIONS.map(opt => (
                    <div key={opt.value} className={`menu-item ${selectedStatus === opt.value ? 'selected' : ''}`} onClick={() => { setSelectedStatus(opt.value); setOpenDropdown(null); }}>
                      <span>{opt.label}</span>{selectedStatus === opt.value && <i className="check-icon">✔</i>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dropdown-wrapper" ref={groupRef}>
              <button className="btn-dropdown" onClick={() => { setOpenDropdown(openDropdown === 'group' ? null : 'group'); setGroupSearchTerm(''); }}>
                <span>Nhóm sản phẩm</span>
                <svg className={`chevron-icon ${openDropdown === 'group' ? 'rotate' : ''}`} width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="#737373" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {openDropdown === 'group' && (
                <div className="dropdown-menu">
                  <div className="dropdown-search-box">
                    <input type="text" placeholder="Tìm nhóm sản phẩm..." className="dropdown-search-input" value={groupSearchTerm} onChange={(e) => setGroupSearchTerm(e.target.value)} autoFocus />
                  </div>
                  <div className="dropdown-scroll-items">
                    {groupOptions.filter(opt => opt.label.toLowerCase().includes(groupSearchTerm.toLowerCase())).map(opt => (
                      <div key={opt.value} className={`menu-item ${selectedGroups.includes(opt.value) ? 'selected' : ''}`} onClick={() => handleGroupSelect(opt.value)}>
                        <span>{opt.label}</span>{selectedGroups.includes(opt.value) && <i className="check-icon">✔</i>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="selected-filters-row">
            {selectedStatus && <FilterTag label={getLabel(STATUS_OPTIONS, selectedStatus)} onRemove={() => setSelectedStatus(null)} />}
            {selectedGroups.map(groupVal => <FilterTag key={groupVal} label={getLabel(groupOptions, groupVal)} onRemove={() => handleGroupSelect(groupVal)} />)}
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
          data={data}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/product-category/${row.id}`)}
          loading={loading}
          emptyText="Không tìm thấy danh mục sản phẩm nào phù hợp."
        />
      </div>

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