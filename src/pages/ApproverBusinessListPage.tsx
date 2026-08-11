import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchInput from '../components/ui/SearchInput';
import FilterDropdown, { type FilterOption } from '../components/ui/FilterDropdown';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { API_ENDPOINTS } from '../config/apiConfig';
import { formatApprovedBy } from '../utils/formatUtils';
import './ApproverBusinessListPage.css';

interface BusinessItem {
  id: string;
  name: string;
  groupName: string;
  groupId: string;
  categoryName: string;
  status: string;
  active: boolean;
  createdBy: string;
  approvedBy: string;
  version: number;
}

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Lưu nháp', value: 'DRAFT' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Hoàn thành', value: 'ACTIVE' },
  { label: 'Từ chối', value: 'REJECTED' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
];

export const ApproverBusinessListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [productGroups, setProductGroups] = useState<FilterOption[]>([]);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch product groups to fill filter options
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_GROUPS.LIST);
        const options = response.data.map((g: any) => ({
          label: g.name,
          value: g.id,
        }));
        setProductGroups([{ label: 'Tất cả nhóm', value: '' }, ...options]);
      } catch (err) {
        console.error("Error loading product groups for business filter:", err);
      }
    };
    fetchGroups();
  }, []);

  // Fetch list of businesses
  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoading(true);
      try {
        // Fetch all businesses for approval
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_BUSINESS.LIST, {
          params: {
            forApproval: true
          }
        });
        const mapped: BusinessItem[] = response.data.map((item: any) => ({
          id: item.id,
          name: item.name || '---',
          groupName: item.groupName || '---',
          groupId: item.groupId || '',
          categoryName: item.categoryName || '---',
          status: item.status || 'DRAFT',
          active: !!item.active,
          createdBy: item.createdBy || '---',
          approvedBy: item.approvedBy || '---',
          version: item.version || 1,
        }));
        setBusinesses(mapped);
      } catch (error) {
        console.error('Error fetching businesses from backend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, []);
  // Apply filters client-side for immediate responsiveness
  const filteredBusinesses = businesses.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    const matchesGroup = !selectedGroupId || item.groupId === selectedGroupId;
    
    // Khác nháp DRAFT là hiển thị cho người duyệt
    const isNotDraft = item.status !== 'DRAFT';
    
    return matchesSearch && matchesStatus && matchesGroup && isNotDraft;
  }).map((item, index) => ({
    ...item,
    stt: index + 1
  }));

  const columns: Column<BusinessItem & { stt: number }>[] = [
    {
      key: 'stt',
      header: 'STT',
      width: '70px',
      align: 'center',
      render: (row) => row.stt,
    },
    {
      key: 'name',
      header: 'Nghiệp vụ',
      render: (row) => <span className="business-item-title">{row.name}</span>,
    },
    {
      key: 'groupName',
      header: 'Nhóm sản phẩm',
      render: (row) => row.groupName,
    },
    {
      key: 'categoryName',
      header: 'Danh mục sản phẩm',
      render: (row) => row.categoryName,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '180px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'active',
      header: 'Hiệu lực',
      render: (row) => (
        <span className={row.active ? 'status-active-text' : 'status-inactive-text'}>
          {row.active ? 'Đang hiển thị' : 'Ẩn'}
        </span>
      ),
    },
    {
      key: 'createdBy',
      header: 'Người tạo',
      render: (row) => row.createdBy,
    },
    {
      key: 'approvedBy',
      header: 'Người phê duyệt',
      render: (row) => formatApprovedBy(row.approvedBy),
    },
    {
      key: 'version',
      header: 'Phiên bản',
      render: (row) => (
        <span style={{ fontWeight: 600, color: '#171717' }}>
          {row.version ? `Phiên bản ${row.version}` : '--'}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      width: '80px',
      align: 'center',
      render: (row) => (
        <button
          className="btn-eye-view-red"
          title="Xem chi tiết"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/approver/business/${row.id}`);
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B42318', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      ),
    },
  ];

  return (
    <div className="product-business-list-page">
      <h1 className="business-page-title">Phê duyệt nghiệp vụ</h1>

      {/* Search & Filters */}
      <div className="filter-card shadow-sm">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Tìm kiếm"
        />

        <div className="filter-row">
          <FilterDropdown
            label="Trạng thái"
            options={STATUS_FILTER_OPTIONS}
            selectedValue={selectedStatus}
            onSelect={setSelectedStatus}
          />

          <FilterDropdown
            label="Nhóm sản phẩm"
            options={productGroups}
            selectedValue={selectedGroupId}
            onSelect={setSelectedGroupId}
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="table-card">
        <DataTable
          columns={columns}
          data={filteredBusinesses as any}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/approver/business/${row.id}`)}
          loading={loading}
          emptyText="Không tìm thấy nghiệp vụ nào phù hợp."
        />
      </div>
    </div>
  );
};

export default ApproverBusinessListPage;
