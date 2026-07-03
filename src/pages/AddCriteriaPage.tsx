import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './DetailGroupPage.css'; // Dùng chung CSS để đồng bộ giao diện
import toast from 'react-hot-toast';
import axios from 'axios';

import { API_ENDPOINTS } from '../config/apiConfig';

const AddCriteriaPage: React.FC = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false); 
  const statusRef = useRef<HTMLDivElement>(null); 
  const [isActive, setIsActive] = useState<boolean>(true);
  // --- STATES ---
  const [isOpen, setIsOpen] = useState(false); 
  const [groupOptions, setGroupOptions] = useState<{ label: string; value: string }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // State lưu từ khóa tìm kiếm nhóm

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    groupIds: [] as string[],
    required: false,
    active: true // Đưa vào đây
  });

  // --- EFFECT: ĐÓNG DROPDOWN KHI BẤM RA NGOÀI ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- EFFECT: RESET TỪ KHÓA TÌM KIẾM KHI ĐÓNG DROPDOWN ---
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchActiveGroups = async () => {
      try {
        setLoadingGroups(true);
        // Sử dụng axios.get với params
        const response = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
          params: { status: 'ACTIVE', active: true }
        });

        const options = response.data.map((g: any) => ({
          label: g.name,
          value: g.id
        }));
        setGroupOptions(options);
      } catch (error) {
        console.error("Lỗi fetch groups:", error);
        toast.error("Không thể tải danh sách nhóm sản phẩm");
      } finally {
        setLoadingGroups(false);
      }
    };

    fetchActiveGroups();
  }, []);

  // --- XỬ LÝ SỰ KIỆN BIẾN ĐỔI INPUT (TÊN & MÃ) ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 2. THÊM HÀM XỬ LÝ SỰ KIỆN TOGGLE CHECKBOX REQUIRED
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  // Toggle chọn hoặc bỏ chọn MỘT nhóm sản phẩm
  const handleToggleGroup = (id: string) => {
    setFormData(prev => {
      const isExist = prev.groupIds.includes(id);
      const updatedIds = isExist 
        ? prev.groupIds.filter(item => item !== id)
        : [...prev.groupIds, id];
      return { ...prev, groupIds: updatedIds };
    });
  };

  // Xử lý click chọn TẤT CẢ hoặc BỎ CHỌN TẤT CẢ
  const handleToggleSelectAll = () => {
    setFormData(prev => {
      if (prev.groupIds.length === groupOptions.length) {
        return { ...prev, groupIds: [] };
      } else {
        const allIds = groupOptions.map(opt => opt.value);
        return { ...prev, groupIds: allIds };
      }
    });
  };

  const handleGoBack = () => navigate('/criteria-management');

  // --- HÀM HIỂN THỊ LABELS NHÓM ĐÃ CHỌN ---
  const getSelectedGroupsLabel = () => {
    if (loadingGroups) return "Đang tải nhóm sản phẩm...";
    if (formData.groupIds.length === 0) return "Chọn nhóm sản phẩm áp dụng";
    if (formData.groupIds.length === groupOptions.length) return "Tất cả nhóm sản phẩm";
    
    const selectedLabels = groupOptions
      .filter(opt => formData.groupIds.includes(opt.value))
      .map(opt => opt.label);

    if (selectedLabels.length <= 3) {
      return selectedLabels.join(', ');
    }
    
    const firstThree = selectedLabels.slice(0, 3).join(', ');
    const remainingCount = selectedLabels.length - 3;
    return `${firstThree} và ${remainingCount} nhóm khác`;
  };

  // --- HÀM TẠO MỚI TIÊU CHÍ (VALIDATE + API CALL) ---
  const handleCreateCriteria = async (status: 'DRAFT' | 'PENDING_APPROVAL') => {
    // Validate
    if (!formData.code.trim()) {
      toast.error("Vui lòng nhập mã tiêu chí", { position: 'top-center' });
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên tiêu chí", { position: 'top-center' });
      return;
    }
    if (formData.groupIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một nhóm sản phẩm áp dụng", { position: 'top-center' });
      return;
    }

    try {
      // Gọi API qua Axios
      await axios.post(API_ENDPOINTS.PRODUCT_CRITERIA.LIST, {
        code: formData.code.trim(),
        name: formData.name.trim(),
        groupIds: formData.groupIds,
        status,
        required: formData.required,
        active: isActive
      });

      const message = status === 'DRAFT' ? "Lưu nháp tiêu chí thành công" : "Gửi phê duyệt tiêu chí thành công";
      renderCustomToast(message);
      setTimeout(() => navigate('/criteria-management'), 2000);

    } catch (error: any) {
      console.error("Lỗi API:", error);
      // Lấy thông báo lỗi từ backend nếu có
      const errorMessage = error.response?.data?.message || 'Mã hoặc tên tiêu chí đã tồn tại trên hệ thống';
      toast.error(errorMessage, { position: 'top-center' });
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

  // Nút sẽ sáng nếu BẤT KỲ TRƯỜNG NÀO CÓ DỮ LIỆU
  const isFormValid = 
      formData.code.trim() !== '' || 
      formData.name.trim() !== '' || 
      formData.groupIds.length > 0 ||
      formData.required !== false || 
      formData.active !== true;      

  // Lọc mảng option dựa trên từ khóa search nhập vào công cụ lọc
  const filteredOptions = groupOptions.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Xác định trạng thái checkbox "Tất cả" dựa trên tổng số lượng options
  const isAllSelected = groupOptions.length > 0 && formData.groupIds.length === groupOptions.length;

  return (
    <div className="pageWrapper">
      <div className="mainContainer">
        
        {/* HEADER */}
        <div className="header">
          <div className="headerLeft">
            <button className="btnBack" onClick={handleGoBack}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12.6667 6.83333H1M6.83333 1L1 6.83333L6.83333 12.6667" stroke="#3C393F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="14.379" height="14.375" viewBox="0 0 16 16" fill="none">
                <path d="M11.3789 4.5H11.3714M1.18641 9.3075L6.56391 14.685C6.70322 14.8245 6.86865 14.9351 7.05075 15.0106C7.23284 15.0106 7.42803 15.1249 7.62516 15.1249C7.82228 15.1249 8.01747 15.0861 8.19957 15.0106C8.38166 14.9351 8.5471 14.8245 8.68641 14.685L15.1289 8.25V0.75H7.62891L1.18641 7.1925C0.90703 7.47354 0.750217 7.85372 0.750217 8.25C0.750217 8.64628 0.90703 9.02646 1.18641 9.3075Z" stroke="#171717" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="breadcrumbText">Tiêu chí sản phẩm</span>
            </button>

            <div className="breadcrumb">
              <div className="separatorWrapper">
                <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                  <path d="M0.5 8.5L4.5 4.5L0.5 0.5" stroke="#171717" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="breadcrumbActive">Tạo mới tiêu chí</span>
            </div>
          </div>

          <div className="headerRight">
            <button 
              className={`btnDraft ${isFormValid ? 'active' : 'disabled'}`} 
              disabled={!isFormValid} 
              onClick={() => handleCreateCriteria('DRAFT')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }} 
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 8V21H3V8M1 3H23V8H1V3ZM10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Lưu nháp
            </button>
            <button 
              className={`btnSubmit ${isFormValid ? 'active' : 'disabled'}`} 
              disabled={!isFormValid} 
              onClick={() => handleCreateCriteria('PENDING_APPROVAL')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }} 
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Gửi phê duyệt
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="contentGrid">
          <div className="leftCol">
            <div className="formCard">

              {/* INPUT MÃ TIÊU CHÍ (CODE) */}
              <div className="formGroup">
                <label className="label">Mã tiêu chí *</label>
                <input 
                  type="text" 
                  name="code" 
                  className="input" 
                  placeholder="Nhập mã tiêu chí..."
                  value={formData.code} 
                  onChange={handleInputChange} 
                />
              </div>

              {/* INPUT TÊN TIÊU CHÍ */}
              <div className="formGroup">
                <label className="label">Tên tiêu chí *</label>
                <input 
                  type="text" 
                  name="name" 
                  className="input" 
                  placeholder="Nhập tên tiêu chí..."
                  value={formData.name} 
                  onChange={handleInputChange} 
                />
              </div>
              
              {/* DROPDOWN CHỌN NHIỀU NHÓM SẢN PHẨM */}
              <div className="formGroup" ref={dropdownRef}>
                <label className="label">Nhóm sản phẩm áp dụng *</label>
                <div className="custom-select-container">
                  <div className={`select-custom ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                      {getSelectedGroupsLabel()}
                    </span>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`arrow-icon ${isOpen ? 'up' : ''}`}>
                      <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {isOpen && (
                    <div className="custom-options-list" style={{ padding: 0 }}>
                      
                      {/* 1. THANH TÌM KIẾM TRONG DROPDOWN */}
                      <div className="dropdown-search-wrapper" style={{ padding: '8px', borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
                        <input
                          type="text"
                          className="input"
                          placeholder="Tìm kiếm nhóm sản phẩm..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ padding: '6px 12px', fontSize: '14px', width: '100%', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #D1D5DB' }}
                        />
                      </div>

                      {/* 2. CHECKBOX TẤT CẢ */}
                      {groupOptions.length > 0 && !searchTerm && (
                        <div 
                          className="custom-option select-all-option"
                          onClick={handleToggleSelectAll}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB', fontWeight: '500' }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isAllSelected}
                            onChange={() => {}} 
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          <span style={{ fontSize: '14px', color: '#111827' }}>Tất cả nhóm sản phẩm</span>
                        </div>
                      )}

                      {/* 3. VÙNG CUỘN HIỂN THỊ OPTIONS */}
                      <div className="options-scroll-area" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredOptions.length === 0 ? (
                          <div className="custom-option disabled" style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '14px' }}>
                            Không tìm thấy nhóm sản phẩm phù hợp
                          </div>
                        ) : (
                          filteredOptions.map((opt) => {
                            const isChecked = formData.groupIds.includes(opt.value);
                            return (
                              <div 
                                key={opt.value} 
                                className={`custom-option ${isChecked ? 'selected' : ''}`}
                                onClick={() => handleToggleGroup(opt.value)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '10px 12px' }}
                              >
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={() => {}} 
                                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                                <span style={{ fontSize: '14px', color: '#1F2937' }}>{opt.label}</span>
                              </div>
                            );
                          })
                        )}
                      </div>

                    </div>
                  )}
                </div>
              </div>

              {/* 4. THÊM Ô CHECKBOX "BẮT BUỘC" VÀO ĐÂY */}
              <div className="formGroup" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '15px', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  id="required"
                  name="required"
                  checked={formData.required}
                  onChange={handleCheckboxChange}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="required" style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: 'pointer', userSelect: 'none' }}>
                  Đây là tiêu chí bắt buộc
                </label>
              </div>

            </div>
          </div>
          
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
             <div className="commentCard emptyComment">
                <div className="commentHeader">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M21 11.5C21 16.1944 17.1944 20 12.5 20C11.1327 20 9.84307 19.6765 8.7033 19.1022L3 21L4.8978 15.2967C4.32354 14.1569 4 12.8673 4 11.5C4 6.80558 7.80558 3 12.5 3C17.1944 3 21 6.80558 21 11.5Z" stroke="#AE1C3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="commentTitle">Bình luận</span>
                </div>
                <div className="emptyStateText">
                  Bình luận sẽ hiển thị sau khi tiêu chí được khởi tạo.
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCriteriaPage;