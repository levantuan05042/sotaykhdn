import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchInput from '../components/ui/SearchInput';
import FilterDropdown, { type FilterOption } from '../components/ui/FilterDropdown';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { API_ENDPOINTS } from '../config/apiConfig';
import { formatApprovedBy } from '../utils/formatUtils';
import './ApproverProductGroupListPage.css';

interface ProductGroupItem {
  id: string;
  name: string;
  status: string;
  createdBy: string;
  approvedBy: string;
}

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Lưu nháp', value: 'DRAFT' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Hoàn thành', value: 'ACTIVE' },
  { label: 'Từ chối', value: 'REJECTED' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
];

const SUPER_GROUP_FILTER_OPTIONS: FilterOption[] = [
  { label: 'Tất cả nhóm', value: '' },
  { label: 'Chương trình dịch vụ', value: 'SERVICE' },
  { label: 'Bảo hiểm', value: 'INSURANCE' },
  { label: 'Chương trình ưu đãi', value: 'PROGRAM' },
];

export const ApproverProductGroupListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedGroupType, setSelectedGroupType] = useState<string | null>(null);
  const [productGroups, setProductGroups] = useState<ProductGroupItem[]>([]);
  const [loading, setLoading] = useState(false);



  useEffect(() => {
    const fetchProductGroups = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
          params: {
            keyword: searchTerm || undefined,
            status: selectedStatus || undefined,
            types: selectedGroupType || undefined,
            forApproval: true,
          },
        });

        const mapped: ProductGroupItem[] = response.data.map((item: any, index: number) => {
          return {
            id: item.id,
            stt: index + 1,
            name: item.name || '---',
            status: item.status || 'DRAFT',
            createdBy: item.createdBy || '---',
            approvedBy: item.approvedBy || '---',
          };
        });

        setProductGroups(mapped);
      } catch (error) {
        console.error('Error fetching product groups from backend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductGroups();
  }, [searchTerm, selectedStatus, selectedGroupType]);

  const columns: Column<ProductGroupItem & { stt: number }>[] = [
    {
      key: 'stt',
      header: 'STT',
      width: '70px',
      align: 'center',
      render: (row) => row.stt,
    },
    {
      key: 'name',
      header: 'Tên nhóm sản phẩm',
      render: (row) => <span className="product-group-item-title">{row.name}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '180px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdBy',
      header: 'Người tạo',
      render: (row) => row.createdBy,
    },
    {
      key: 'approvedBy',
      header: 'Người kiểm duyệt',
      render: (row) => formatApprovedBy(row.approvedBy),
    },
    {
      key: 'action',
      header: '',
      width: '80px',
      align: 'center',
      render: (row) => (
        <button
          className="btn-eye-view-green"
          title="Xem chi tiết"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/approver/product-groups/${row.id}`);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      ),
    },
  ];

  return (
    <div className="product-group-list-page">
      <h1 className="product-group-page-title">Phê duyệt nhóm sản phẩm</h1>

      {/* Khối tìm kiếm & Bộ lọc */}
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
            options={SUPER_GROUP_FILTER_OPTIONS}
            selectedValue={selectedGroupType}
            onSelect={setSelectedGroupType}
          />
        </div>
      </div>

      {/* Bảng danh sách dữ liệu */}
      <div className="table-card">
        <DataTable
          columns={columns}
          data={productGroups as any}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/approver/product-groups/${row.id}`)}
          emptyText={loading ? "Đang tải dữ liệu..." : "Không tìm thấy nhóm sản phẩm nào phù hợp."}
        />
      </div>
    </div>
  );
};

export default ApproverProductGroupListPage;
