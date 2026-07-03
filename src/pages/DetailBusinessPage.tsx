import React, { useState, useEffect,useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './DetailGroupPage.css'; // Giữ nguyên file CSS style cũ của bạn
import toast from 'react-hot-toast';

// Import cấu hình API tập trung chính xác của bạn
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

const DetailBusinessPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const statusRef = useRef<HTMLDivElement>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // State lưu danh sách options cho dropdown chọn Danh mục sản phẩm cha
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    categoryId: ''
  });

  // 1. Fetch thông tin chi tiết Nghiệp vụ & Toàn bộ danh sách Danh mục hoạt động để update
  useEffect(() => {
    const initPageData = async () => {
      if (!id) return;
      try {
        setLoading(true);

        // Sử dụng chính xác API_ENDPOINTS từ file config tập trung của bạn
        const [detailRes, categoriesRes] = await Promise.all([
          fetch(API_ENDPOINTS.PRODUCT_BUSINESS.DETAIL(id)),
          fetch(`${API_ENDPOINTS.PRODUCT_CATEGORY.LIST}?status=ACTIVE&active=true`)
        ]);

        if (!detailRes.ok) throw new Error("Không thể tải thông tin nghiệp vụ");
        
        const detailData = await detailRes.json();
        setBusinessData(detailData);
        setFormData({
          name: detailData.name || '',
          categoryId: detailData.categoryId || ''
        });
        setIsActive(detailData.active ?? true);
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          const options = categoriesData.map((c: any) => ({
            label: c.name,
            value: c.id
          }));
          setCategoryOptions(options);
        } else {
          // Fallback nếu API danh mục lỗi: Giữ lại danh mục hiện tại của nghiệp vụ tránh trống UI
          setCategoryOptions([
            { label: detailData.categoryName || 'Danh mục hiện tại', value: detailData.categoryId },
          ]);
        }

      } catch (error) {
        console.error("Lỗi khi khởi tạo dữ liệu nghiệp vụ:", error);
        toast.error("Không tìm thấy nghiệp vụ hoặc nghiệp vụ đã bị ẩn");
      } finally {
        setLoading(false);
      }
    };

    initPageData();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGoBack = () => navigate('/business-management'); // Điều hướng ngược lại danh sách nghiệp vụ

  // 2. Hàm cập nhật trạng thái / thông tin Nghiệp vụ
  const handleUpdateBusiness = async (status: 'ARCHIVED' | 'PENDING_APPROVAL' | 'DRAFT' | 'ACTIVE') => {
    if (!id) return;

    // Validation form đầu vào khi bấm xử lý (Ngoại trừ Lưu trữ & Kích hoạt lại)
    if (status !== 'ARCHIVED' && status !== 'ACTIVE') {
      if (!formData.name.trim()) {
        toast.error("Vui lòng nhập tên nghiệp vụ", { position: 'top-center' });
        return;
      }
      if (!formData.categoryId) {
        toast.error("Vui lòng chọn danh mục sản phẩm thuộc về", { position: 'top-center' });
        setIsOpen(true);
        return;
      }
    }

    try {
      setLoading(true);
      
      const response = await fetch(API_ENDPOINTS.PRODUCT_BUSINESS.UPDATE(id), {
        method: 'POST', // Giữ nguyên Method POST theo thiết kế backend hệ thống của bạn
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || businessData.name,
          categoryId: formData.categoryId || businessData.categoryId,
          active: isActive,
          status
        }),
      });

      if (response.ok) {
        let message = '';
        switch (status) {
          case 'DRAFT': message = "Lưu nháp nghiệp vụ thành công"; break;
          case 'ARCHIVED': message = "Lưu trữ nghiệp vụ thành công"; break;
          case 'ACTIVE': message = "Kích hoạt nghiệp vụ hoạt động trở lại thành công"; break;
          case 'PENDING_APPROVAL': message = "Gửi phê duyệt nghiệp vụ thành công"; break;
          default: message = "Cập nhật nghiệp vụ thành công";
        }

        renderCustomToast(message);
        setTimeout(() => navigate('/business-management'), 2000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Có lỗi xảy ra khi cập nhật nghiệp vụ', { position: 'top-center' });
        setLoading(false);
      }
    } catch (error) {
      console.error("Lỗi cập nhật nghiệp vụ:", error);
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
      setLoading(false);
    }
  };

  // 3. Hàm kích hoạt xác nhận Xóa nghiệp vụ
  const handleDeleteBusiness = () => {
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
            <p className="confirm-toast-title">Xác nhận xóa nghiệp vụ</p>
            <p className="confirm-toast-desc">Bạn có chắc chắn muốn xóa nghiệp vụ này không? Hành động này không thể hoàn tác.</p>
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
      
      const response = await fetch(API_ENDPOINTS.PRODUCT_BUSINESS.DELETE(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        renderCustomToast("Xóa nghiệp vụ thành công");
        setTimeout(() => navigate('/business-management'), 2000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Có lỗi xảy ra khi xóa nghiệp vụ', { position: 'top-center' });
        setLoading(false);
      }
    } catch (error) {
      console.error("Lỗi xóa nghiệp vụ:", error);
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

  if (loading) return <div className="loading">Đang tải dữ liệu nghiệp vụ...</div>;
  if (!businessData) return <div className="error">Không tìm thấy dữ liệu nghiệp vụ phù hợp.</div>;

  const currentStatus = STATUS_MAP[businessData.status] || { label: businessData.status, className: '' };
  
  // Kiểm tra dữ liệu xem form đã bị thay đổi (Dirty check) hay chưa
  const isDirty = (
    formData.name !== (businessData.name || '') || 
    formData.categoryId !== (businessData.categoryId || '') ||
    isActive !== (businessData?.active ?? true) // Kiểm tra thêm trường isActive
    );
  const canSubmit = isDirty && formData.name.trim() !== '';

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
              <svg xmlns="http://www.w3.org/2000/svg" width="14.379" height="14.375" viewBox="0 0 16 16" fill="none">
                <path d="M11.3789 4.5H11.3714M1.18641 9.3075L6.56391 14.685C6.70322 14.8245 6.86865 14.9351 7.05075 15.0106C7.23284 15.0861 7.42803 15.1249 7.62516 15.1249C7.82228 15.1249 8.01747 15.0861 8.19957 15.0106C8.38166 14.9351 8.5471 14.8245 8.68641 14.685L15.1289 8.25V0.75H7.62891L1.18641 7.1925C0.90703 7.47354 0.750217 7.85372 0.750217 8.25C0.750217 8.64628 0.90703 9.02646 1.18641 9.3075Z" stroke="#171717" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="breadcrumbText">Danh sách nghiệp vụ</span>
            </button>

            <div className="breadcrumb">
              <div className="separatorWrapper">
                <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                  <path d="M0.5 8.5L4.5 4.5L0.5 0.5" stroke="#171717" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <span className="breadcrumbActive breadcrumb-truncate" title={businessData.name}>
                {businessData.name}
              </span>

              <div className={`statusBadge ${currentStatus.className}`}>
                <span className="dot"></span>
                <span className="statusText">{currentStatus.label}</span>
              </div>
            </div>
          </div>

          {/* ACTIONS CONTROLLER (Quản lý nút theo trạng thái Nghiệp vụ) */}
          <div className="headerRight" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            
            {/* TRẠNG THÁI DRAFT */}
            {businessData.status === 'DRAFT' && (
              <>
                <button className="btnDraft" onClick={handleDeleteBusiness} style={{ display: 'flex', padding: '8px 14px', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '8px', background: '#E3DFE6', border: 'none', cursor: 'pointer', color: '#AE1C3F', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: '600', lineHeight: '20px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="16.667" viewBox="0 0 17 19" fill="none">
                    <path d="M0.835938 4.16829H2.5026M2.5026 4.16829H15.8359M2.5026 4.16829V15.835C2.5026 16.277 2.6782 16.7009 2.99076 17.0135C3.30332 17.326 3.72724 17.5016 4.16927 17.5016H12.5026C12.9446 17.5016 13.3686 17.326 13.6811 17.0135C13.9937 16.7009 14.1693 16.277 14.1693 15.835V4.16829H2.5026ZM5.0026 4.16829V2.50163C5.0026 2.0596 5.1782 1.63568 5.49076 1.32312C5.80332 1.01056 6.22724 0.834961 6.66927 0.834961H10.0026C10.4446 0.834961 10.8686 1.01056 11.1811 1.32312C11.4937 1.63568 11.6693 2.0596 11.6693 2.50163V4.16829M6.66927 8.33496V13.335M10.0026 8.33496V13.335" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Xóa
                </button>
                <button className={`btnDraft ${isDirty ? 'active' : 'disabled'}`} disabled={!isDirty} onClick={() => handleUpdateBusiness('DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Lưu nháp
                </button>
                <button className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} disabled={!canSubmit} onClick={() => handleUpdateBusiness('PENDING_APPROVAL')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Gửi phê duyệt
                </button>
              </>
            )}

            {/* TRẠNG THÁI ACTIVE */}
            {businessData.status === 'ACTIVE' && (
              <>
                <button className={`btnDraft ${isDirty ? 'active' : 'disabled'}`} disabled={!isDirty} onClick={() => handleUpdateBusiness('DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Lưu nháp
                </button>
                <button className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} disabled={!canSubmit} onClick={() => handleUpdateBusiness('PENDING_APPROVAL')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Gửi phê duyệt
                </button>
              </>
            )}

            {/* TRẠNG THÁI REJECTED */}
            {businessData.status === 'REJECTED' && null}

            {/* TRẠNG THÁI NEEDS_REVISION */}
            {businessData.status === 'NEEDS_REVISION' && (
              <>
                <button className={`btnDraft ${isDirty ? 'active' : 'disabled'}`} disabled={!isDirty} onClick={() => handleUpdateBusiness('DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  Lưu nháp
                </button>
                <button className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} disabled={!canSubmit} onClick={() => handleUpdateBusiness('PENDING_APPROVAL')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Gửi phê duyệt
                </button>
              </>
            )}

            {/* TRẠNG THÁI PENDING_APPROVAL */}
            {businessData.status === 'PENDING_APPROVAL' && null}

            {/* TRẠNG THÁI ARCHIVED */}
            {businessData.status === 'ARCHIVED' && (
              <button className="btnRestore active" onClick={() => handleUpdateBusiness('ACTIVE')} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#115e59', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
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
              
              {/* DROPDOWN SELECT CHỌN DANH MỤC SẢN PHẨM CHA */}
              <div className="formGroup">
                <label className="label">Danh mục sản phẩm thuộc về *</label>
                <div className="custom-select-container">
                  <div className={`select-custom ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                    <span>{categoryOptions.find(o => o.value === formData.categoryId)?.label || "Chọn danh mục sản phẩm"}</span>
                    <svg 
                      width="10" height="6" viewBox="0 0 10 6" fill="none" 
                      className={`arrow-icon ${isOpen ? 'up' : ''}`}
                    >
                      <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {isOpen && (
                    <div className="custom-options-list">
                      {categoryOptions.map((opt) => (
                        <div key={opt.value} className={`custom-option ${formData.categoryId === opt.value ? 'selected' : ''}`}
                          onClick={() => { setFormData({...formData, categoryId: opt.value}); setIsOpen(false); }}>
                          <span>{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* INPUT TÊN NGHIỆP VỤ */}
              <div className="formGroup">
                <label className="label">Tên nghiệp vụ</label>
                <input type="text" name="name" className="input" value={formData.name} onChange={handleInputChange} />
              </div>

            </div>
          </div>

          {/* CỘT PHẢI: BÌNH LUẬN PHẢN HỒI CỦA NGHIỆP VỤ */}
          <div className="rightCol" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             <div 
                className="formCard" 
                style={{ 
                  borderRadius: '12px', 
                  background: 'var(--Mauve-3, #F2EFF3)', 
                  display: 'flex', 
                  width: '340px', 
                  padding: '24px', 
                  flexDirection: 'column', 
                  alignItems: 'flex-start', 
                  gap: '10px', 
                  border: '1px solid #E5E7EB' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span 
                    style={{ 
                      color: 'var(--Token-Text-body-emphasis-color, #1A191B)',
                      fontFamily: 'var(--Font-family-font-family-body, Inter)',
                      fontSize: 'var(--Font-size-text-md, 16px)',
                      fontStyle: 'normal',
                      fontWeight: 500,
                      lineHeight: 'var(--Line-height-text-md, 24px)'
                    }}
                  >
                    Trạng thái hiển thị
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'help' }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
                
                <div className="custom-select-container" ref={statusRef} style={{ width: '100%', position: 'relative' }}>
                  <div 
                    className={`select-custom ${isStatusOpen ? 'open' : ''}`} 
                    onClick={() => setIsStatusOpen(!isStatusOpen)} 
                    style={{ 
                      display: 'flex',
                      padding: 'var(--spacing-md, 8px) var(--spacing-lg, 12px)',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--spacing-md, 8px)',
                      alignSelf: 'stretch',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--Colors-Border-border-primary, #D5D7DA)',
                      background: 'var(--Colors-Background-bg-primary, #FFF)',
                      boxShadow: '0 1px 2px 0 var(--Colors-Effects-Shadows-shadow-xs, rgba(10, 13, 18, 0.05))',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                      width: '100%'
                    }}
                  >
                    <span style={{ color: '#1A191B', fontWeight: 500 }}>
                      {isActive === false ? 'Ẩn' : 'Hiển thị'}
                    </span>
                    
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isStatusOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                      <path d="M5 7.5L10 12.5L15 7.5" />
                    </svg>
                  </div>
                  
                  {isStatusOpen && (
                    <div className="custom-options-list" style={{ zIndex: 50 }}>
                      <div 
                        className={`custom-option ${isActive === false ? 'selected' : ''}`} 
                        onClick={() => { setIsActive(false); setIsStatusOpen(false); }}
                      >
                        Ẩn
                      </div>
                      <div 
                        className={`custom-option ${isActive === true ? 'selected' : ''}`} 
                        onClick={() => { setIsActive(true); setIsStatusOpen(false); }}
                      >
                        Hiển thị
                      </div>
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
                  {businessData.comments && businessData.comments.length > 0 ? (
                    businessData.comments.map((c: any, index: number) => (
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
                        {index < businessData.comments.length - 1 && <hr className="commentDivider" />}
                      </React.Fragment>
                    ))
                  ) : (
                    <div className="no-comments">Chưa có bình luận hay phản hồi nào cho nghiệp vụ này.</div>
                  )}
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DetailBusinessPage;