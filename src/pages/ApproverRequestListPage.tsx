import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchInput from '../components/ui/SearchInput';
import FilterDropdown, { type FilterOption } from '../components/ui/FilterDropdown';
import DateRangePicker from '../components/ui/DateRangePicker';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { API_ENDPOINTS } from '../config/apiConfig';
import { formatApprovedBy } from '../utils/formatUtils';
import './ApproverRequestListPage.css';

export interface RequestItem {
  id: string;
  stt: number;
  title: string;
  status: string;
  createdAt: string;
  creator: string;
  approver: string;
}

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Lưu nháp', value: 'DRAFT' },
  { label: 'Yêu cầu chỉnh sửa', value: 'NEEDS_REVISION' },
  { label: 'Hoàn thành', value: 'ACTIVE' },
  { label: 'Từ chối', value: 'REJECTED' },
  { label: 'Chờ duyệt', value: 'PENDING_APPROVAL' },
];

const ApproverRequestListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);



  useEffect(() => {
    const event = new CustomEvent('requestCountChanged', { detail: requests.length });
    window.dispatchEvent(event);
  }, [requests]);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const response = await axios.get(API_ENDPOINTS.APPROVER.PRODUCT_REQUESTS.LIST, {
          params: {
            keyword: searchTerm || undefined,
            status: selectedStatus || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            forApproval: true,
          },
        });

        const mapped: RequestItem[] = response.data.map((item: any, index: number) => {
          let formattedDate = '---';
          if (item.createdAt) {
            const d = new Date(item.createdAt);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            formattedDate = `${day}/${month}/${year}`;
          }

          return {
            id: item.requestId,
            stt: index + 1,
            title: item.requestName || '---',
            status: item.status || 'DRAFT',
            createdAt: formattedDate,
            creator: item.createdBy || '---',
            approver: item.approvedBy || '---',
          };
        });

        setRequests(mapped);
      } catch (error) {
        console.error('Error fetching requests from backend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [searchTerm, selectedStatus, startDate, endDate]);

  const columns: Column<RequestItem>[] = [
    {
      key: 'stt',
      header: 'STT',
      width: '70px',
      align: 'center',
      render: (row) => row.stt,
    },
    {
      key: 'title',
      header: 'Tên yêu cầu',
      render: (row) => <span className="request-item-title">{row.title}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '180px',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Thời gian',
      width: '140px',
      render: (row) => row.createdAt,
    },
    {
      key: 'creator',
      header: 'Người tạo',
      render: (row) => row.creator,
    },
    {
      key: 'approver',
      header: 'Người kiểm duyệt',
      render: (row) => formatApprovedBy(row.approver),
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
            navigate(`/approver/batch/${row.id}`);
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
    <div className="request-list-page">
      <h1 className="request-page-title">Phê duyệt lô sản phẩm</h1>

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

          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onSave={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        </div>
      </div>

      {/* Bảng danh sách dữ liệu */}
      <div className="table-card">
        <DataTable
          columns={columns}
          data={requests}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/approver/batch/${row.id}`)}
          emptyText={loading ? "Đang tải dữ liệu..." : "Không tìm thấy yêu cầu nào phù hợp."}
        />
      </div>
    </div>
  );
};

export default ApproverRequestListPage;
