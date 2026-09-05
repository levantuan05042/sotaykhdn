import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import './DetailGroupPage.css'; 
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/apiConfig';
import { getUserMap, getFullName } from '../utils/userUtils'; 
import ProductInfoCard from '../components/ui/ProductInfoCard';
import StatusBadge2 from '../components/ui/StatusBadge2';

const formatDateTime = (dateString: string) => {
  if (!dateString) return '---';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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

const extractBaseId = (username: string) => {
  if (!username) return '';
  return username.split('_')[0];
};

const DetailCategoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [categoryData, setCategoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const statusRef = useRef<HTMLDivElement>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [groupOptions, setGroupOptions] = useState<{ label: string; value: string }[]>([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
  
  const userMap = useMemo(() => getUserMap(), []);

  const currentUsername = getCurrentUsername();
  const isLoggedIn = Boolean(currentUsername);

  const creatorField = categoryData?.createdBy || categoryData?.created_by || categoryData?.creator;
  let creatorUsername = '';
  if (typeof creatorField === 'object' && creatorField !== null) {
    creatorUsername = (creatorField.username || creatorField.userName || creatorField.name || creatorField.code || '').trim().toLowerCase();
  } else if (creatorField !== undefined && creatorField !== null) {
    creatorUsername = String(creatorField).trim().toLowerCase();
  }

  const baseCreatorUsername = creatorUsername ? creatorUsername.split('_')[0] : '';
  const baseCurrentUsername = currentUsername ? currentUsername.split('_')[0] : '';

  const isOwner = Boolean(
    isLoggedIn && 
    baseCurrentUsername && 
    baseCreatorUsername && 
    baseCurrentUsername === baseCreatorUsername
  );

  const isNotCreator = !isLoggedIn || !isOwner;
  const isFormReadOnly = isNotCreator || categoryData?.status === 'PENDING_APPROVAL';
  const isStatusActive = categoryData?.status === 'ACTIVE';
  const isDisplayStatusReadOnly = isNotCreator || !isStatusActive;

  const [formData, setFormData] = useState({
    name: '',
    groupId: ''
  });

  const getCreatorDisplayName = () => {
    if (categoryData?.createdByFullName) return categoryData.createdByFullName;
    if (creatorUsername) {
      const mapped = getFullName(creatorUsername, userMap);
      if (mapped && mapped.toLowerCase() !== creatorUsername.toLowerCase()) return mapped;
    }
    return creatorUsername ? creatorUsername.toUpperCase() : '---';
  };

  const getApproverDisplayName = () => {
    if (categoryData?.approvedByFullName) return categoryData.approvedByFullName;
    if (categoryData?.approvedBy && categoryData.approvedBy === categoryData?.createdBy && categoryData?.createdByFullName) {
      return categoryData.createdByFullName;
    }
    if (categoryData?.approvedBy) {
      const baseId = extractBaseId(categoryData.approvedBy);
      const mapped = getFullName(baseId, userMap);
      if (mapped && mapped.toLowerCase() !== baseId.toLowerCase()) return mapped;
      return baseId.toUpperCase();
    }
    return '---';
  };

  useEffect(() => {
    const initPageData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [detailRes, groupsRes] = await Promise.all([
          fetch(API_ENDPOINTS.PRODUCT_CATEGORY.DETAIL(id)),
          fetch(`${API_ENDPOINTS.PRODUCT_GROUPS.LIST}?status=ACTIVE&active=true`)
        ]);
        if (!detailRes.ok) throw new Error("Không thể tải thông tin danh mục");
        const detailData = await detailRes.json();
        setCategoryData(detailData);
        setFormData({
          name: detailData.name || '',
          groupId: detailData.groupId || ''
        });
        setIsActive(detailData.active ?? true);
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          const options = groupsData.map((g: any) => ({
            label: g.name,
            value: g.id
          }));
          setGroupOptions(options);
        } else {
          setGroupOptions([
            { label: detailData.groupName || 'Nhóm hiện tại', value: detailData.groupId },
          ]);
        }
      } catch (error) {
        toast.error("Không tìm thấy danh mục hoặc danh mục đã bị ẩn");
      } finally {
        setLoading(false);
      }
    };
    initPageData();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFormReadOnly) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGoBack = () => navigate('/product-category');

  const handleUpdateCategory = async (status: 'ARCHIVED' | 'PENDING_APPROVAL' | 'DRAFT' | 'ACTIVE' | 'NEEDS_REVISION') => {
    if (isNotCreator || !id) return;

    if (status !== 'ARCHIVED' && status !== 'ACTIVE') {
      if (!formData.name.trim()) {
        toast.error("Vui lòng nhập tên danh mục sản phẩm", { position: 'top-center' });
        return;
      }
      if (!formData.groupId) {
        toast.error("Vui lòng chọn nhóm sản phẩm cha", { position: 'top-center' });
        setIsOpen(true);
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PRODUCT_CATEGORY.UPDATE(id), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: formData.name || categoryData.name,
          groupId: formData.groupId || categoryData.groupId,
          active: isActive,
          status 
        }),
      });

      if (response.ok) {
        let message = '';
        switch (status) {
          case 'DRAFT': 
          case 'NEEDS_REVISION': message = "Lưu nháp danh mục thành công"; break;
          case 'ARCHIVED': message = "Lưu trữ danh mục thành công"; break;
          case 'ACTIVE': message = "Kích hoạt danh mục hoạt động trở lại thành công"; break;
          case 'PENDING_APPROVAL': message = "Gửi phê duyệt danh mục thành công"; break;
          default: message = "Cập nhật danh mục thành công";
        }
        renderCustomToast(message);
        setTimeout(() => navigate('/product-category'), 10);
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

  const handleUpdateDisplayStatus = async (newActiveStatus: boolean) => {
    if (isDisplayStatusReadOnly || !id) return;
    if (isActive === newActiveStatus) {
      setIsStatusOpen(false);
      return;
    }
    const toastId = toast.loading("Đang cập nhật trạng thái...");
    try {
      const response = await fetch(`/api/v1/product-category/${id}/active?active=${newActiveStatus}`, {
        method: 'GET',
        headers: { 
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setIsActive(newActiveStatus);
        setCategoryData((prev: any) => ({ ...prev, active: newActiveStatus }));
        toast.dismiss(toastId);
        renderCustomToast(newActiveStatus ? "Hiển thị danh mục thành công" : "Ẩn danh mục thành công");
      } else {
        toast.dismiss(toastId);
        if (!newActiveStatus && (response.status === 400 || response.status === 409)) {
          renderCannotHideToast(formData.name || categoryData.name);
        } else {
          toast.error(data.message || 'Có lỗi xảy ra khi thay đổi trạng thái', { position: 'top-center' });
        }
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ', { id: toastId, position: 'top-center' });
    } finally {
      setIsStatusOpen(false);
    }
  };

  const renderCannotHideToast = (categoryName: string) => {
    toast.custom((t) => 
      createPortal(
        <div className="warning-toast-wrapper">
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} warning-toast-card`}>
            <div className="warning-toast-icon-container">
              <div className="warning-bg-outer"></div>
              <div className="warning-bg-inner"></div>
              <svg className="warning-toast-icon" width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M10.2943 3.65586C11.0478 2.34807 12.9522 2.34807 13.7057 3.65586L21.6575 17.4526C22.4116 18.761 21.4651 20.4001 19.9517 20.4001H4.0483C2.53489 20.4001 1.58842 18.761 2.34251 17.4526L10.2943 3.65586Z" fill="#EAB308"/>
                <path d="M12 8.5V13.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1.5" fill="#FFFFFF"/>
              </svg>
            </div>
            <h3 className="warning-toast-title">
              Không thể ẩn danh mục: "{categoryName}"
            </h3>
            <p className="warning-toast-desc">
              Danh mục này đang chứa các nghiệp vụ hoặc sản phẩm bên trong.
            </p>
            <div className="warning-toast-actions">
              <button className="warning-btn-close" onClick={() => toast.dismiss(t.id)}>Đóng</button>
            </div>
          </div>
        </div>,
        document.body
      )
    , { duration: Infinity, id: 'cannot-hide-toast' }); 
  };

  const handleDeleteCategory = () => {
    if (isNotCreator || !id) return;
    toast.custom((t) => 
      createPortal(
        <div className="confirm-toast-overlay">
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} confirm-toast-card`}>
            <div className="confirm-toast-body">
              <div className="confirm-toast-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" viewBox="0 0 17 19" fill="none">
                  <path d="M0.835938 4.16829H2.5026M2.5026 4.16829H15.8359M2.5026 4.16829V15.835C2.5026 16.277 2.6782 16.7009 2.99076 17.0135C3.30332 17.326 3.72724 17.5016 4.16927 17.5016H12.5026C12.9446 17.5016 13.3686 17.326 13.6811 17.0135C13.9937 16.7009 14.1693 16.277 14.1693 15.835V4.16829H2.5026ZM5.0026 4.16829V2.50163C5.0026 2.0596 5.1782 1.63568 5.49076 1.32312C5.80332 1.01056 6.22724 0.834961 6.66927 0.834961H10.0026C10.4446 0.834961 10.8686 1.01056 11.1811 1.32312C11.4937 1.63568 11.6693 2.0596 11.6693 2.50163V4.16829M6.66927 8.33496V13.335M10.0026 8.33496V13.335" stroke="#AE1C3F" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="confirm-toast-content">
                <p className="confirm-toast-title">Xác nhận xóa</p>
                <p className="confirm-toast-desc">Bạn có chắc chắn muốn xóa không? Hành động này không thể hoàn tác.</p>
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
        </div>,
        document.body
      )
    , { id: 'delete-confirm-toast', duration: Infinity });
  };

  // const executeDelete = async () => {
  //   if (isNotCreator || !id) return;
  //   try {
  //     setLoading(true);
  //     const response = await fetch(API_ENDPOINTS.PRODUCT_CATEGORY.DELETE(id), {
  //       method: 'POST',
  //       headers: { 
  //         'Content-Type': 'application/json',
  //         ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  //       }
  //     });
  //     if (response.ok) {
  //       toast.custom((t) => 
  //         createPortal(
  //           <div className="warning-toast-wrapper">
  //             <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} warning-toast-card`} style={{ padding: '32px', width: '360px' }}>
  //               <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#E0F9EC', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
  //                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#12B76A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
  //                   <polyline points="20 6 9 17 4 12"></polyline>
  //                 </svg>
  //               </div>
  //               <h3 style={{ margin: 0, color: '#1F2937', fontSize: '18px', fontWeight: 600, textAlign: 'center' }}>Xóa danh mục sản phẩm thành công</h3>
  //             </div>
  //           </div>,
  //           document.body
  //         )
  //       , { duration: 2000, id: 'delete-success' });

  //       setTimeout(() => navigate('/product-category'), 2000);
  //     } else {
  //       const errorData = await response.json();
  //       toast.error(errorData.message || 'Có lỗi xảy ra khi xóa', { position: 'top-center' });
  //       setLoading(false);
  //     }
  //   } catch (error) {
  //     toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
  //     setLoading(false);
  //   }
  // };

  const executeDelete = async () => {
    if (isNotCreator || !id) return;
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PRODUCT_CATEGORY.DELETE(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });

      if (response.ok) {
        renderCustomToast("Xóa nghiệp vụ thành công");
        setTimeout(() => navigate('/product-category'), 10);
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

  if (loading) return <div className="loading">Đang tải dữ liệu danh mục...</div>;
  if (!categoryData) return <div className="error">Không tìm thấy dữ liệu danh mục sản phẩm phù hợp.</div>;

  const isDirty = (
    formData.name !== (categoryData.name || '') || 
    formData.groupId !== (categoryData.groupId || '') ||
    isActive !== (categoryData?.active ?? true)
  );
  
  const canSubmit = !isNotCreator && isDirty && formData.name.trim() !== '';

  const filteredGroups = groupOptions.filter(opt => opt.label.toLowerCase().includes(groupSearchTerm.toLowerCase()));

  return (
    <div className="pageWrapper">
      <div className="mainContainer">
        {isNotCreator && (
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
              <span className="breadcrumbText">Danh mục sản phẩm</span>
            </button>

            <div className="breadcrumb">
              <div className="separatorWrapper">
                <svg width="5" height="9" viewBox="0 0 5 9" fill="none">
                  <path d="M0.5 8.5L4.5 4.5L0.5 0.5" stroke="#171717" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <span className="breadcrumbActive breadcrumb-truncate" title={categoryData.name}>
                {categoryData.name}
              </span>

              <div style={{ marginLeft: '12px', flexShrink: 0 }}>
                <StatusBadge2 status={categoryData.status} />
              </div>
            </div>
          </div>

          <div className="headerRight" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isNotCreator ? (
              <span></span>
            ) : (
              <>
                {categoryData.status === 'DRAFT' && (
                  <>
                    <button className="btnDraft" onClick={handleDeleteCategory} style={{ display: 'flex', padding: '8px 14px', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '8px', background: '#E3DFE6', border: 'none', cursor: 'pointer', color: '#AE1C3F', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: '600', lineHeight: '20px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="16.667" viewBox="0 0 17 19" fill="none">
                        <path d="M0.835938 4.16829H2.5026M2.5026 4.16829H15.8359M2.5026 4.16829V15.835C2.5026 16.277 2.6782 16.7009 2.99076 17.0135C3.30332 17.326 3.72724 17.5016 4.16927 17.5016H12.5026C12.9446 17.5016 13.3686 17.326 13.6811 17.0135C13.9937 16.7009 14.1693 16.277 14.1693 15.835V4.16829H2.5026ZM5.0026 4.16829V2.50163C5.0026 2.0596 5.1782 1.63568 5.49076 1.32312C5.80332 1.01056 6.22724 0.834961 6.66927 0.834961H10.0026C10.4446 0.834961 10.8686 1.01056 11.1811 1.32312C11.4937 1.63568 11.6693 2.0596 11.6693 2.50163V4.16829M6.66927 8.33496V13.335M10.0026 8.33496V13.335" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Xóa
                    </button>
                    <button className="btnDraft active" disabled={isNotCreator} onClick={() => handleUpdateCategory('DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                      Lưu nháp
                    </button>
                    <button className={`btnSubmit ${!isNotCreator && formData.name.trim() && formData.groupId ? 'active' : 'disabled'}`} disabled={isNotCreator || !formData.name.trim() || !formData.groupId} onClick={() => handleUpdateCategory('PENDING_APPROVAL')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Gửi phê duyệt
                    </button>
                  </>
                )}
                {(categoryData.status === 'ACTIVE' || categoryData.status === 'NEEDS_REVISION') && (
                  <>
                    <button className={`btnDraft ${isDirty ? 'active' : 'disabled'}`} disabled={!isDirty} onClick={() => handleUpdateCategory(categoryData.status === 'NEEDS_REVISION' ? 'NEEDS_REVISION' : 'DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                      Lưu nháp
                    </button>
                    <button className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} disabled={!canSubmit} onClick={() => handleUpdateCategory('PENDING_APPROVAL')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Gửi phê duyệt
                    </button>
                  </>
                )}
                {categoryData.status === 'ARCHIVED' && (
                  <button className="btnRestore active" onClick={() => handleUpdateCategory('ACTIVE')} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#115e59', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
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
                <label className="label">Nhóm sản phẩm *</label>
                <div className="custom-select-container">
                  <div 
                    className={`select-custom ${isOpen ? 'open' : ''}`} 
                    onClick={() => !isFormReadOnly && setIsOpen(!isOpen)}
                    style={{ opacity: isFormReadOnly ? 0.7 : 1, cursor: isFormReadOnly ? 'not-allowed' : 'pointer' }}
                  >
                    <span>{groupOptions.find(o => o.value === formData.groupId)?.label || "Chọn nhóm sản phẩm"}</span>
                    {!isFormReadOnly && (
                      <svg 
                        width="10" height="6" viewBox="0 0 10 6" fill="none" 
                        className={`arrow-icon ${isOpen ? 'up' : ''}`}
                      >
                        <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  {!isFormReadOnly && isOpen && (
                    <div className="custom-options-list" style={{ minHeight: '250px', overflowY: 'auto', padding: 0 }}>
                      <div style={{ padding: '8px', position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderBottom: '1px solid #E5E7EB' }}>
                        <input 
                          type="text" 
                          placeholder="Tìm kiếm nhóm..." 
                          value={groupSearchTerm} 
                          onChange={(e) => setGroupSearchTerm(e.target.value)} 
                          onClick={(e) => e.stopPropagation()} 
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid #D5D7DA', borderRadius: '6px', boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                      {filteredGroups.length > 0 ? (
                        filteredGroups.map((opt) => (
                          <div key={opt.value} className={`custom-option ${formData.groupId === opt.value ? 'selected' : ''}`}
                            onClick={() => { setFormData({...formData, groupId: opt.value}); setIsOpen(false); setGroupSearchTerm(''); }}>
                            <span>{opt.label}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#6B7280' }}>Không tìm thấy nhóm</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="formGroup">
                <label className="label">Tên danh mục sản phẩm</label>
                <input 
                  type="text" 
                  name="name" 
                  className="input" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  readOnly={isFormReadOnly}
                  disabled={isFormReadOnly}
                  style={{ backgroundColor: isFormReadOnly ? '#F9FAFB' : '#FFF', cursor: isFormReadOnly ? 'not-allowed' : 'text' }}
                />
              </div>
            </div>
          </div>

          <div className="rightCol" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="formCard" style={{ 
              borderRadius: 12, 
              background: 'var(--Mauve-3, #F2EFF3)', 
              display: 'flex', 
              width: 340, 
              padding: 24, 
              flexDirection: 'column', 
              alignItems: 'flex-start', 
              gap: 10, 
              border: '1px solid #E5E7EB', 
              boxSizing: 'border-box',
              opacity: isStatusActive ? 1 : 0.5,
              pointerEvents: isStatusActive ? 'auto' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#1A191B', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>Trạng thái hiển thị</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'help' }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div className="custom-select-container" ref={statusRef} style={{ width: '100%', position: 'relative' }}>
                <div 
                  className={`select-custom ${isStatusOpen ? 'open' : ''}`} 
                  onClick={() => !isDisplayStatusReadOnly && setIsStatusOpen(v => !v)}
                  style={{ display: 'flex', padding: '8px 12px', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 8, border: '1px solid #D5D7DA', background: isDisplayStatusReadOnly ? '#F9FAFB' : '#FFF', boxShadow: '0 1px 2px rgba(10,13,18,0.05)', cursor: isDisplayStatusReadOnly ? 'not-allowed' : 'pointer', width: '100%', boxSizing: 'border-box' }}
                >
                  <span style={{ color: '#1A191B', fontWeight: 500 }}>{isActive === false ? 'Ẩn' : 'Hiển thị'}</span>
                  {!isDisplayStatusReadOnly && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isStatusOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path d="M5 7.5L10 12.5L15 7.5"/>
                    </svg>
                  )}
                </div>
                {!isDisplayStatusReadOnly && isStatusOpen && (
                  <div className="custom-options-list" style={{ zIndex: 50 }}>
                    <div className={`custom-option ${isActive === false ? 'selected' : ''}`} onClick={() => handleUpdateDisplayStatus(false)}>Ẩn</div>
                    <div className={`custom-option ${isActive === true  ? 'selected' : ''}`} onClick={() => handleUpdateDisplayStatus(true)}>Hiển thị</div>
                  </div>
                )}
              </div>
            </div>

            <ProductInfoCard 
              creatorName={getCreatorDisplayName()} 
              approverName={getApproverDisplayName()} 
              createdAt={formatDateTime(categoryData.createdAt)} 
              version={categoryData.version || 0} 
            />

            <div className="commentCard">
              <div className="commentHeader">
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.071 18.0698C15.0159 21.1264 10.4896 21.7867 6.78631 20.074C6.23961 19.8539 2.70113 20.8339 1.93334 20.067C1.16555 19.2991 2.14639 15.7601 1.92631 15.2134C0.212846 11.5106 0.874111 6.9826 3.9302 3.9271C7.83147 0.0243001 14.1698 0.0243001 18.071 3.9271C21.9803 7.83593 21.9723 14.1681 18.071 18.0698Z" stroke="#AE1C3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="commentTitle">Bình luận phản hồi</span>
              </div>
              <div className="commentList">
                {categoryData.comments && categoryData.comments.length > 0 ? (
                  categoryData.comments.map((c: any, index: number) => (
                    <React.Fragment key={c.id || index}>
                      <div className="commentItem">
                        <div className="userInfo">
                          <img src={c.avatarUrl || "https://images.squarespace-cdn.com/content/v1/61da6bc18e4e00423cffe684/1765779011140-U85TJYNQM9M24A5RQOZW/Leo+nui.png"} className="avatar" alt="avatar" />
                          <div style={{ flex: 1 }}>
                            <div className="userHeader">
                              <span className="userName">{getFullName(c.createdBy, userMap) || 'Người kiểm duyệt'}</span>
                              <span className="commentDate">{formatDateTime(c.createdAt)}</span>
                            </div>
                            <p className="commentText">{c.comment}</p>
                          </div>
                        </div>
                      </div>
                      {index < categoryData.comments.length - 1 && <hr className="commentDivider" />}
                    </React.Fragment>
                  ))
                ) : (
                  <div className="no-comments">Chưa có bình luận hay phản hồi nào cho danh mục này.</div>
                )}
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
};

export default DetailCategoryPage;