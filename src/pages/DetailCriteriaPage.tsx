import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './DetailGroupPage.css'; // Giữ nguyên file CSS của bạn
import toast from 'react-hot-toast';

// Import cấu hình API tập trung
import { API_ENDPOINTS } from '../config/apiConfig';

// --- CẤU HÌNH TRẠNG THÁI (STATUS MAPPING) ---
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Đang hoạt động', className: 'status-active' },
  DRAFT: { label: 'Lưu nháp', className: 'status-draft' },
  NEEDS_REVISION: { label: 'Yêu cầu chỉnh sửa', className: 'status-revision' },
  PENDING_APPROVAL: { label: 'Chờ phê duyệt', className: 'status-pending' },
  REJECTED: { label: 'Từ chối', className: 'status-rejected' },
  ARCHIVED: { label: 'Lưu trữ', className: 'status-archived' },
};

// --- HELPER: ĐỊNH DẠNG NGÀY GIỜ ---
const formatDateTime = (dateString: string) => {
  if (!dateString) return '---';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const DetailCriteriaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  
  const [isActive, setIsActive] = useState(true); // Trạng thái hiển thị (Hiệu lực)
  const [criteriaData, setCriteriaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // State lưu danh sách options đa lựa chọn (Multi-select) cho Nhóm sản phẩm
  const [groupOptions, setGroupOptions] = useState<{ label: string; value: string }[]>([]);

  // Thêm thuộc tính isRequired vào formData
  const [formData, setFormData] = useState<{ code: string; name: string; groupIds: string[]; isRequired: boolean }>({
    code: '',
    name: '',
    groupIds: [],
    isRequired: false
  });

  // Tự động đóng cả 2 dropdown khi click ra ngoài vùng select
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Fetch thông tin chi tiết Tiêu chí & Toàn bộ danh sách Nhóm sản phẩm ACTIVE
  useEffect(() => {
    let isMounted = true;
    const initPageData = async () => {
      if (!id) return;
      try {
        setLoading(true);

        // Gọi đồng thời API lấy Chi tiết Tiêu chí và Danh sách Nhóm sản phẩm ACTIVE
        const [detailRes, groupsRes] = await Promise.all([
          fetch(API_ENDPOINTS.PRODUCT_CRITERIA.DETAIL(id)),
          fetch(`${API_ENDPOINTS.PRODUCT_GROUPS.LIST}?status=ACTIVE&active=true`)
        ]);

        if (!detailRes.ok) throw new Error("Không thể tải thông tin tiêu chí");
        
        const detailData = await detailRes.json();
        
        if (!isMounted) return;
        setCriteriaData(detailData);

        // Lấy danh sách ID từ mảng đối tượng productGroups trả về từ backend
        const initialGroupIds = detailData.productGroups 
          ? detailData.productGroups.map((g: any) => g.id) 
          : [];

        setFormData({
          code: detailData.code || '',
          name: detailData.name || '',
          groupIds: initialGroupIds,
          isRequired: detailData.isRequired ?? false // Gán giá trị mặc định từ Backend, fallback là false
        });

        // 👉 ĐỒNG BỘ: Cập nhật trạng thái hiển thị (active) từ Backend đổ về hệ thống
        setIsActive(detailData.active ?? true);

        // Đổ dữ liệu Nhóm sản phẩm vào Dropdown bộ lọc
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          const options = groupsData.map((g: any) => ({
            label: g.name,
            value: g.id
          }));
          setGroupOptions(options);
        } else {
          // Fallback nếu API lấy nhóm bị lỗi: Giữ lại các nhóm hiện tại đang có để hiển thị giao diện
          const fallbackOptions = detailData.productGroups
            ? detailData.productGroups.map((g: any) => ({ label: g.name, value: g.id }))
            : [];
          setGroupOptions(fallbackOptions);
        }

      } catch (error) {
        console.error("Lỗi khi khởi tạo dữ liệu:", error);
        toast.error("Không tìm thấy tiêu chí hoặc tiêu chí đã bị ẩn");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initPageData();
    return () => { isMounted = false; };
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Hàm handle riêng cho checkbox Bắt buộc
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Click chọn/bỏ chọn item đối với dropdown đa chọn (Multi-select)
  const handleToggleGroup = (value: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn sự kiện click làm đóng/mở dropdown không mong muốn
    setFormData(prev => {
      const isSelected = prev.groupIds.includes(value);
      const updatedGroupIds = isSelected
        ? prev.groupIds.filter(id => id !== value)
        : [...prev.groupIds, value];
      return { ...prev, groupIds: updatedGroupIds };
    });
  };

  const handleGoBack = () => navigate('/criteria-management');

  // 2. Hàm cập nhật thông tin và cập nhật trạng thái Tiêu chí
  const handleUpdateCriteria = async (status: 'ARCHIVED' | 'PENDING_APPROVAL' | 'DRAFT' | 'ACTIVE') => {
    if (!id) return;

    // Validation khi bấm các nút xử lý (Ngoại trừ Lưu trữ & Hoạt động lại không cần kiểm tra)
    if (status !== 'ARCHIVED' && status !== 'ACTIVE') {
      if (!formData.code.trim()) {
        toast.error("Vui lòng nhập mã tiêu chí sản phẩm", { position: 'top-center' });
        return;
      }
      if (!formData.name.trim()) {
        toast.error("Vui lòng nhập tên tiêu chí sản phẩm", { position: 'top-center' });
        return;
      }
      if (formData.groupIds.length === 0) {
        toast.error("Vui lòng chọn ít nhất một nhóm sản phẩm", { position: 'top-center' });
        setIsOpen(true);
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PRODUCT_CRITERIA.UPDATE(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code.trim() || criteriaData.code,
          name: formData.name.trim() || criteriaData.name,
          groupIds: formData.groupIds, // Truyền mảng danh sách ID nhóm lên cho Backend
          isRequired: formData.isRequired, // Đưa thông tin bắt buộc lên API backend
          active: isActive, // 👉 ĐỒNG BỘ: Đưa trạng thái Ẩn/Hiện mới cập nhật lên Backend
          status
        }),
      });

      // Bắt lỗi trùng lặp dữ liệu (Thông thường Backend trả về HTTP Status 409 Conflict hoặc 400 kèm message)
      if (response.status === 409) {
        toast.error("Mã tiêu chí này đã tồn tại trên hệ thống. Vui lòng kiểm tra lại!", { position: 'top-center' });
        setLoading(false);
        return;
      }

      if (response.ok) {
        let message = '';
        switch (status) {
          case 'DRAFT': message = "Lưu nháp tiêu chí thành công"; break;
          case 'ARCHIVED': message = "Lưu trữ tiêu chí thành công"; break;
          case 'ACTIVE': message = "Kích hoạt tiêu chí hoạt động trở lại thành công"; break;
          case 'PENDING_APPROVAL': message = "Gửi phê duyệt tiêu chí thành công"; break;
          default: message = "Cập nhật tiêu chí thành công";
        }

        renderCustomToast(message);
        setTimeout(() => navigate('/criteria-management'), 1500);
      } else {
        const errorData = await response.json();
        // Kiểm tra xem backend có gửi text báo trùng mã cụ thể hay không
        if (errorData.message && (errorData.message.includes('trùng') || errorData.message.includes('exist'))) {
          toast.error("Mã tiêu chí đã tồn tại, không thể trùng lặp!", { position: 'top-center' });
        } else {
          toast.error(errorData.message || 'Có lỗi xảy ra khi cập nhật', { position: 'top-center' });
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      toast.error('Lỗi kết nối máy chủ hoặc kiểm tra trùng lặp thất bại', { position: 'top-center' });
      setLoading(false);
    }
  };

  // 3. Hàm kích hoạt xác nhận Xóa tiêu chí
  const handleDeleteCriteria = () => {
    if (!id) return;

    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} confirm-toast-card`}>
        <div className="confirm-toast-body">
          <div className="confirm-toast-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" viewBox="0 0 17 19" fill="none">
              <path d="M0.835938 4.16829H2.5026M2.5026 4.16829H15.8359M2.5026 4.16829V15.835C2.5026 16.277 2.6782 16.7009 2.99076 17.0135C3.30332 17.326 3.72724 17.5016 4.16927 17.5016H12.5026C12.9446 17.5016 13.3686 17.326 13.6811 17.0135C13.9937 16.7009 14.1693 16.277 14.1693 15.835V4.16829H2.5026ZM5.0026 4.16829V2.50163C5.0026 2.0596 5.1782 1.63568 5.49076 1.32312C5.80332 1.01056 6.22724 0.834961 6.66927 0.834961H10.0026C10.4446 0.834961 10.8686 1.01056 11.1811 1.32312C11.4937 1.63568 11.6693 2.0596 11.6693 2.50163V4.16829M6.66927 8.33496V13.335M10.0026 8.33496V13.335" stroke="#AE1C3F" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="confirm-toast-content">
            <p className="confirm-toast-title">Xác nhận xóa tiêu chí</p>
            <p className="confirm-toast-desc">Bạn có chắc chắn muốn xóa tiêu chí sản phẩm này không? Hành động này không thể hoàn tác.</p>
          </div>
        </div>
        <div className="confirm-toast-actions">
          <button 
            className="confirm-btn-delete"
            onClick={async () => {
              toast.dismiss(t.id);
              await executeDelete();
            }}
          >
            Xóa
          </button>
          <button className="confirm-btn-cancel" onClick={() => toast.dismiss(t.id)}>
            Hủy
          </button>
        </div>
      </div>
    ), { position: 'top-center', duration: Infinity });
  };

  const executeDelete = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PRODUCT_CRITERIA.DELETE(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        renderCustomToast("Xóa tiêu chí sản phẩm thành công");
        setTimeout(() => navigate('/criteria-management'), 1500);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Có lỗi xảy ra khi xóa', { position: 'top-center' });
        setLoading(false);
      }
    } catch (error) {
      console.error("Lỗi xóa tiêu chí:", error);
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
      setLoading(false);
    }
  };

  const renderCustomToast = (message: string) => {
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} toast-pill-container`}>
        <div className="toast-pill-content">
          <div className="toast-pill-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <span className="toast-pill-text">{message}</span>
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="toast-pill-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    ), { position: 'top-center' });
  };

  if (loading) return <div className="loading">Đang tải dữ liệu tiêu chí...</div>;
  if (!criteriaData) return <div className="error">Không tìm thấy dữ liệu tiêu chí sản phẩm phù hợp.</div>;

  const currentStatus = STATUS_MAP[criteriaData.status] || { label: criteriaData.status, className: '' };
  
  // So sánh dữ liệu cũ và mới để kiểm tra trạng thái thay đổi
  const initialGroupIds = criteriaData.productGroups ? criteriaData.productGroups.map((g: any) => g.id) : [];
  const isGroupsChanged = JSON.stringify([...formData.groupIds].sort()) !== JSON.stringify([...initialGroupIds].sort());
  
  // 👉 ĐỒNG BỘ: Bổ sung so sánh `isActive` vào trong kiểm tra isDirty
  const isDirty = formData.name !== (criteriaData.name || '') || 
                  formData.code !== (criteriaData.code || '') || 
                  formData.isRequired !== (criteriaData.isRequired || false) ||
                  isActive !== (criteriaData.active ?? true) ||
                  isGroupsChanged;

  // Điều kiện để kích hoạt nút gửi duyệt
  const canSubmit = isDirty && 
                    formData.code.trim() !== '' && 
                    formData.name.trim() !== '' && 
                    formData.groupIds.length > 0;

  // Render text hiển thị các nhóm sản phẩm đã chọn
  const selectedGroupsText = groupOptions
    .filter(o => formData.groupIds.includes(o.value))
    .map(o => o.label)
    .join(', ') || "Chọn nhóm sản phẩm";

  return (
    <div className="pageWrapper">
      <div className="mainContainer">
        
        {/* HEADER & BREADCRUMB */}
        <div className="header">
          <div className="headerLeft">
            <button className="btnBack" onClick={handleGoBack}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12.6667 6.83333H1M6.83333 1L1 6.83333L6.83333 12.6667" stroke="#3C393F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="breadcrumbText">Tiêu chí sản phẩm</span>
            </button>

            <div className="breadcrumb">
              <div className="separatorWrapper">
                <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                  <path d="M0.5 8.5L4.5 4.5L0.5 0.5" stroke="#171717" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <span className="breadcrumbActive breadcrumb-truncate" title={criteriaData.name}>
                {criteriaData.name}
              </span>

              <div className={`statusBadge ${currentStatus.className}`}>
                <span className="dot"></span>
                <span className="statusText">{currentStatus.label}</span>
              </div>
            </div>
          </div>

          {/* ACTIONS CONTROLLER */}
          <div className="headerRight" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            {/* TRẠNG THÁI: DRAFT */}
            {criteriaData.status === 'DRAFT' && (
              <>
                <button className="btnDraft" onClick={handleDeleteCriteria} style={{ display: 'flex', padding: '8px 14px', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '8px', background: '#E3DFE6', border: 'none', cursor: 'pointer', color: '#AE1C3F', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: '600', lineHeight: '20px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="16.667" viewBox="0 0 17 19" fill="none">
                    <path d="M0.835938 4.16829H2.5026M2.5026 4.16829H15.8359M2.5026 4.16829V15.835C2.5026 16.277 2.6782 16.7009 2.99076 17.0135C3.30332 17.326 3.72724 17.5016 4.16927 17.5016H12.5026C12.9446 17.5016 13.3686 17.326 13.6811 17.0135C13.9937 16.7009 14.1693 16.277 14.1693 15.835V4.16829H2.5026ZM5.0026 4.16829V2.50163C5.0026 2.0596 5.1782 1.63568 5.49076 1.32312C5.80332 1.01056 6.22724 0.834961 6.66927 0.834961H10.0026C10.4446 0.834961 10.8686 1.01056 11.1811 1.32312C11.4937 1.63568 11.6693 2.0596 11.6693 2.50163V4.16829M6.66927 8.33496V13.335M10.0026 8.33496V13.335" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Xóa
                </button>
                <button className={`btnDraft ${isDirty ? 'active' : 'disabled'}`} disabled={!isDirty} onClick={() => handleUpdateCriteria('DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Lưu nháp
                </button>
                <button className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} disabled={!canSubmit} onClick={() => handleUpdateCriteria('PENDING_APPROVAL')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Gửi phê duyệt
                </button>
              </>
            )}

            {/* TRẠNG THÁI: ACTIVE */}
            {criteriaData.status === 'ACTIVE' && (
              <>
                <button className={`btnDraft ${isDirty ? 'active' : 'disabled'}`} disabled={!isDirty} onClick={() => handleUpdateCriteria('DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Lưu nháp
                </button>
                <button className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} disabled={!canSubmit} onClick={() => handleUpdateCriteria('PENDING_APPROVAL')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Gửi phê duyệt
                </button>
              </>
            )}

            {/* TRẠNG THÁI: NEEDS_REVISION */}
            {criteriaData.status === 'NEEDS_REVISION' && (
              <>
                <button className={`btnDraft ${isDirty ? 'active' : 'disabled'}`} disabled={!isDirty} onClick={() => handleUpdateCriteria('DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Lưu nháp
                </button>
                <button className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} disabled={!canSubmit} onClick={() => handleUpdateCriteria('PENDING_APPROVAL')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Gửi phê duyệt
                </button>
              </>
            )}

            {/* TRẠNG THÁI: ARCHIVED */}
            {criteriaData.status === 'ARCHIVED' && (
              <button className="btnRestore active" onClick={() => handleUpdateCriteria('ACTIVE')} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#115e59', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                Hoạt động trở lại
              </button>
            )}

          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="contentGrid">
          <div className="leftCol">
            <div className="formCard">
              <div className="formGroup">
                <label className="label">Mã tiêu chí *</label>
                <input 
                  type="text" 
                  name="code" 
                  className="input" 
                  value={formData.code} 
                  onChange={handleInputChange} 
                  placeholder="Nhập mã tiêu chí"
                />
              </div>
              <div className="formGroup">
                <label className="label">Tên tiêu chí *</label>
                <input 
                  type="text" 
                  name="name" 
                  className="input" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  placeholder="Nhập tên tiêu chí"
                />
              </div>

              <div className="formGroup" ref={dropdownRef}>
                <label className="label">Nhóm sản phẩm *</label>
                <div className="custom-select-container">
                  <div className={`select-custom ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                    <span className="truncate-text" style={{ maxWidth: '90%' }} title={selectedGroupsText}>
                      {selectedGroupsText}
                    </span>
                    <svg 
                      width="10" height="6" viewBox="0 0 10 6" fill="none" 
                      className={`arrow-icon ${isOpen ? 'up' : ''}`}
                    >
                      <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {isOpen && (
                    <div className="custom-options-list">
                      {/* --- OPTION: CHỌN TẤT CẢ --- */}
                      {groupOptions.length > 0 && (
                        <div 
                          className={`custom-option select-all-option ${formData.groupIds.length === groupOptions.length ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const isAllSelected = formData.groupIds.length === groupOptions.length;
                            setFormData(prev => ({
                              ...prev,
                              groupIds: isAllSelected ? [] : groupOptions.map(opt => opt.value)
                            }));
                          }}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            borderBottom: '1px solid #E3DFE6', 
                            paddingBottom: '8px',
                            marginBottom: '4px',
                            fontWeight: '600' 
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={groupOptions.length > 0 && formData.groupIds.length === groupOptions.length} 
                            onChange={() => {}} 
                            style={{ pointerEvents: 'none' }}
                          />
                          <span>Tất cả nhóm sản phẩm</span>
                        </div>
                      )}

                      {/* --- DANH SÁCH OPTIONS CON --- */}
                      {groupOptions.map((opt) => {
                        const isChecked = formData.groupIds.includes(opt.value);
                        return (
                          <div 
                            key={opt.value} 
                            className={`custom-option ${isChecked ? 'selected' : ''}`}
                            onClick={(e) => handleToggleGroup(opt.value, e)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => {}} 
                              style={{ pointerEvents: 'none' }}
                            />
                            <span>{opt.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* --- THÊM Ô CHECKBOX BẮT BUỘC --- */}
              <div className="formGroup" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  id="isRequired"
                  name="isRequired"
                  checked={formData.isRequired} 
                  onChange={handleCheckboxChange}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isRequired" style={{ fontSize: '14px', fontWeight: '500', color: '#3C393F', cursor: 'pointer', userSelect: 'none' }}>
                  Đây là tiêu chí bắt buộc
                </label>
              </div>

            </div>
          </div>

          {/* CỘT PHẢI: BÌNH LUẬN PHẢN HỒI */}
          <div className="rightCol" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="formCard" style={{ borderRadius: 12, background: 'var(--Mauve-3, #F2EFF3)', display: 'flex', width: 340, padding: 24, flexDirection: 'column', alignItems: 'flex-start', gap: 10, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#1A191B', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>Trạng thái hiển thị</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'help' }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div className="custom-select-container" ref={statusRef} style={{ width: '100%', position: 'relative' }}>
                <div className={`select-custom ${isStatusOpen ? 'open' : ''}`} onClick={() => setIsStatusOpen(v => !v)}
                  style={{ display: 'flex', padding: '8px 12px', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 8, border: '1px solid #D5D7DA', background: '#FFF', boxShadow: '0 1px 2px rgba(10,13,18,0.05)', cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                  <span style={{ color: '#1A191B', fontWeight: 500 }}>{isActive === false ? 'Ẩn' : 'Hiển thị'}</span>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isStatusOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <path d="M5 7.5L10 12.5L15 7.5"/>
                  </svg>
                </div>
                {isStatusOpen && (
                  <div className="custom-options-list" style={{ zIndex: 50 }}>
                    <div className={`custom-option ${isActive === false ? 'selected' : ''}`} onClick={() => { setIsActive(false); setIsStatusOpen(false); }}>Ẩn</div>
                    <div className={`custom-option ${isActive === true  ? 'selected' : ''}`} onClick={() => { setIsActive(true);  setIsStatusOpen(false); }}>Hiển thị</div>
                  </div>
                )}
              </div>
            </div>
             <div className="commentCard">
                <div className="commentHeader">
                  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M18.071 18.0698C15.0159 21.1264 10.4896 21.7867 6.78631 20.074C6.23961 19.8539 2.70113 20.8339 1.93334 20.067C1.16555 19.2991 2.14639 15.7601 1.92631 15.2134C0.212846 11.5106 0.874111 6.9826 3.9302 3.9271C7.83147 0.0243001 14.1698 0.0243001 18.071 3.9271C21.9803 7.83593 21.9723 14.1681 18.071 18.0698Z" stroke="#AE1C3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="commentTitle">Bình luận phản hồi</span>
                </div>
                <div className="commentList">
                  {criteriaData.comments && criteriaData.comments.length > 0 ? (
                    criteriaData.comments.map((c: any, index: number) => (
                      <React.Fragment key={c.id || index}>
                        <div className="commentItem">
                          <div className="userInfo">
                            <img src={c.avatarUrl || "https://images.squarespace-cdn.com/content/v1/61da6bc18e4e00423cffe684/1765779011140-U85TJYNQM9M24A5RQOZW/Leo+nui.png"} className="avatar" alt="avatar" />
                            <div style={{ flex: 1 }}>
                              <div className="userHeader">
                                <span className="userName">{c.createdBy || 'Người kiểm duyệt'}</span>
                                <span className="commentDate">{formatDateTime(c.createdAt)}</span>
                              </div>
                              <p className="commentText">{c.comment}</p>
                            </div>
                          </div>
                        </div>
                        {index < criteriaData.comments.length - 1 && <hr className="commentDivider" />}
                      </React.Fragment>
                    ))
                  ) : (
                    <div className="no-comments">Chưa có bình luận hay phản hồi nào cho tiêu chí này.</div>
                  )}
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DetailCriteriaPage;