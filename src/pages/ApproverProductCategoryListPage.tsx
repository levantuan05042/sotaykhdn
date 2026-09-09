import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchInput from '../components/ui/SearchInput';
import FilterDropdown, { FilterTag, ClearFilterButton, type FilterOption } from '../components/ui/FilterDropdown';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import BatchApprovalModal from '../components/ui/BatchApprovalModal';
import { API_ENDPOINTS } from '../config/apiConfig';
import { formatApprovedBy } from '../utils/formatUtils';
import './ApproverProductCategoryListPage.css';

interface ProductCategoryItem {
  id: string;
  name: string;
  groupName: string;
  status: string;
  createdBy: string;
  approvedBy: string;
  active?: boolean;
  version?: number;
}

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Đang hoạt động', value: 'ACTIVE' },
  { label: 'Từ chối', value: 'REJECTED' },
];

export const ApproverProductCategoryListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [productGroups, setProductGroups] = useState<FilterOption[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Batch Approval States
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'APPROVE' | 'REJECT' | null;
  }>({ isOpen: false, type: null });
  const [processing, setProcessing] = useState(false);

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
        console.error("Error loading product groups for category filter:", err);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_CATEGORY.LIST, {
          params: {
            keyword: searchTerm || undefined,
            status: selectedStatuses.length === 1 ? selectedStatuses[0] : undefined,
            types: selectedGroupIds.length ? selectedGroupIds : undefined,
            forApproval: true,
          },
          paramsSerializer: { indexes: null },
        });

        let mapped: ProductCategoryItem[] = response.data.map((item: any, index: number) => {
          return {
            id: item.id,
            stt: index + 1,
            name: item.name || '---',
            groupName: item.groupName || '---',
            status: item.status || 'DRAFT',
            createdBy: item.createdByFullName || item.createdBy || '---',
            approvedBy: item.approvedByFullName || item.approvedBy || '---',
            active: item.active === true,
            version: item.version,
          };
        });

        if (selectedStatuses.length > 1) {
          mapped = mapped.filter((item) => selectedStatuses.includes(item.status));
        }

        setCategories(mapped);
      } catch (error) {
        console.error('Error fetching categories from backend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [searchTerm, selectedStatuses, selectedGroupIds]);

  const handleBatchConfirm = async (reason?: string) => {
    if (!modalState.type || selectedKeys.length === 0) return;
    setProcessing(true);
    try {
      const newStatus = modalState.type === 'APPROVE' ? 'ACTIVE' : 'REJECTED';
      await Promise.all(
        selectedKeys.map((id) =>
          axios.post(API_ENDPOINTS.APPROVER.PRODUCT_CATEGORY.REVIEW(id), {
            status: newStatus,
            comment: reason || '',
          })
        )
      );

      // Optimistic update
      setCategories((prev) =>
        prev.map((item) =>
          selectedKeys.includes(item.id) ? { ...item, status: newStatus } : item
        )
      );

      setSelectedKeys([]);
      setModalState({ isOpen: false, type: null });
    } catch (error) {
      console.error('Batch action error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    selectedStatuses.length > 0 ||
    selectedGroupIds.length > 0
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedStatuses([]);
    setSelectedGroupIds([]);
    setSelectedKeys([]);
  };

  const columns: Column<ProductCategoryItem & { stt: number }>[] = [
    {
      key: 'stt',
      header: 'STT',
      width: '70px',
      align: 'center',
      render: (row) => row.stt,
    },
    {
      key: 'name',
      header: 'Danh mục sản phẩm',
      render: (row) => <span className="category-item-title">{row.name}</span>,
    },
    {
      key: 'groupName',
      header: 'Nhóm sản phẩm',
      render: (row) => row.groupName,
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
        <span style={{ color: row.active ? '#065F46' : '#6B7280', fontWeight: 600 }}>
          {row.active ? 'Đang hiển thị' : 'Đang ẩn'}
        </span>
      ),
    },
    {
      key: 'createdBy',
      header: 'Người tạo',
      render: (row) => formatApprovedBy(row.createdBy),
    },
    {
      key: 'approvedBy',
      header: 'Người Phê duyệt',
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
            navigate(`/approver/product-category/${row.id}`);
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
    <div className="product-category-list-page">
      <h1 className="category-page-title">Phê duyệt danh mục sản phẩm</h1>

      {/* Khối tìm kiếm & Bộ lọc */}
      <div className="filter-card shadow-sm">
        <div className="dropdown-group-container">
          <div className="dropdown-row">
            <FilterDropdown
              label="Trạng thái"
              options={STATUS_FILTER_OPTIONS}
              multiple
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
            />

            <FilterDropdown
              label="Nhóm sản phẩm"
              options={productGroups}
              multiple
              selectedValues={selectedGroupIds}
              onChange={setSelectedGroupIds}
            />

            <ClearFilterButton
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            />
          </div>

          {(selectedStatuses.length > 0 || selectedGroupIds.length > 0) && (
            <div className="selected-filters-row">
              {selectedStatuses.map((val) => {
                const opt = STATUS_FILTER_OPTIONS.find((o) => o.value === val);
                return (
                  <FilterTag
                    key={val}
                    label={opt ? opt.label : val}
                    onRemove={() => setSelectedStatuses(selectedStatuses.filter((s) => s !== val))}
                  />
                );
              })}
              {selectedGroupIds.map((val) => {
                const opt = productGroups.find((o) => o.value === val);
                return (
                  <FilterTag
                    key={val}
                    label={opt ? opt.label : val}
                    onRemove={() => setSelectedGroupIds(selectedGroupIds.filter((id) => id !== val))}
                  />
                );
              })}
              <button
                type="button"
                className="btn-clear-tags-text"
                onClick={handleClearFilters}
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        <div className="filter-row-right">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm kiếm"
          />
        </div>
      </div>

      {/* Bảng danh sách dữ liệu */}
      <div className="table-card">
        <DataTable
          columns={columns}
          data={categories as any}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/approver/product-category/${row.id}`)}
          loading={loading}
          emptyText="Không tìm thấy danh mục sản phẩm nào phù hợp."
          selectable={true}
          selectedKeys={selectedKeys}
          onSelectionChange={(keys) => setSelectedKeys(keys)}
          isRowSelectable={(row) => row.status === 'PENDING_APPROVAL'}
          onApproveAll={() => setModalState({ isOpen: true, type: 'APPROVE' })}
          onRejectAll={() => setModalState({ isOpen: true, type: 'REJECT' })}
        />
      </div>

      {/* Modal xác nhận phê duyệt / từ chối hàng loạt */}
      <BatchApprovalModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        selectedCount={selectedKeys.length}
        onClose={() => setModalState({ isOpen: false, type: null })}
        onConfirm={handleBatchConfirm}
        loading={processing}
      />
    </div>
  );
};

export default ApproverProductCategoryListPage;
