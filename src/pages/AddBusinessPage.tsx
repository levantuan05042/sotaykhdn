import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './DetailGroupPage.css';
import toast from 'react-hot-toast';
import axios from 'axios';

import { API_ENDPOINTS } from '../config/apiConfig';

const AddBusinessPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Trạng thái Dropdown Danh mục sản phẩm
  const [isOpen, setIsOpen] = useState(false); 
  const categoryRef = useRef<HTMLDivElement>(null); // Bổ sung ref để xử lý click outside
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Trạng thái Dropdown Trạng thái hiển thị
  const [isStatusOpen, setIsStatusOpen] = useState(false); 
  const statusRef = useRef<HTMLDivElement>(null); 
  const [isActive, setIsActive] = useState<boolean>(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false); // State chống click đúp

  const [formData, setFormData] = useState({
    name: '',
    productCategoryId: ''
  });

  // Fetch dữ liệu danh mục
  useEffect(() => {
    const fetchActiveCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await axios.get(API_ENDPOINTS.PRODUCT_CATEGORY.LIST, {
          params: { status: 'ACTIVE', active: true }
        });
        
        const options = response.data.map((c: any) => ({
          label: c.name,
          value: c.id
        }));
        setCategoryOptions(options);
      } catch (error) {
        console.error("Lỗi fetch categories:", error);
        toast.error("Không thể tải danh sách danh mục");
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchActiveCategories();
  }, []);

  // Xử lý tự động đóng Dropdown khi click ra ngoài màn hình
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGoBack = () => navigate('/business-management');

  const handleCreateBusiness = async (status: 'DRAFT' | 'PENDING_APPROVAL') => {
    if (!formData.name.trim() || !formData.productCategoryId) {
      toast.error("Vui lòng nhập tên nghiệp vụ và chọn danh mục", { position: 'top-center' });
      return;
    }

    if (isSubmitting) return; // Chặn nếu đang gọi API

    try {
      setIsSubmitting(true);
      
      await axios.post(API_ENDPOINTS.PRODUCT_BUSINESS.LIST, {
        name: formData.name.trim(),
        productCategoryId: formData.productCategoryId,
        status,
        active: isActive 
      });

      const message = status === 'DRAFT' ? "Lưu nháp nghiệp vụ thành công" : "Gửi phê duyệt nghiệp vụ thành công";
      renderCustomToast(message);
      setTimeout(() => navigate('/business-management'), 2000);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra khi tạo nghiệp vụ';
      toast.error(errorMessage, { position: 'top-center' });
    } finally {
      setIsSubmitting(false); // Reset trạng thái khi xong (hoặc lỗi)
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

  // LOGIC SÁNG NÚT: Bất kỳ trường nào thay đổi so với mặc định
  const isFormDirty = 
    formData.name.trim() !== '' || 
    formData.productCategoryId !== '' || 
    isActive !== true;

  // Nút sẽ sáng nếu form đã thay đổi VÀ không ở trạng thái đang submit
  const canSubmit = isFormDirty && !isSubmitting; 

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
              <span className="breadcrumbText">Quản lý nghiệp vụ</span>
            </button>

            <div className="breadcrumb">
              <div className="separatorWrapper">
                <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                  <path d="M0.5 8.5L4.5 4.5L0.5 0.5" stroke="#171717" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="breadcrumbActive">Tạo mới nghiệp vụ</span>
            </div>
          </div>

          <div className="headerRight">
            <button 
              className={`btnDraft ${canSubmit ? 'active' : 'disabled'}`} 
              disabled={!canSubmit} 
              onClick={() => handleCreateBusiness('DRAFT')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }} 
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 8V21H3V8M1 3H23V8H1V3ZM10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isSubmitting ? 'Đang xử lý...' : 'Lưu nháp'}
            </button>
            <button 
              className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} 
              disabled={!canSubmit} 
              onClick={() => handleCreateBusiness('PENDING_APPROVAL')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }} 
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isSubmitting ? 'Đang xử lý...' : 'Gửi phê duyệt'}
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="contentGrid">
          <div className="leftCol">
            <div className="formCard">
              
              {/* DROPDOWN CHỌN DANH MỤC SẢN PHẨM */}
              <div className="formGroup" ref={categoryRef}>
                <label className="label">Danh mục sản phẩm *</label>
                <div className="custom-select-container">
                  <div className={`select-custom ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                    <span>
                      {loadingCategories 
                        ? "Đang tải danh mục sản phẩm..." 
                        : (categoryOptions.find(o => o.value === formData.productCategoryId)?.label || "Chọn danh mục")}
                    </span>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`arrow-icon ${isOpen ? 'up' : ''}`}>
                      <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {isOpen && (
                    <div className="custom-options-list">
                      {categoryOptions.length === 0 ? (
                        <div className="custom-option disabled">Không có danh mục sản phẩm nào khả dụng</div>
                      ) : (
                        categoryOptions.map((opt) => (
                          <div key={opt.value} className={`custom-option ${formData.productCategoryId === opt.value ? 'selected' : ''}`}
                            onClick={() => { setFormData({...formData, productCategoryId: opt.value}); setIsOpen(false); }}>
                            <span>{opt.label}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* INPUT TÊN NGHIỆP VỤ */}
              <div className="formGroup">
                <label className="label">Tên nghiệp vụ *</label>
                <input 
                  type="text" 
                  name="name" 
                  className="input" 
                  placeholder="Nhập tên nghiệp vụ..."
                  value={formData.name} 
                  onChange={handleInputChange} 
                />
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
                  Bình luận sẽ hiển thị sau khi nghiệp vụ được khởi tạo.
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBusinessPage;