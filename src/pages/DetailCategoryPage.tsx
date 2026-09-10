import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './DetailGroupPage.css'; 
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/apiConfig';
import { getUserMap, getFullName } from '../utils/userUtils'; 
import { getRandomAvatar } from '../utils/avatarUtils'; 
import ProductInfoCard from '../components/ui/ProductInfoCard';
import StatusBadge2 from '../components/ui/StatusBadge2';
import ActionConfirmModal from '../components/ui/ActionConfirmModal';
import DuplicateVersionModal, { type PriorVersionInfo } from '../components/ui/DuplicateVersionModal';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import VersionDetailModal from '../components/ui/VersionDetailModal';
import type { VersionItem } from '../components/ui/ProductInfoCard';
import CascadeHideModal, { type ChildCounts } from '../components/ui/CascadeHideModal';
import { CASCADE_LOCK_MESSAGE, isCascadeHidden, getActionConfirmDesc, isSameActor } from '../utils/formatUtils';
import {
  displaySuccessMessage,
  getHideBlockedByPendingCopy,
  hasPendingOrRevisionChildren,
  notifyIfCannotShowChild,
  showDisplayStatusFromApi,
  showErrorToast,
  showSuccessToast,
} from '../utils/appToast';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCascadeModal, setShowCascadeModal] = useState(false);
  const [cascadeCounts, setCascadeCounts] = useState<ChildCounts>({});
  const [isCascadeProcessing, setIsCascadeProcessing] = useState(false);
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

  const isStatusActive = categoryData?.status === 'ACTIVE';
  // Khi trạng thái đã duyệt (ACTIVE) thì không còn phân biệt người tạo với người xem nữa để ai cũng có thể tạo phiên bản mới
  const canEdit = isLoggedIn && (isOwner || isStatusActive);
  const isNotCreator = !canEdit;
  const isCascadeLocked = isCascadeHidden(categoryData);
  const isFormReadOnly = isNotCreator || categoryData?.status === 'PENDING_APPROVAL' || isCascadeLocked;
  const isDisplayStatusReadOnly = isNotCreator || !isStatusActive;
  const hideEditActions = isNotCreator || isCascadeLocked;

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

  const isDirty = useMemo(() => {
    if (!categoryData) return false;
    return (
      formData.name !== (categoryData.name || '') || 
      formData.groupId !== (categoryData.groupId || '') ||
      isActive !== (categoryData?.active ?? true)
    );
  }, [formData, isActive, categoryData]);

  const { allowLeave, dialog } = useUnsavedChangesGuard(Boolean(!hideEditActions && isDirty));

  // Tự động cập nhật dữ liệu khi DB thay đổi nếu không có chỉnh sửa dở dang
  useEffect(() => {
    if (!id) return;
    const refetchStatus = async () => {
      if (isDirty || isSubmitting) return;
      try {
        const detailRes = await fetch(API_ENDPOINTS.PRODUCT_CATEGORY.DETAIL(id));
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setCategoryData(detailData);
          setFormData({
            name: detailData.name || '',
            groupId: detailData.groupId ? String(detailData.groupId) : ''
          });
          setIsActive(detailData.active ?? true);
        }
      } catch (e) {}
    };

    const interval = setInterval(refetchStatus, 15000);
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        refetchStatus();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [id, isDirty, isSubmitting]);

  const [confirmAction, setConfirmAction] = useState<'ARCHIVED' | 'PENDING_APPROVAL' | 'DRAFT' | 'ACTIVE' | 'NEEDS_REVISION' | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFormReadOnly) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGoBack = () => navigate('/product-category');

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [priorConflict, setPriorConflict] = useState<PriorVersionInfo | null>(null);
  const [pendingTargetStatus, setPendingTargetStatus] = useState<string | null>(null);
  const [isDeletingPrior, setIsDeletingPrior] = useState(false);
  const [previewVersionItem, setPreviewVersionItem] = useState<VersionItem | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);

  const findPriorConflictVersion = () => {
    if (!categoryData?.versions || categoryData.versions.length <= 1) return null;
    return categoryData.versions.find(
      (v: any) => v.id !== id && (v.status === 'DRAFT' || v.status === 'PENDING_APPROVAL' || v.status === 'NEEDS_REVISION')
    ) || null;
  };

  const onSaveDraftClick = (status: 'DRAFT' | 'NEEDS_REVISION') => {
    if (isNotCreator || !id || submittingRef.current || isSubmitting) return;
    const conflict = findPriorConflictVersion();
    if (conflict) {
      setPriorConflict(conflict);
      setPendingTargetStatus(status);
      setShowDuplicateModal(true);
      return;
    }
    setConfirmAction(status);
  };

  const onSubmitClick = () => {
    if (isNotCreator || !id || submittingRef.current || isSubmitting || confirmAction) return;
    const nameVal = formData.name !== undefined ? formData.name.trim() : (categoryData?.name || '').trim();
    const groupVal = formData.groupId !== undefined ? formData.groupId : categoryData?.groupId;
    if (!nameVal) {
      toast.error("Vui lòng nhập tên danh mục sản phẩm", { position: 'top-center' });
      return;
    }
    if (!groupVal) {
      toast.error("Vui lòng chọn nhóm sản phẩm cha", { position: 'top-center' });
      setIsOpen(true);
      return;
    }
    const conflict = findPriorConflictVersion();
    if (conflict) {
      setPriorConflict(conflict);
      setPendingTargetStatus('PENDING_APPROVAL');
      setShowDuplicateModal(true);
      return;
    }
    setConfirmAction('PENDING_APPROVAL');
  };

  const handleUpdateCategory = async (status: 'ARCHIVED' | 'PENDING_APPROVAL' | 'DRAFT' | 'ACTIVE' | 'NEEDS_REVISION') => {
    if (submittingRef.current || isNotCreator || !id) return;

    if (status === 'PENDING_APPROVAL') {
      const nameVal = formData.name !== undefined ? formData.name.trim() : (categoryData?.name || '').trim();
      const groupVal = formData.groupId !== undefined ? formData.groupId : categoryData?.groupId;
      if (!nameVal) {
        toast.error("Vui lòng nhập tên danh mục sản phẩm", { position: 'top-center' });
        return;
      }
      if (!groupVal) {
        toast.error("Vui lòng chọn nhóm sản phẩm cha", { position: 'top-center' });
        setIsOpen(true);
        return;
      }
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    let succeeded = false;
    try {
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
        succeeded = true;
        let message = '';
        switch (status) {
          case 'DRAFT': 
          case 'NEEDS_REVISION': message = "Lưu nháp thành công"; break;
          case 'ARCHIVED': message = "Lưu trữ thành công"; break;
          case 'ACTIVE': message = "Hiển thị thành công"; break;
          case 'PENDING_APPROVAL': message = "Gửi phê duyệt thành công"; break;
          default: message = "Cập nhật thành công";
        }
        renderCustomToast(message);
        allowLeave();
        setConfirmAction(null);
        setTimeout(() => navigate('/product-category'), 400);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Có lỗi xảy ra khi cập nhật', { position: 'top-center' });
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
    } finally {
      if (!succeeded) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const handleUpdateDisplayStatus = async (newActiveStatus: boolean) => {
    if (newActiveStatus) {
      if (await notifyIfCannotShowChild('danh mục', categoryData?.name, categoryData)) {
        setIsStatusOpen(false);
        return;
      }
    }
    if (isDisplayStatusReadOnly || !id) return;
    if (isActive === newActiveStatus) {
      setIsStatusOpen(false);
      return;
    }

    if (!newActiveStatus) {
      try {
        const res = await fetch(`/api/v1/product-category/${id}/children-count`);
        const resJson = await res.json();
        const counts: ChildCounts = resJson?.data || {};
        if (hasPendingOrRevisionChildren(counts)) {
          const copy = getHideBlockedByPendingCopy('category', categoryData?.name);
          showErrorToast(copy.title, copy.description);
          setIsStatusOpen(false);
          return;
        }
        if (counts.total && counts.total > 0) {
          setCascadeCounts(counts);
          setShowCascadeModal(true);
          setIsStatusOpen(false);
          return;
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra con danh mục:", err);
      }
      await executeToggleActive(false, false);
    } else {
      await executeToggleActive(true, false);
    }
  };

  const executeToggleActive = async (newActive: boolean, cascade: boolean) => {
    setIsCascadeProcessing(true);
    try {
      const url = `/api/v1/product-category/${id}/active?active=${newActive}${cascade ? '&cascade=true' : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setIsActive(newActive);
        setCategoryData((prev: any) => ({ ...prev, active: newActive }));
        setShowCascadeModal(false);
        showSuccessToast(displaySuccessMessage(newActive, 'danh mục', categoryData?.name));
      } else {
        showDisplayStatusFromApi(data);
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
    } finally {
      setIsCascadeProcessing(false);
      setIsStatusOpen(false);
    }
  };

  const handleDeleteCategory = () => {
    if (isNotCreator || !id) return;
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (submittingRef.current || isNotCreator || !id) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    let succeeded = false;
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCT_CATEGORY.DELETE(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });

      if (response.ok) {
        succeeded = true;
        setShowDeleteModal(false);
        renderCustomToast("Xóa thành công");
        allowLeave();
        setTimeout(() => navigate('/product-category'), 400);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Có lỗi xảy ra khi xóa', { position: 'top-center' });
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
    } finally {
      if (!succeeded) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
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
  
  const canSubmit = !hideEditActions && isDirty && formData.name.trim() !== '';

  const filteredGroups = groupOptions.filter(opt => opt.label.toLowerCase().includes(groupSearchTerm.toLowerCase()));

  return (
    <div className="pageWrapper">
      <div className="mainContainer">
        {(isNotCreator || isCascadeLocked) && (
          <div className="permissionBanner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span className="permissionBannerText">
              {isCascadeLocked
                ? CASCADE_LOCK_MESSAGE
                : 'Bạn đang xem ở chế độ chỉ đọc (Read-only) vì bạn không phải là người tạo sản phẩm này.'}
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
            {hideEditActions ? (
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
                    <button className="btnDraft active" disabled={isNotCreator} onClick={() => onSaveDraftClick('DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                      Lưu nháp
                    </button>
                    <button className={`btnSubmit ${!isNotCreator && (formData.name !== undefined ? formData.name.trim() : (categoryData?.name || '').trim()) && (formData.groupId !== undefined ? formData.groupId : categoryData?.groupId) ? 'active' : 'disabled'}`} disabled={isNotCreator || !(formData.name !== undefined ? formData.name.trim() : (categoryData?.name || '').trim()) || !(formData.groupId !== undefined ? formData.groupId : categoryData?.groupId)} onClick={onSubmitClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Gửi phê duyệt
                    </button>
                  </>
                )}
                {(categoryData.status === 'ACTIVE' || categoryData.status === 'NEEDS_REVISION') && (
                  <>
                    <button className={`btnDraft ${isDirty ? 'active' : 'disabled'}`} disabled={!isDirty} onClick={() => onSaveDraftClick(categoryData.status === 'NEEDS_REVISION' ? 'NEEDS_REVISION' : 'DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                      Lưu nháp
                    </button>
                    <button className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} disabled={!canSubmit} onClick={onSubmitClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <label className="label"> Nhóm sản phẩm <span style={{ color: '#EF4444' }}>(*)</span></label>
                <div className="custom-select-container">
                  <div 
                    className={`select-custom ${isOpen ? 'open' : ''} ${isFormReadOnly ? 'is-disabled' : ''}`} 
                    onClick={() => !isFormReadOnly && setIsOpen(!isOpen)}
                    style={{ cursor: isFormReadOnly ? 'not-allowed' : 'pointer' }}
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
                <label className="label"> Tên danh mục sản phẩm <span style={{ color: '#EF4444' }}>(*)</span></label>
                <input 
                  type="text" 
                  name="name" 
                  className={`input ${isFormReadOnly ? 'is-disabled' : ''}`}
                  value={formData.name} 
                  onChange={handleInputChange} 
                  readOnly={isFormReadOnly}
                  disabled={isFormReadOnly}
                  style={{ cursor: isFormReadOnly ? 'not-allowed' : 'text' }}
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
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#1A191B', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>Trạng thái hiển thị</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'help' }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div className="custom-select-container" ref={statusRef} style={{ width: '100%', position: 'relative' }}>
                <div 
                  className={`select-custom ${isStatusOpen ? 'open' : ''} ${isDisplayStatusReadOnly ? 'is-disabled' : ''}`} 
                  onClick={() => !isDisplayStatusReadOnly && setIsStatusOpen(v => !v)}
                  style={{ display: 'flex', padding: '8px 12px', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 8, border: '1px solid #D5D7DA', boxShadow: '0 1px 2px rgba(10,13,18,0.05)', cursor: isDisplayStatusReadOnly ? 'not-allowed' : 'pointer', width: '100%', boxSizing: 'border-box' }}
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
              versions={categoryData.versions || []}
              currentId={id}
              onSelectVersion={(v) => {
                setPreviewVersionItem(v);
                setShowVersionModal(true);
              }}
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
                          <img src={c.avatarUrl || getRandomAvatar(c.createdBy || index)} className="avatar" alt="avatar" />
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

      <ActionConfirmModal
        isOpen={confirmAction !== null}
        onClose={() => { if (!isSubmitting) setConfirmAction(null); }}
        onConfirm={() => {
          if (confirmAction) return handleUpdateCategory(confirmAction);
        }}
        variant={confirmAction === 'DRAFT' || confirmAction === 'NEEDS_REVISION' ? 'draft' : 'submit'}
        title={confirmAction === 'DRAFT' || confirmAction === 'NEEDS_REVISION' ? 'Xác nhận lưu nháp' : 'Xác nhận gửi phê duyệt'}
        desc={getActionConfirmDesc(categoryData, id, confirmAction, 'danh mục sản phẩm')}
        confirmText={confirmAction === 'DRAFT' || confirmAction === 'NEEDS_REVISION' ? 'Lưu nháp' : 'Gửi phê duyệt'}
        cancelText="Hủy"
        loading={isSubmitting}
      />

      <DuplicateVersionModal
        isOpen={showDuplicateModal}
        itemName={categoryData?.name || 'danh mục này'}
        priorVersion={priorConflict}
        canReplace={isSameActor(currentUsername, priorConflict?.createdBy)}
        isProcessing={isDeletingPrior}
        onCancel={() => {
          setShowDuplicateModal(false);
          setPriorConflict(null);
          setPendingTargetStatus(null);
        }}
        onViewPrior={() => {
          if (priorConflict) {
            setShowDuplicateModal(false);
            setPreviewVersionItem(priorConflict as any);
            setShowVersionModal(true);
          }
        }}
        onConfirm={async () => {
          if (!priorConflict || !isSameActor(currentUsername, priorConflict.createdBy)) return;
          try {
            setIsDeletingPrior(true);
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
            const delRes = await fetch(API_ENDPOINTS.PRODUCT_CATEGORY.DELETE(priorConflict.id), {
              method: 'POST',
              headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
            });
            if (delRes.ok) {
              toast.success('Đã xóa phiên bản trùng lặp trước đó');
              setShowDuplicateModal(false);
              const target = pendingTargetStatus;
              setPriorConflict(null);
              setPendingTargetStatus(null);
              if (target) {
                handleUpdateCategory(target as any);
              }
            } else {
              const err = await delRes.json().catch(() => ({}));
              toast.error(err.message || 'Không thể xóa phiên bản cũ', { position: 'top-center' });
            }
          } catch (e) {
            toast.error('Lỗi khi xóa phiên bản cũ', { position: 'top-center' });
          } finally {
            setIsDeletingPrior(false);
          }
        }}
      />

      <VersionDetailModal
        isOpen={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        itemType="category"
        versionItem={previewVersionItem}
      />

      <ActionConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { if (!isSubmitting) setShowDeleteModal(false); }}
        onConfirm={executeDelete}
        variant="delete"
        title="Xác nhận xóa"
        desc="Bạn có chắc chắn muốn xóa danh mục này không? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        loading={isSubmitting}
      />

      <CascadeHideModal
        isOpen={showCascadeModal}
        onClose={() => setShowCascadeModal(false)}
        onConfirm={() => executeToggleActive(false, true)}
        itemTypeLabel="danh mục sản phẩm"
        itemName={formData.name || categoryData?.name || ''}
        counts={cascadeCounts}
        isProcessing={isCascadeProcessing}
      />
      {dialog}
    </div>
  );
};

export default DetailCategoryPage;