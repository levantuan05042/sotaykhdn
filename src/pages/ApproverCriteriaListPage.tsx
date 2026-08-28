import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchInput from '../components/ui/SearchInput';
import FilterDropdown, { type FilterOption } from '../components/ui/FilterDropdown';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { API_ENDPOINTS } from '../config/apiConfig';
import { formatApprovedBy } from '../utils/formatUtils';
import './ApproverCriteriaListPage.css';

interface CriteriaItem {
  id: string;
  code: string;
  name: string;
  groupName: string;
  categoryName: string;
  businessName: string;
  status: string;
  active: boolean;
  createdBy: string;
  approvedBy: string;
  version: number;
}

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Hoàn thành', value: 'ACTIVE' },
  { label: 'Từ chối', value: 'REJECTED' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
];

export const ApproverCriteriaListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [productGroups, setProductGroups] = useState<FilterOption[]>([]);
  const [criteriaList, setCriteriaList] = useState<CriteriaItem[]>([]);
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
        console.error("Error loading product groups for criteria filter:", err);
      }
    };
    fetchGroups();
  }, []);

  // Fetch list of criteria
  useEffect(() => {
    const fetchCriteria = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_CRITERIA.LIST, {
          params: {
            forApproval: true
          }
        });
        const mapped: CriteriaItem[] = response.data.map((item: any) => ({
          id: item.id,
          code: item.code || '---',
          name: item.name || '---',
          groupName: item.groupName || '---',
          categoryName: item.categoryName || '---',
          businessName: item.businessName || '---',
          status: item.status || 'DRAFT',
          active: !!item.active,
          createdBy: item.createdBy || '---',
          approvedBy: item.approvedBy || '---',
          version: item.version || 1,
        }));
        setCriteriaList(mapped);
      } catch (error) {
        console.error('Error fetching criteria from backend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCriteria();
  }, []);

  const filteredCriteria = criteriaList.filter((item) => {
    if (item.status === 'ARCHIVED') return false;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !selectedStatus ? true : item.status === selectedStatus;
    const matchesGroup = !selectedGroupId ? true : true;
    return matchesSearch && matchesStatus && matchesGroup;
  }).map((item, index) => ({
    ...item,
    stt: index + 1
  }));

  const columns: Column<CriteriaItem & { stt: number }>[] = [
    {
      key: 'stt',
      header: 'STT',
      render: (row) => row.stt,
      width: '60px',
    },
    {
      key: 'code',
      header: 'Mã tiêu chí',
      render: (row) => <span className="text-bold">{row.code}</span>,
    },
    {
      key: 'name',
      header: 'Tên tiêu chí',
      render: (row) => row.name,
    },
    // {
    //   key: 'businessName',
    //   header: 'Nghiệp vụ sản phẩm',
    //   render: (row) => row.businessName,
    // },
    // {
    //   key: 'categoryName',
    //   header: 'Danh mục sản phẩm',
    //   render: (row) => row.categoryName,
    // },
    {
      key: 'groupName',
      header: 'Nhóm sản phẩm',
      render: (row) => row.groupName,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status} />,
      width: '150px',
    },
    {
      key: 'active',
      header: 'Hiệu lực',
      render: (row) => {
        const isActive = !!row.active;
        return (
          <div className="toggle-wrapper" onClick={(e) => e.stopPropagation()}>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isActive} 
                disabled
              />
              <span className="toggle-slider"></span>
            </label>
            <span className="toggle-label" style={{ color: isActive ? '#171717' : '#9CA3AF' }}>
              {isActive ? 'Hiện' : 'Ẩn'}
            </span>
          </div>
        );
      },
      width: '140px',
    },
    {
      key: 'createdBy',
      header: 'Người tạo',
      render: (row) => formatApprovedBy(row.createdBy),
    },
    {
      key: 'approvedBy',
      header: 'Người kiểm duyệt',
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
      width: '120px',
    },
    {
      key: 'actions',
      header: '',
      width: '130px',
      align: 'center',
      render: (row) => (
        <button
          className="btn-quick-view-green"
          title="Xem chi tiết"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/approver/criteria/${row.id}`);
          }}
        >
          Xem nhanh &raquo;
        </button>
      ),
    },
  ];

  return (
    <div className="approver-criteria-list-page">
      <div className="page-header-row">
        <h1 className="page-main-title">Phê duyệt tiêu chí</h1>
      </div>

      <div className="filter-card shadow-sm">
        <div className="filter-grid">
          <div className="filter-cell">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Tìm kiếm theo mã, tên tiêu chí..."
            />
          </div>
          <div className="filter-cell">
            <FilterDropdown
              label="Lọc theo trạng thái"
              options={STATUS_FILTER_OPTIONS}
              selectedValue={selectedStatus}
              onSelect={setSelectedStatus}
            />
          </div>
          <div className="filter-cell">
            <FilterDropdown
              label="Lọc theo nhóm sản phẩm"
              options={productGroups}
              selectedValue={selectedGroupId}
              onSelect={setSelectedGroupId}
            />
          </div>
        </div>
      </div>

      <div className="table-card shadow-sm">
        <DataTable
          columns={columns}
          data={filteredCriteria}
          loading={loading}
          onRowClick={(row) => navigate(`/approver/criteria/${row.id}`)}
          emptyText="Không tìm thấy tiêu chí nào cần duyệt"
        />
      </div>
    </div>
  );
};

export default ApproverCriteriaListPage;
