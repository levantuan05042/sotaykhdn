import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchInput from '../components/ui/SearchInput';
import FilterDropdown, { type FilterOption } from '../components/ui/FilterDropdown';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { API_ENDPOINTS } from '../config/apiConfig';
import { formatApprovedBy } from '../utils/formatUtils';
import './ApproverProductSingleListPage.css';

interface ProductItem {
  id: string;
  stt: number;
  name: string;
  createdBy: string;
  approvedBy: string;
  status: string;
  createdAt: string;
}

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Đã duyệt', value: 'ACTIVE' },
  { label: 'Từ chối', value: 'REJECTED' },
];

export const ApproverProductSingleListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productGroups, setProductGroups] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Load product groups for filter
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_GROUPS.LIST);
        const mapped: FilterOption[] = [
          { label: 'Tất cả loại nội dung', value: '' },
          ...response.data.map((g: any) => ({
            label: g.name,
            value: g.id,
          })),
        ];
        setProductGroups(mapped);
      } catch (error) {
        console.error('Error fetching product groups:', error);
      }
    };
    fetchGroups();
  }, []);

  // Load single products for approval
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT.SINGLE_FOR_APPROVAL, {
          params: {
            keyword: searchTerm || undefined,
            status: selectedStatus || undefined,
            types: selectedGroupId || undefined,
          },
        });

        const mapped: ProductItem[] = response.data.map((item: any, index: number) => {
          let formattedDate = '---';
          if (item.createdAt) {
            const d = new Date(item.createdAt);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
          }

          return {
            id: item.id,
            stt: index + 1,
            name: item.name || '---',
            createdBy: item.createdBy || '---',
            approvedBy: item.approvedBy || '---',
            status: item.status || 'DRAFT',
            createdAt: formattedDate,
          };
        });

        setProducts(mapped);
      } catch (error) {
        console.error('Error fetching single products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchTerm, selectedStatus, selectedGroupId]);

  const columns: Column<ProductItem>[] = [
    {
      key: 'stt',
      header: 'STT',
      width: '70px',
      align: 'center',
      render: (row) => row.stt,
    },
    {
      key: 'name',
      header: 'Tên nội dung',
      width: '30%',
      render: (row) => <span className="product-item-title-text">{row.name}</span>,
    },
    {
      key: 'createdBy',
      header: 'Người tạo',
      // width: '180px',
      render: (row) => row.createdBy,
    },
    {
      key: 'approvedBy',
      header: 'Người Phê duyệt',
      // width: '180px',
      render: (row) => formatApprovedBy(row.approvedBy),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      // width: '180px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      // width: '130px',
      render: (row) => row.createdAt,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'center',
      render: (row) => (
        <button
          className="btn-eye-view-red"
          title="Xem chi tiết phê duyệt"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/approver/products/single/${row.id}`);
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
    <div className="product-single-list-page">
      <h1 className="single-page-title">Phê duyệt sản phẩm lẻ</h1>

      {/* Filter and Search Section */}
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
            label="Loại nội dung"
            options={productGroups}
            selectedValue={selectedGroupId}
            onSelect={setSelectedGroupId}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="table-card">
        <DataTable
          columns={columns}
          data={products}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/approver/products/single/${row.id}`)}
          emptyText={loading ? "Đang tải dữ liệu..." : "Không tìm thấy sản phẩm lẻ nào phù hợp."}
        />
      </div>
    </div>
  );
};

export default ApproverProductSingleListPage;
