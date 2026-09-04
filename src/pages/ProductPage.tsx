import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './ProductPage.css';
import DataTable, { type Column } from '../components/ui/DataTable2';
import StatusBadge2 from '../components/ui/StatusBadge2';
import ImportProductModal from '../components/ImportProductModal';
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

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [groupOptions, setGroupOptions] = useState<GroupOption[]>([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const statusRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const headerListMenuRef = useRef<HTMLDivElement>(null);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCT.LIST, {
        params: {
          keyword: searchTerm.trim() || undefined,
          status: selectedStatus || undefined,
          types: selectedGroups.length > 0 ? selectedGroups : undefined,
        },
        paramsSerializer: (params) => {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach((v) => searchParams.append(key, v));
            } else if (value !== undefined) {
              searchParams.append(key, String(value));
            }
          });
          return searchParams.toString();
        },
      });

      const resultData = response.data?.content || response.data;
      const rawList = Array.isArray(resultData) ? resultData : [];
      const userMap = getUserMap();

      const enrichedData = rawList.map((item: any) => ({
        ...item,
        createdByFullName: getFullName(item.createdBy, userMap) || null,
        approvedBy: getFullName(item.approvedBy, userMap) || null 
      }));

      setData(enrichedData);
    } catch (error) {
      console.error(error);
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
      if (
        statusRef.current && !statusRef.current.contains(event.target as Node) &&
        groupRef.current && !groupRef.current.contains(event.target as Node) &&
        headerListMenuRef.current && !headerListMenuRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImportSuccess = () => {
    fetchData();
    setToast({ type: 'success', message: 'Nhập sản phẩm từ Excel thành công.' });
    navigate('/request-list');
  };

  const getLabel = (options: any[], value: string) =>
    options.find((opt) => opt.value === value)?.label || value;

  const handleGroupSelect = (val: string) => {
    setSelectedGroups((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
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

  const filteredGroupOptions = groupOptions.filter((opt) =>
    opt.label.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  const handleToggleActive = async (item: any, currentActive: boolean) => {
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
    } catch (error) {
      setData(prevData =>
        prevData.map(d => d.id === item.id ? { ...d, active: currentActive } : d)
      );
      alert('Không thể cập nhật trạng thái hiệu lực. Vui lòng thử lại!');
    }
  };

  const renderActiveToggle = (item: any) => {
    const isActive = item.active || false;
    return (
      <div className="toggle-wrapper" onClick={(e) => e.stopPropagation()}>
        <label className="toggle-switch">
          <input 
            type="checkbox" 
            checked={isActive} 
            onChange={() => handleToggleActive(item, isActive)}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className="toggle-label">
          {isActive ? 'Hiện' : 'Ẩn'}
        </span>
      </div>
    );
  };

  const getFilteredData = () => {
    if (isProcessingPage) {
      const allowedStatuses = ['DRAFT', 'PENDING_APPROVAL'];
      return data.filter(item => allowedStatuses.includes(item.status?.toUpperCase()));
    }
    if (isRejectedPage) {
      return data.filter(item => item.status?.toUpperCase() === 'REJECTED');
    }
    return data.filter(item => item.status?.toUpperCase() === 'ACTIVE');
  };

  const getColumns = (): Column<any>[] => {
    const baseAction: Column<any> = {
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
            navigate(`/products/${row.id}`);
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )
    };

    if (isProcessingPage) {
      return [
        { key: 'stt', header: 'STT', width: '70px', align: 'center', render: (_, index) => index + 1 },
        { key: 'name', header: 'Sản phẩm', render: (row) => <span className="truncate-text" style={{ fontWeight: 500 }} title={stripHtml(row.name)}>{stripHtml(row.name) || '---'}</span> },
        { key: 'productGroupName', header: 'Nhóm sản phẩm', render: (row) => <span className="truncate-text" title={row.productGroupName}>{row.productGroupName || '---'}</span> },
        { key: 'status', header: 'Trạng thái', width: '180px', render: (row) => <StatusBadge2 status={row.status} /> },
        { key: 'requestName', header: 'Tên yêu cầu', render: (row) => (
          <span 
            className="truncate-text" 
            title={stripHtml(row.requestName)}
            onClick={(e) => {
              if (row.requestId) {
                e.stopPropagation();
                navigate(`/products/batch/${row.requestId}`);
              }
            }}
            style={{ cursor: row.requestId ? 'pointer' : 'default', color: row.requestId ? '#2563EB' : 'inherit', textDecoration: row.requestId ? 'underline' : 'none' }}
          >
            {stripHtml(row.requestName) || '---'}
          </span>
        )},
        { key: 'notes', header: 'Ghi chú', render: (row) => <span className="truncate-text" title={row.notes}>{row.notes || '---'}</span> },
        { key: 'createdAt', header: 'Ngày tạo', render: (row) => formatDate(row.createdAt) },
        { key: 'createdByFullName', header: 'Người tạo', render: (row) => row.createdByFullName || '---' },
        { key: 'approvedBy', header: 'Người kiểm duyệt', render: (row) => row.approvedBy || '---' },
        { key: 'version', header: 'Phiên bản', render: (row) => <span style={{ fontWeight: 600, color: '#053E2B' }}>{row.version ? `Phiên bản ${row.version}` : '---'}</span> },
        baseAction
      ];
    }

    if (isRejectedPage) {
      return [
        { key: 'stt', header: 'STT', width: '70px', align: 'center', render: (_, index) => index + 1 },
        { key: 'name', header: 'Sản phẩm', render: (row) => <span className="truncate-text" style={{ fontWeight: 500 }} title={stripHtml(row.name)}>{stripHtml(row.name) || '---'}</span> },
        { key: 'productGroupName', header: 'Nhóm sản phẩm', render: (row) => <span className="truncate-text" title={row.productGroupName}>{row.productGroupName || '---'}</span> },
        { key: 'productCategoryName', header: 'Danh mục sản phẩm', render: (row) => <span className="truncate-text" title={row.productCategoryName}>{row.productCategoryName || '---'}</span> },
        { key: 'businessName', header: 'Nghiệp vụ', render: (row) => <span className="truncate-text" title={row.businessName}>{row.businessName || '---'}</span> },
        { key: 'status', header: 'Trạng thái', width: '180px', render: (row) => <StatusBadge2 status={row.status} /> },
        { key: 'active', header: 'Hiệu lực', render: (row) => row.active ? <span style={{color: '#14532D', fontWeight: 600}}>Đang hiển thị</span> : <span style={{color: '#EF4444', fontWeight: 600}}>Đã ẩn</span> },
        { key: 'createdByFullName', header: 'Người tạo', render: (row) => row.createdByFullName || '---' },
        { key: 'approvedBy', header: 'Người kiểm duyệt', render: (row) => row.approvedBy || '---' },
        { key: 'version', header: 'Phiên bản', render: (row) => <span style={{ fontWeight: 600, color: '#053E2B' }}>{row.version ? `Phiên bản ${row.version}` : '---'}</span> },
        baseAction
      ];
    }

    return [
      { key: 'stt', header: 'STT', width: '70px', align: 'center', render: (_, index) => index + 1 },
      { key: 'name', header: 'Sản phẩm', render: (row) => <span className="truncate-text" style={{ fontWeight: 500 }} title={stripHtml(row.name)}>{stripHtml(row.name) || '---'}</span> },
      { key: 'productGroupName', header: 'Nhóm sản phẩm', render: (row) => <span className="truncate-text" title={row.productGroupName}>{row.productGroupName || '---'}</span> },
      { key: 'productCategoryName', header: 'Danh mục sản phẩm', render: (row) => <span className="truncate-text" title={row.productCategoryName}>{row.productCategoryName || '---'}</span> },
      { key: 'businessName', header: 'Nghiệp vụ', render: (row) => <span className="truncate-text" title={row.businessName}>{row.businessName || '---'}</span> },
      { key: 'status', header: 'Trạng thái', width: '180px', render: (row) => <StatusBadge2 status={row.status} /> },
      { key: 'active', header: 'Hiệu lực', render: (row) => renderActiveToggle(row) },
      { key: 'createdByFullName', header: 'Người tạo', render: (row) => row.createdByFullName || '---' },
      { key: 'approvedBy', header: 'Người kiểm duyệt', render: (row) => row.approvedBy || '---' },
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
                  {STATUS_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      className={`menu-item ${selectedStatus === opt.value ? 'selected' : ''}`}
                      onClick={() => { setSelectedStatus(opt.value); setOpenDropdown(null); }}
                    >
                      <span>{opt.label}</span>
                      {selectedStatus === opt.value && <i className="check-icon">✔</i>}
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                      className="dropdown-search-input"
                      placeholder="Tìm nhóm sản phẩm..."
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="dropdown-scroll-items">
                    {filteredGroupOptions.length > 0 ? (
                      filteredGroupOptions.map(opt => (
                        <div 
                          key={opt.value} 
                          className={`menu-item ${selectedGroups.includes(opt.value) ? 'selected' : ''}`}
                          onClick={() => handleGroupSelect(opt.value)}
                        >
                          <span>{opt.label}</span>
                          {selectedGroups.includes(opt.value) && <i className="check-icon">✔</i>}
                        </div>
                      ))
                    ) : (
                      <div className="menu-item disabled">Không tìm thấy nhóm nào</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="selected-filters-row">
            {selectedStatus && <FilterTag label={getLabel(STATUS_OPTIONS, selectedStatus)} onRemove={() => setSelectedStatus(null)} />}
            {selectedGroups.map(groupVal => (
              <FilterTag key={groupVal} label={getLabel(groupOptions, groupVal)} onRemove={() => handleGroupSelect(groupVal)} />
            ))}
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
          columns={getColumns()}
          data={getFilteredData()}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/products/${row.id}`)}
          loading={loading}
          emptyText="Không tìm thấy sản phẩm nào phù hợp."
        />
      </div>
    </div>
  );
};

export default ProductPage;