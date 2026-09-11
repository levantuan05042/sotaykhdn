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
import './ApproverProductGroupListPage.css';

interface ProductGroupItem {
  id: string;
  name: string;
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

const SUPER_GROUP_FILTER_OPTIONS: FilterOption[] = [
  { label: 'Tất cả nhóm', value: '' },
  { label: 'Chương trình dịch vụ', value: 'SERVICE' },
  { label: 'Bảo hiểm', value: 'INSURANCE' },
  { label: 'Chương trình ưu đãi', value: 'PROGRAM' },
];

export const ApproverProductGroupListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedGroupTypes, setSelectedGroupTypes] = useState<string[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroupItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Batch Approval States
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'APPROVE' | 'REJECT' | null;
  }>({ isOpen: false, type: null });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchProductGroups = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_GROUPS.LIST, {
          params: {
            keyword: searchTerm || undefined,
            status: selectedStatuses.length === 1 ? selectedStatuses[0] : undefined,
            types: selectedGroupTypes.length ? selectedGroupTypes : undefined,
            forApproval: true,
          },
          paramsSerializer: { indexes: null },
        });

        let mapped: ProductGroupItem[] = response.data.map((item: any, index: number) => {
          return {
            id: item.id,
            stt: index + 1,
            name: item.name || '---',
            status: item.status || 'DRAFT',
            createdBy: item.createdByFullName || item.createdBy || '---',
            approvedBy: item.approvedByFullName || item.approvedBy || '---',
            active: item.active !== false,
            version: item.version,
          };
        });

        if (selectedStatuses.length > 1) {
          mapped = mapped.filter((item) => selectedStatuses.includes(item.status));
        }

        setProductGroups(mapped);
      } catch (error) {
        console.error('Error fetching product groups from backend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductGroups();
  }, [searchTerm, selectedStatuses, selectedGroupTypes]);

  const handleBatchConfirm = async (reason?: string) => {
    if (!modalState.type || selectedKeys.length === 0) return;
    setProcessing(true);
    try {
      const newStatus = modalState.type === 'APPROVE' ? 'ACTIVE' : 'REJECTED';
      await Promise.all(
        selectedKeys.map((id) =>
          axios.post(API_ENDPOINTS.APPROVER.PRODUCT_GROUPS.REVIEW(id), {
            status: newStatus,
            comment: reason || '',
          })
        )
      );

      // Optimistic update
      setProductGroups((prev) =>
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
    selectedGroupTypes.length > 0
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedStatuses([]);
    setSelectedGroupTypes([]);
    setSelectedKeys([]);
  };

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
            navigate(`/approver/product-groups/${row.id}`);
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
    <div className="product-group-list-page">
      <h1 className="product-group-page-title">Phê duyệt nhóm sản phẩm</h1>

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
              options={SUPER_GROUP_FILTER_OPTIONS}
              multiple
              selectedValues={selectedGroupTypes}
              onChange={setSelectedGroupTypes}
            />

            <ClearFilterButton
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
            />
          </div>

          {(selectedStatuses.length > 0 || selectedGroupTypes.length > 0) && (
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
              {selectedGroupTypes.map((val) => {
                const opt = SUPER_GROUP_FILTER_OPTIONS.find((o) => o.value === val);
                return (
                  <FilterTag
                    key={val}
                    label={opt ? opt.label : val}
                    onRemove={() => setSelectedGroupTypes(selectedGroupTypes.filter((t) => t !== val))}
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
          data={productGroups as any}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/approver/product-groups/${row.id}`)}
          loading={loading}
          emptyText="Không tìm thấy nhóm sản phẩm nào phù hợp."
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

export default ApproverProductGroupListPage;
