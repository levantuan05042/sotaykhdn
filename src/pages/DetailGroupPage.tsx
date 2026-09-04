import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import './DetailGroupPage.css';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/apiConfig';
import { getUserMap, getFullName } from '../utils/userUtils';
import ProductInfoCard from '../components/ui/ProductInfoCard';
import StatusBadge2 from '../components/ui/StatusBadge2';

const GROUP_OPTIONS = [
  { label: 'Sản phẩm dịch vụ', value: 'SERVICE' },
  { label: 'Sản phẩm bảo hiểm', value: 'INSURANCE' },
  { label: 'Chương trình ưu đãi', value: 'PROGRAM' }
];

const formatDateTime = (dateString: string) => {
  if (!dateString) return '---';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const extractBaseId = (username: string) => {
  if (!username) return '';
  return username.split('_')[0].trim();
};

const getCurrentUsername = () => {
  const possibleKeys = ['currentUserUsername', 'username', 'userCode', 'userId', 'account', 'user', 'userInfo', 'currentUser'];
  for (const key of possibleKeys) {
    const val = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (val) {
      try {
        const parsed = JSON.parse(val);
        if (typeof parsed === 'object' && parsed !== null) {
          const u = parsed.username || parsed.userName || parsed.code || parsed.sub || parsed.userCode;
          if (u) return String(u).trim().toLowerCase();
        }
      } catch {
        return String(val).trim().toLowerCase();
      }
    }
  }
  return '';
};

const DetailGroupPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const statusRef = useRef<HTMLDivElement>(null);
  
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isOpen, setIsOpen] = useState(false); 
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
  const userMap = useMemo(() => getUserMap(), []);

  const currentUsername = getCurrentUsername();
  const isLoggedIn = Boolean(currentUsername);

  // Xử lý thông tin người tạo
  const creatorField = productData?.createdBy || productData?.created_by || productData?.creator;
  let creatorUsername = '';
  if (typeof creatorField === 'object' && creatorField !== null) {
    creatorUsername = (creatorField.username || creatorField.userName || creatorField.name || creatorField.code || '').trim().toLowerCase();
  } else if (creatorField !== undefined && creatorField !== null) {
    creatorUsername = String(creatorField).trim().toLowerCase();
  }

  const baseCreatorUsername = creatorUsername ? creatorUsername.split('_')[0] : '';
  const baseCurrentUsername = currentUsername ? currentUsername.split('_')[0] : '';

  // Kiểm tra quyền sở hữu sản phẩm
  const isOwner = Boolean(
    isLoggedIn && 
    baseCurrentUsername && 
    baseCreatorUsername && 
    baseCurrentUsername === baseCreatorUsername
  );

  // Điều kiện không cho phép chỉnh sửa: không phải chủ sở hữu, hoặc đang ở trạng thái PENDING_APPROVAL / ARCHIVED
  const isInputDisabled = !isOwner || productData?.status === 'PENDING_APPROVAL' || productData?.status === 'ARCHIVED';

  const [formData, setFormData] = useState({
    name: '',
    superGroup: ''
  });

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await fetch(API_ENDPOINTS.PRODUCT_GROUPS.DETAIL(id));
        if (!response.ok) throw new Error("Không thể tải thông tin nhóm sản phẩm");

        const data = await response.json();
        setProductData(data);
        setFormData({
          name: data.name || '',
          superGroup: data.superGroup || ''
        });
        setIsActive(data.active ?? true);
      } catch (error) {
        toast.error("Không tìm thấy dữ liệu nhóm sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  // Kiểm tra dữ liệu đã bị thay đổi so với dữ liệu gốc ban đầu hay chưa
  const isModified = useMemo(() => {
    if (!productData) return false;
    const originalName = productData.name || '';
    const originalSuperGroup = productData.superGroup || '';
    const originalActive = productData.active ?? true;

    return (
      formData.name.trim() !== originalName.trim() ||
      formData.superGroup !== originalSuperGroup ||
      isActive !== originalActive
    );
  }, [formData, isActive, productData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isInputDisabled) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGoBack = () => navigate('/product-groups');

  const handleUpdateGroup = async (status: 'ARCHIVED' | 'PENDING_APPROVAL' | 'DRAFT' | 'ACTIVE' | 'NEEDS_REVISION') => {
    if (isInputDisabled || !id) return;

    if (status !== 'ARCHIVED' && status !== 'ACTIVE') {
      if (!formData.name.trim()) {
        toast.error("Vui lòng nhập tên nhóm sản phẩm", { position: 'top-center' });
        return;
      }
      if (!formData.superGroup) {
        toast.error("Vui lòng chọn loại nhóm lớn", { position: 'top-center' });
        setIsOpen(true);
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PRODUCT_GROUPS.UPDATE(id), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: formData.name || productData.name,
          superGroup: formData.superGroup || productData.superGroup,
          active: isActive,
          status
        }),
      });

      if (response.ok) {
        let message = '';
        switch (status) {
          case 'DRAFT': 
          case 'NEEDS_REVISION':
            message = "Lưu nháp nhóm sản phẩm thành công"; break;
          case 'ARCHIVED': message = "Lưu trữ nhóm sản phẩm thành công"; break;
          case 'ACTIVE': message = "Kích hoạt nhóm sản phẩm hoạt động trở lại thành công"; break;
          case 'PENDING_APPROVAL': message = "Gửi phê duyệt nhóm sản phẩm thành công"; break;
          default: message = "Cập nhật nhóm sản phẩm thành công";
        }
        renderCustomToast(message);
        setTimeout(() => navigate('/product-groups'), 2000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Có lỗi xảy ra khi cập nhật', { position: 'top-center' });
        setLoading(false);
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
      setLoading(false);
    }
  };

  const handleDeleteGroup = () => {
    if (isInputDisabled || !id) return;

    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} confirm-toast-card`}>
        <div className="confirm-toast-body">
          <div className="confirm-toast-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" viewBox="0 0 17 19" fill="none">
              <path d="M0.835938 4.16829H2.5026M2.5026 4.16829H15.8359M2.5026 4.16829V15.835C2.5026 16.277 2.6782 16.7009 2.99076 17.0135C3.30332 17.326 3.72724 17.5016 4.16927 17.5016H12.5026C12.9446 17.5016 13.3686 17.326 13.6811 17.0135C13.9937 16.7009 14.1693 16.277 14.1693 15.835V4.16829H2.5026ZM5.0026 4.16829V2.50163C5.0026 2.0596 5.1782 1.63568 5.49076 1.32312C5.80332 1.01056 6.22724 0.834961 6.66927 0.834961H10.0026C10.4446 0.834961 10.8686 1.01056 11.1811 1.32312C11.4937 1.63568 11.6693 2.0596 11.6693 2.50163V4.16829M6.66927 8.33496V13.335M10.0026 8.33496V13.335" stroke="#AE1C3F" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="confirm-toast-content">
            <p className="confirm-toast-title">Xác nhận xóa nhóm sản phẩm</p>
            <p className="confirm-toast-desc">Bạn có chắc chắn muốn xóa nhóm sản phẩm này không? Hành động này không thể hoàn tác.</p>
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
    if (isInputDisabled || !id) return;
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PRODUCT_GROUPS.DELETE(id), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (response.ok) {
        renderCustomToast("Xóa nhóm sản phẩm thành công");
        setTimeout(() => navigate('/product-groups'), 2000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Có lỗi xảy ra khi xóa', { position: 'top-center' });
        setLoading(false);
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
      setLoading(false);
    }
  };

  const handleUpdateDisplayStatus = async (newActiveStatus: boolean) => {
    if (isInputDisabled || !id) return;
    
    if (newActiveStatus === isActive) {
      setIsStatusOpen(false);
      return;
    }

    try {
      setLoading(true);
      const url = `${API_ENDPOINTS.PRODUCT_GROUPS.DETAIL(id)}/active?active=${newActiveStatus}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      const data = await response.json();

      if (response.ok) {
        setIsActive(newActiveStatus);
        setIsStatusOpen(false);
        toast.success("Cập nhật trạng thái hiển thị thành công", { position: 'top-center' });
      } else {
        if (!newActiveStatus) { 
          renderCannotHideToast(formData.name || productData.name);
        } else {
          toast.error(data.message || 'Không thể cập nhật trạng thái', { position: 'top-center' });
        }
        setIsStatusOpen(false);
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
      setIsStatusOpen(false);
    } finally {
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

  const renderCannotHideToast = (groupName: string) => {
    toast.custom((t) => 
      createPortal(
        <div className="warning-toast-wrapper">
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} warning-toast-card`}>
            <div className="warning-toast-icon-container">
              <div className="warning-bg-outer"></div>
              <div className="warning-bg-inner"></div>
              <svg 
                className="warning-toast-icon" 
                width="40" height="40" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  fillRule="evenodd" 
                  clipRule="evenodd" 
                  d="M10.2943 3.65586C11.0478 2.34807 12.9522 2.34807 13.7057 3.65586L21.6575 17.4526C22.4116 18.761 21.4651 20.4001 19.9517 20.4001H4.0483C2.53489 20.4001 1.58842 18.761 2.34251 17.4526L10.2943 3.65586Z" 
                  fill="#EAB308"
                />
                <path d="M12 8.5V13.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1.5" fill="#FFFFFF"/>
              </svg>
            </div>
            
            <h3 className="warning-toast-title">
              Không thể ẩn nhóm: "{groupName}"
            </h3>
            <p className="warning-toast-desc">
              Nhóm sản phẩm này đang chứa các danh mục hoặc sản phẩm bên trong.
            </p>
            
            <div className="warning-toast-actions">
              <button className="warning-btn-close" onClick={() => toast.dismiss(t.id)}>
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    , { duration: Infinity, id: 'cannot-hide-toast' }); 
  };

  if (loading) return <div className="loading">Đang tải dữ liệu nhóm sản phẩm...</div>;
  if (!productData) return <div className="error">Không tìm thấy dữ liệu nhóm sản phẩm phù hợp.</div>;

  const getCreatorDisplayName = () => {
    if (productData?.createdByFullName) {
      return productData.createdByFullName;
    }
    if (creatorUsername) {
      const baseId = baseCreatorUsername || extractBaseId(creatorUsername);
      const mapped = getFullName(baseId, userMap);
      if (mapped && mapped.toLowerCase() !== baseId.toLowerCase()) {
        return mapped;
      }
      return baseId.toUpperCase();
    }
    return '---';
  };

  const getApproverDisplayName = () => {
    if (productData?.approvedByFullName) return productData.approvedByFullName;
    if (productData?.approvedBy && productData.approvedBy === productData?.createdBy && productData?.createdByFullName) {
      return productData.createdByFullName;
    }
    if (productData?.approvedBy) {
      const baseId = extractBaseId(productData.approvedBy);
      const mapped = getFullName(baseId, userMap);
      if (mapped && mapped.toLowerCase() !== baseId.toLowerCase()) return mapped;
      return baseId.toUpperCase();
    }
    return '---';
  };

  return (
    <div className="pageWrapper">
      <div className="mainContainer">
        {/* Chỉ hiển thị banner nếu KHÔNG PHẢI người tạo (không hiển thị nếu là người tạo đang chờ duyệt) */}
        {!isOwner && (
          <div className="permissionBanner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span className="permissionBannerText">
              Bạn đang xem ở chế độ chỉ đọc (Read-only) vì bạn không phải là người tạo sản phẩm này.
            </span>
          </div>
        )}

        <div className="header">
          <div className="headerLeft">
            <button className="btnBack" onClick={handleGoBack}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12.6667 6.83333H1M6.83333 1L1 6.83333L6.83333 12.6667" stroke="#3C393F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="breadcrumbText">Nhóm sản phẩm</span>
            </button>

            <div className="breadcrumb">
              <div className="separatorWrapper">
                <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                  <path d="M0.5 8.5L4.5 4.5L0.5 0.5" stroke="#171717" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <span className="breadcrumbActive breadcrumb-truncate" title={productData.name}>
                {productData.name}
              </span>

              <div style={{ marginLeft: '12px', flexShrink: 0 }}>
                <StatusBadge2 status={productData.status} />
              </div>
            </div>
          </div>

          <div className="headerRight" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isOwner ? null : (
              <>
                {productData.status === 'DRAFT' && (
                  <>
                    <button className="btnDraft" onClick={handleDeleteGroup} style={{ display: 'flex', padding: '8px 14px', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '8px', background: '#E3DFE6', border: 'none', cursor: 'pointer', color: '#AE1C3F', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: '600', lineHeight: '20px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="16.667" viewBox="0 0 17 19" fill="none">
                        <path d="M0.835938 4.16829H2.5026M2.5026 4.16829H15.8359M2.5026 4.16829V15.835C2.5026 16.277 2.6782 16.7009 2.99076 17.0135C3.30332 17.326 3.72724 17.5016 4.16927 17.5016H12.5026C12.9446 17.5016 13.3686 17.326 13.6811 17.0135C13.9937 16.7009 14.1693 16.277 14.1693 15.835V4.16829H2.5026ZM5.0026 4.16829V2.50163C5.0026 2.0596 5.1782 1.63568 5.49076 1.32312C5.80332 1.01056 6.22724 0.834961 6.66927 0.834961H10.0026C10.4446 0.834961 10.8686 1.01056 11.1811 1.32312C11.4937 1.63568 11.6693 2.0596 11.6693 2.50163V4.16829M6.66927 8.33496V13.335M10.0026 8.33496V13.335" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Xóa
                    </button>
                    <button className="btnDraft active" onClick={() => handleUpdateGroup('DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                      Lưu nháp
                    </button>
                    <button className="btnSubmit active" onClick={() => handleUpdateGroup('PENDING_APPROVAL')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Gửi phê duyệt
                    </button>
                  </>
                )}

                {/* Khi ở trạng thái ĐÃ DUYỆT (ACTIVE), các nút chỉ sáng lên khi có sự thay đổi dữ liệu (isModified === true) */}
                {productData.status === 'ACTIVE' && (
                  <>
                    <button 
                      className="btnDraft" 
                      disabled={!isModified} 
                      onClick={() => handleUpdateGroup('DRAFT')} 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                      Lưu nháp
                    </button>
                    <button 
                      className="btnSubmit" 
                      disabled={!isModified} 
                      onClick={() => handleUpdateGroup('PENDING_APPROVAL')} 
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Gửi phê duyệt
                    </button>
                  </>
                )}

                {productData.status === 'NEEDS_REVISION' && (
                  <>
                    <button className="btnDraft active" onClick={() => handleUpdateGroup('NEEDS_REVISION')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                      Lưu nháp
                    </button>
                    <button className="btnSubmit active" onClick={() => handleUpdateGroup('PENDING_APPROVAL')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Gửi phê duyệt
                    </button>
                  </>
                )}

                {productData.status === 'ARCHIVED' && (
                  <button className="btnRestore active" onClick={() => handleUpdateGroup('ACTIVE')} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#115e59', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Hoạt động trở lại
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="contentGrid">
          <div className="leftCol">
            <div className="formCard">
              <div className="formGroup">
                <label className="label">Thuộc nhóm lớn *</label>
                <div className="custom-select-container">
                  <div 
                    className={`select-custom ${isOpen ? 'open' : ''}`} 
                    onClick={() => !isInputDisabled && setIsOpen(!isOpen)}
                    style={{ 
                      opacity: isInputDisabled ? 0.7 : 1, 
                      cursor: isInputDisabled ? 'not-allowed' : 'pointer',
                      backgroundColor: isInputDisabled ? '#F9FAFB' : '#FFF'
                    }}
                  >
                    <span>{GROUP_OPTIONS.find(o => o.value === formData.superGroup)?.label || "Chọn nhóm lớn"}</span>
                    {!isInputDisabled && (
                      <svg 
                        width="10" height="6" viewBox="0 0 10 6" fill="none" 
                        className={`arrow-icon ${isOpen ? 'up' : ''}`}
                      >
                        <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {!isInputDisabled && isOpen && (
                    <div className="custom-options-list">
                      {GROUP_OPTIONS.map((opt) => (
                        <div key={opt.value} className={`custom-option ${formData.superGroup === opt.value ? 'selected' : ''}`}
                          onClick={() => { setFormData({...formData, superGroup: opt.value}); setIsOpen(false); }}>
                          <span>{opt.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="formGroup">
                <label className="label">Tên nhóm sản phẩm</label>
                <input 
                  type="text" 
                  name="name" 
                  className="input" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  readOnly={isInputDisabled}
                  disabled={isInputDisabled}
                  style={{ backgroundColor: isInputDisabled ? '#F9FAFB' : '#FFF', cursor: isInputDisabled ? 'not-allowed' : 'text' }}
                />
              </div>

            </div>
          </div>

          <div className="rightCol" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="formCard" style={{ borderRadius: 12, background: 'var(--Mauve-3, #F2EFF3)', display: 'flex', width: 340, padding: 24, flexDirection: 'column', alignItems: 'flex-start', gap: 10, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#1A191B', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>Trạng thái hiển thị</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'help' }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div className="custom-select-container" ref={statusRef} style={{ width: '100%', position: 'relative' }}>
                <div 
                  className={`select-custom ${isStatusOpen ? 'open' : ''}`} 
                  onClick={() => !isInputDisabled && setIsStatusOpen(v => !v)}
                  style={{ display: 'flex', padding: '8px 12px', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 8, border: '1px solid #D5D7DA', background: isInputDisabled ? '#F9FAFB' : '#FFF', boxShadow: '0 1px 2px rgba(10,13,18,0.05)', cursor: isInputDisabled ? 'not-allowed' : 'pointer', width: '100%', boxSizing: 'border-box' }}
                >
                  <span style={{ color: '#1A191B', fontWeight: 500 }}>{isActive === false ? 'Ẩn' : 'Hiển thị'}</span>
                  {!isInputDisabled && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isStatusOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path d="M5 7.5L10 12.5L15 7.5"/>
                    </svg>
                  )}
                </div>
                {!isInputDisabled && isStatusOpen && (
                  <div className="custom-options-list" style={{ zIndex: 50 }}>
                    <div 
                      className={`custom-option ${isActive === false ? 'selected' : ''}`} 
                      onClick={() => handleUpdateDisplayStatus(false)}
                    >
                      Ẩn
                    </div>
                    <div 
                      className={`custom-option ${isActive === true  ? 'selected' : ''}`} 
                      onClick={() => handleUpdateDisplayStatus(true)}
                    >
                      Hiển thị
                    </div>
                  </div>
                )}
              </div>
            </div>

            <ProductInfoCard 
              creatorName={getCreatorDisplayName()} 
              approverName={getApproverDisplayName()} 
              createdAt={formatDateTime(productData.createdAt)} 
              version={productData.version} 
            />

            <div className="commentCard">
              <div className="commentHeader">
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.071 18.0698C15.0159 21.1264 10.4896 21.7867 6.78631 20.074C6.23961 19.8539 2.70113 20.8339 1.93334 20.067C1.16555 19.2991 2.14639 15.7601 1.92631 15.2134C0.212846 11.5106 0.874111 6.9826 3.9302 3.9271C7.83147 0.0243001 14.1698 0.0243001 18.071 3.9271C21.9803 7.83593 21.9723 14.1681 18.071 18.0698Z" stroke="#AE1C3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="commentTitle">Bình luận phản hồi</span>
              </div>
              <div className="commentList">
                {productData.comments && productData.comments.length > 0 ? (
                  productData.comments.map((c: any, index: number) => (
                    <React.Fragment key={c.id || index}>
                      <div className="commentItem">
                        <div className="userInfo">
                          <img src={c.avatarUrl || "https://images.squarespace-cdn.com/content/v1/61da6bc18e4e00423cffe684/1765779011140-U85TJYNQM9M24A5RQOZW/Leo+nui.png"} className="avatar" alt="avatar" />
                          <div style={{ flex: 1 }}>
                            <div className="userHeader">
                              <span className="userName">
                                {getFullName(c.createdBy, userMap) || c.createdBy || 'Người kiểm duyệt'}
                              </span>
                              <span className="commentDate">{formatDateTime(c.createdAt)}</span>
                            </div>
                            <p className="commentText">{c.comment}</p>
                          </div>
                        </div>
                      </div>
                      {index < productData.comments.length - 1 && <hr className="commentDivider" />}
                    </React.Fragment>
                  ))
                ) : (
                  <div className="no-comments">Chưa có bình luận hay phản hồi nào cho nhóm sản phẩm này.</div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DetailGroupPage;