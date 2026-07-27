import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SearchInput from '../components/ui/SearchInput';
import FilterDropdown, { type FilterOption } from '../components/ui/FilterDropdown';
import DataTable, { type Column } from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { API_ENDPOINTS } from '../config/apiConfig';
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

const TIME_FILTER_OPTIONS: FilterOption[] = [
  { label: 'Tất cả thời gian', value: '' },
  { label: 'Hôm nay', value: 'today' },
  { label: '7 ngày qua', value: '7days' },
  { label: 'Tháng này', value: 'thisMonth' },
];

const ApproverRequestListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (window as any).currentUser = "Phạm Thùy Linh_001";
    localStorage.setItem('currentUser', "Phạm Thùy Linh_001");
  }, []);

  useEffect(() => {
    const event = new CustomEvent('requestCountChanged', { detail: requests.length });
    window.dispatchEvent(event);
  }, [requests]);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        let startDateStr = undefined;
        let endDateStr = undefined;

        if (selectedTime === 'today') {
          const today = new Date().toISOString().split('T')[0];
          startDateStr = today;
          endDateStr = today;
        } else if (selectedTime === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          startDateStr = sevenDaysAgo.toISOString().split('T')[0];
          endDateStr = new Date().toISOString().split('T')[0];
        } else if (selectedTime === 'thisMonth') {
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          startDateStr = firstDay.toISOString().split('T')[0];
          endDateStr = now.toISOString().split('T')[0];
        }

        const response = await axios.get(API_ENDPOINTS.PRODUCT.LIST2, {
          params: {
            keyword: searchTerm || undefined,
            status: selectedStatus || undefined,
            startDate: startDateStr,
            endDate: endDateStr,
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
  }, [searchTerm, selectedStatus, selectedTime]);

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
      render: (row) => row.approver,
    },
    {
      key: 'action',
      header: '',
      width: '60px',
      align: 'center',
      render: (row) => (
        <button
          className="btn-icon-action"
          title="Xem chi tiết"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/approver/batch/${row.id}`);
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      ),
    },
  ];

  return (
    <div className="request-list-page">
      <h1 className="request-page-title">Danh sách yêu cầu</h1>

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
            label="Thời gian"
            options={TIME_FILTER_OPTIONS}
            selectedValue={selectedTime}
            onSelect={setSelectedTime}
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
