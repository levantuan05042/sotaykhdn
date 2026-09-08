import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchInput from '../components/ui/SearchInput';
import FilterDropdown, { FilterTag, type FilterOption } from '../components/ui/FilterDropdown';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import BatchApprovalModal from '../components/ui/BatchApprovalModal';
import { API_ENDPOINTS } from '../config/apiConfig';
import { formatApprovedBy } from '../utils/formatUtils';
import './ApproverCriteriaListPage.css';

interface ProductGroupItem {
  id: string;
  name: string;
  status?: string | null;
  active?: boolean;
}

interface CriteriaItem {
  id: string;
  code: string;
  name: string;
  groupName: string;
  productGroups: ProductGroupItem[];
  categoryName: string;
  businessName: string;
  status: string;
  active: boolean;
  createdBy: string;
  approvedBy: string;
  version: number;
}

const normalizeProductGroups = (item: any): ProductGroupItem[] => {
  const rawGroups = Array.isArray(item.productGroups)
    ? item.productGroups
    : (item.productGroups && typeof item.productGroups === 'object' ? Object.values(item.productGroups) : []);
  return rawGroups
    .filter((g: any) => g && (!g.status || String(g.status).toUpperCase() === 'ACTIVE'))
    .map((g: any) => ({
      id: String(g.id ?? g.name ?? ''),
      name: g.name || '---',
      status: g.status,
      active: g.active,
    }));
};

const ApproverGroupNamesCell: React.FC<{
  groups: ProductGroupItem[];
  criteriaName: string;
  onOpen: (groups: ProductGroupItem[], criteriaName: string) => void;
}> = ({ groups, criteriaName, onOpen }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  const names = groups.map((g) => g.name).filter(Boolean);
  const preview = names.length > 0 ? names[0] : '---';
  const extraCount = Math.max(0, names.length - 1);
  const canOpenList = names.length > 1 || isOverflow;

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => setIsOverflow(el.scrollWidth > el.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [preview]);

  const openList = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canOpenList || names.length === 0) return;
    onOpen(groups, criteriaName);
  };

  return (
    <div className="approver-group-cell" onClick={(e) => e.stopPropagation()}>
      <span className="approver-group-preview" ref={textRef} title={preview}>
        {preview}
      </span>
      {canOpenList && (
        <button
          type="button"
          className="approver-group-more-trigger"
          title="Xem đầy đủ nhóm sản phẩm"
          onClick={openList}
        >
          {extraCount > 0 && (
            <span className="approver-group-more-label">
              +{extraCount} nhóm
            </span>
          )}
          {extraCount === 0 && (
            <span className="approver-group-more-label">Xem đầy đủ</span>
          )}
          <span className="approver-group-more-btn" aria-hidden="true">
            <span className="approver-group-more-dots">⋯</span>
          </span>
        </button>
      )}
    </div>
  );
};

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Đang hoạt động', value: 'ACTIVE' },
  { label: 'Từ chối', value: 'REJECTED' },
];

export const ApproverCriteriaListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [productGroups, setProductGroups] = useState<FilterOption[]>([]);
  const [criteriaList, setCriteriaList] = useState<CriteriaItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Batch Approval States
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'APPROVE' | 'REJECT' | null;
  }>({ isOpen: false, type: null });
  const [processing, setProcessing] = useState(false);
  const [groupModal, setGroupModal] = useState<{
    groups: ProductGroupItem[];
    criteriaName: string;
  } | null>(null);

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
        const mapped: CriteriaItem[] = response.data.map((item: any) => {
          const productGroups = normalizeProductGroups(item);
          return {
            id: item.id,
            code: item.code || '---',
            name: item.name || '---',
            groupName: productGroups.length > 0
              ? productGroups.map((g) => g.name).join(', ')
              : (item.groupName || '---'),
            productGroups,
            categoryName: item.categoryName || '---',
            businessName: item.businessName || '---',
            status: item.status || 'DRAFT',
            active: !!item.active,
            createdBy: item.createdByFullName || item.createdBy || '---',
            approvedBy: item.approvedByFullName || item.approvedBy || '---',
            version: item.version || 1,
          };
        });
        setCriteriaList(mapped);
      } catch (error) {
        console.error('Error fetching criteria from backend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCriteria();
  }, []);

  useEffect(() => {
    if (!groupModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGroupModal(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [groupModal]);

  const handleBatchConfirm = async (reason?: string) => {
    if (!modalState.type || selectedKeys.length === 0) return;
    setProcessing(true);
    try {
      const newStatus = modalState.type === 'APPROVE' ? 'ACTIVE' : 'REJECTED';
      await Promise.all(
        selectedKeys.map((id) =>
          axios.post(API_ENDPOINTS.APPROVER.PRODUCT_CRITERIA.REVIEW(id), {
            status: newStatus,
            comment: reason || '',
          })
        )
      );

      // Optimistic update
      setCriteriaList((prev) =>
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

  const filteredCriteria = criteriaList.filter((item) => {
    if (item.status === 'ARCHIVED') return false;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(item.status);
    const matchesGroup = selectedGroupIds.length === 0
      || selectedGroupIds.some((id) => {
        if (item.productGroups.some((g) => g.id === id)) return true;
        const group = productGroups.find((g) => g.value === id);
        if (!group) return false;
        return item.productGroups.some((g) => g.name === group.label) || item.groupName === group.label;
      });
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
    {
      key: 'groupName',
      header: 'Nhóm sản phẩm',
      render: (row) => (
        <ApproverGroupNamesCell
          groups={row.productGroups.length > 0
            ? row.productGroups
            : (row.groupName && row.groupName !== '---' ? [{ id: row.id, name: row.groupName }] : [])}
          criteriaName={row.name}
          onOpen={(groups, criteriaName) => setGroupModal({ groups, criteriaName })}
        />
      ),
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
            navigate(`/approver/criteria/${row.id}`);
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
    <div className="approver-criteria-list-page">
      <div className="page-header-row">
        <h1 className="page-main-title">Phê duyệt tiêu chí</h1>
      </div>

      {/* Khối tìm kiếm & Bộ lọc */}
      <div className="filter-card shadow-sm">
        <div className="dropdown-group-container">
          <div className="dropdown-row">
            <FilterDropdown
              label="Lọc theo trạng thái"
              options={STATUS_FILTER_OPTIONS}
              multiple
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
            />

            <FilterDropdown
              label="Lọc theo nhóm sản phẩm"
              options={productGroups}
              multiple
              selectedValues={selectedGroupIds}
              onChange={setSelectedGroupIds}
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
            </div>
          )}
        </div>

        <div className="filter-row-right">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Tìm kiếm theo mã, tên tiêu chí..."
          />
        </div>
      </div>

      {/* Bảng danh sách dữ liệu */}
      <div className="table-card shadow-sm">
        <DataTable
          columns={columns}
          data={filteredCriteria}
          loading={loading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/approver/criteria/${row.id}`)}
          emptyText="Không tìm thấy tiêu chí nào cần duyệt"
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

      {groupModal && (
        <div
          className="approver-group-modal-overlay"
          onClick={() => setGroupModal(null)}
          role="presentation"
        >
          <div
            className="approver-group-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="approver-group-modal-title"
          >
            <div className="approver-group-modal-header">
              <div>
                <h3 id="approver-group-modal-title" className="approver-group-modal-title">
                  Danh sách nhóm sản phẩm
                </h3>
                {groupModal.criteriaName && (
                  <p className="approver-group-modal-subtitle">{groupModal.criteriaName}</p>
                )}
              </div>
              <button
                type="button"
                className="approver-group-modal-close"
                onClick={() => setGroupModal(null)}
                aria-label="Đóng"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="approver-group-modal-body">
              <p className="approver-group-modal-count">
                {groupModal.groups.length} nhóm sản phẩm
              </p>
              <ol className="approver-group-modal-list">
                {groupModal.groups.map((g, index) => (
                  <li
                    key={g.id || `${g.name}-${index}`}
                    className={`approver-group-modal-item${g.active === false ? ' is-hidden' : ''}`}
                  >
                    <span className="approver-group-modal-index">{index + 1}</span>
                    <span className="approver-group-modal-name">{g.name}</span>
                    {g.active === false && (
                      <span className="approver-group-modal-hidden-tag">Đang ẩn</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApproverCriteriaListPage;
