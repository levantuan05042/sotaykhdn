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
import { CASCADE_LOCK_MESSAGE, isCriteriaFullyLocked } from '../utils/formatUtils';
import {
  displaySuccessMessage,
  notifyIfCannotShowChild,
  showDisplayStatusFromApi,
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

const extractBaseId = (username: string) => {
  if (!username) return '';
  return username.split('_')[0];
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

const DetailCriteriaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownListRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  
  const [isActive, setIsActive] = useState(true);
  const [criteriaData, setCriteriaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCascadeModal, setShowCascadeModal] = useState(false);
  const [cascadeCounts, setCascadeCounts] = useState<ChildCounts>({});
  const [isCascadeProcessing, setIsCascadeProcessing] = useState(false);
  
  const [groupOptions, setGroupOptions] = useState<{ label: string; value: string; hidden?: boolean }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<{ code: string; name: string; groupIds: string[]; isRequired: boolean }>({
    code: '',
    name: '',
    groupIds: [],
    isRequired: false
  });

  const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
  const userMap = useMemo(() => getUserMap(), []);

  const currentUsername = getCurrentUsername();
  const isLoggedIn = Boolean(currentUsername);

  const creatorField = criteriaData?.createdBy || criteriaData?.created_by || criteriaData?.creator;
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

  const isCascadeLocked = isCriteriaFullyLocked(criteriaData);
  const isOwnerLocked = !isLoggedIn || !isOwner;
  const isReadOnly = isOwnerLocked || isCascadeLocked;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        dropdownListRef.current && !dropdownListRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
      if (statusRef.current && !statusRef.current.contains(target)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    let isMounted = true;
    const initPageData = async () => {
      if (!id) return;
      try {
        setLoading(true);

        const [detailRes, groupsRes] = await Promise.all([
          fetch(API_ENDPOINTS.PRODUCT_CRITERIA.DETAIL(id)),
          fetch(`${API_ENDPOINTS.PRODUCT_GROUPS.LIST}?status=ACTIVE&active=true`)
        ]);

        if (!detailRes.ok) throw new Error("Không thể tải thông tin tiêu chí");
        
        const detailData = await detailRes.json();
        
        if (!isMounted) return;
        setCriteriaData(detailData);

        const initialGroupIds = detailData.productGroups 
          ? detailData.productGroups.map((g: any) => String(g.id)) 
          : [];

        setFormData({
          code: detailData.code || '',
          name: detailData.name || '',
          groupIds: initialGroupIds,
          isRequired: detailData.isRequired ?? false 
        });

        setIsActive(detailData.active ?? true);

        const attachedGroups: any[] = detailData.productGroups || [];
        const hiddenIds = new Set(
          attachedGroups.filter((g: any) => g.active === false).map((g: any) => String(g.id))
        );

        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          const options = (groupsData || []).map((g: any) => ({
            label: g.name,
            value: String(g.id),
            hidden: hiddenIds.has(String(g.id)),
          }));
          attachedGroups.forEach((g: any) => {
            const id = String(g.id);
            if (!options.some((opt: any) => opt.value === id)) {
              options.push({ label: g.name, value: id, hidden: g.active === false });
            }
          });
          setGroupOptions(options);
        } else {
          setGroupOptions(
            attachedGroups.map((g: any) => ({
              label: g.name,
              value: String(g.id),
              hidden: g.active === false,
            }))
          );
        }

      } catch (error) {
        toast.error("Không tìm thấy tiêu chí hoặc tiêu chí đã bị ẩn");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initPageData();
    return () => { isMounted = false; };
  }, [id]);

  const isFormModified = useMemo(() => {
    if (!criteriaData) return false;
    const origName = criteriaData.name || '';
    const origCode = criteriaData.code || '';
    const origRequired = criteriaData.isRequired ?? false;
    const origGroups = criteriaData.productGroups ? criteriaData.productGroups.map((g: any) => String(g.id)).sort().join(',') : '';
    const currentGroups = (formData.groupIds || []).slice().sort().join(',');
    return (
      formData.name.trim() !== origName.trim() ||
      formData.code.trim() !== origCode.trim() ||
      formData.isRequired !== origRequired ||
      currentGroups !== origGroups
    );
  }, [formData, criteriaData]);

  const { allowLeave, dialog } = useUnsavedChangesGuard(Boolean(!isReadOnly && isFormModified));

  // Tự động cập nhật dữ liệu khi DB thay đổi nếu không có chỉnh sửa dở dang
  useEffect(() => {
    if (!id) return;
    const refetchStatus = async () => {
      if (isFormModified) return;
      try {
        const detailRes = await fetch(API_ENDPOINTS.PRODUCT_CRITERIA.DETAIL(id));
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          setCriteriaData(detailData);
          const initialGroupIds = detailData.productGroups
            ? detailData.productGroups.map((g: any) => String(g.id))
            : [];
          setFormData({
            code: detailData.code || '',
            name: detailData.name || '',
            groupIds: initialGroupIds,
            isRequired: detailData.isRequired ?? false 
          });
          setIsActive(detailData.active ?? true);
          const attachedGroups: any[] = detailData.productGroups || [];
          const hiddenIds = new Set(
            attachedGroups.filter((g: any) => g.active === false).map((g: any) => String(g.id))
          );
          setGroupOptions((prev) => {
            const next = prev.map((opt) => ({ ...opt, hidden: hiddenIds.has(opt.value) }));
            attachedGroups.forEach((g: any) => {
              const id = String(g.id);
              if (!next.some((opt) => opt.value === id)) {
                next.push({ label: g.name, value: id, hidden: g.active === false });
              }
            });
            return next;
          });
        }
      } catch (e) {}
    };

    const interval = setInterval(refetchStatus, 5000);
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
  }, [id, isFormModified]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleToggleGroup = (value: string) => {
    if (isReadOnly) return;
    setFormData(prev => {
      const isSelected = prev.groupIds.includes(value);
      const updatedGroupIds = isSelected
        ? prev.groupIds.filter(item => item !== value)
        : [...prev.groupIds, value];
      return { ...prev, groupIds: updatedGroupIds };
    });
  };

  const handleToggleSelectAll = () => {
    if (isReadOnly) return;
    setFormData(prev => {
      if (prev.groupIds.length === groupOptions.length) {
        return { ...prev, groupIds: [] };
      } else {
        const allIds = groupOptions.map(opt => String(opt.value));
        return { ...prev, groupIds: allIds };
      }
    });
  };

  const [confirmAction, setConfirmAction] = useState<'ARCHIVED' | 'PENDING_APPROVAL' | 'DRAFT' | 'ACTIVE' | 'NEEDS_REVISION' | null>(null);

  const handleGoBack = () => navigate('/criteria-management');

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [priorConflict, setPriorConflict] = useState<PriorVersionInfo | null>(null);
  const [pendingTargetStatus, setPendingTargetStatus] = useState<string | null>(null);
  const [isDeletingPrior, setIsDeletingPrior] = useState(false);
  const [previewVersionItem, setPreviewVersionItem] = useState<VersionItem | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);

  const findPriorConflictVersion = () => {
    if (!criteriaData?.versions || criteriaData.versions.length <= 1) return null;
    return criteriaData.versions.find(
      (v: any) => v.id !== id && (v.status === 'DRAFT' || v.status === 'PENDING_APPROVAL')
    ) || null;
  };

  const onSaveDraftClick = (status: 'DRAFT' | 'NEEDS_REVISION') => {
    if (isReadOnly || !id) return;
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
    if (isReadOnly || !id) return;
    if (!validateFormBeforeSubmit()) return;
    const conflict = findPriorConflictVersion();
    if (conflict) {
      setPriorConflict(conflict);
      setPendingTargetStatus('PENDING_APPROVAL');
      setShowDuplicateModal(true);
      return;
    }
    setConfirmAction('PENDING_APPROVAL');
  };

  const validateFormBeforeSubmit = () => {
    if (isReadOnly) return false;
    if (!formData.code.trim()) {
      toast.error("Vui lòng nhập mã tiêu chí sản phẩm", { position: 'top-center' });
      return false;
    }
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên tiêu chí sản phẩm", { position: 'top-center' });
      return false;
    }
    if (formData.groupIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một nhóm sản phẩm", { position: 'top-center' });
      setIsOpen(true);
      return false;
    }
    return true;
  };

  const handleUpdateCriteria = async (status: 'ARCHIVED' | 'PENDING_APPROVAL' | 'DRAFT' | 'ACTIVE' | 'NEEDS_REVISION') => {
    if (isReadOnly || !id) return;

    if (status === 'PENDING_APPROVAL') {
      if (!validateFormBeforeSubmit()) return;
    }

    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PRODUCT_CRITERIA.UPDATE(id), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          code: formData.code.trim() || criteriaData.code,
          name: formData.name.trim() || criteriaData.name,
          groupIds: formData.groupIds, 
          isRequired: formData.isRequired, 
          active: isActive, 
          status
        }),
      });

      if (response.status === 409) {
        toast.error("Mã tiêu chí này đã tồn tại trên hệ thống. Vui lòng kiểm tra lại!", { position: 'top-center' });
        setLoading(false);
        return;
      }

      if (response.ok) {
        let message = '';
        switch (status) {
          case 'DRAFT': 
          case 'NEEDS_REVISION':
            message = "Lưu nháp thành công"; break;
          case 'ARCHIVED': message = "Lưu trữ thành công"; break;
          case 'ACTIVE': message = "Hiển thị thành công"; break;
          case 'PENDING_APPROVAL': message = "Gửi phê duyệt thành công"; break;
          default: message = "Cập nhật thành công";
        }

        renderCustomToast(message);
        allowLeave();
        setTimeout(() => navigate('/criteria-management'), 400);
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

  const handleToggleActive = async (newActiveState: boolean) => {
    if (newActiveState) {
      if (await notifyIfCannotShowChild('tiêu chí', criteriaData?.name, criteriaData)) {
        setIsStatusOpen(false);
        return;
      }
    }
    if (isOwnerLocked || !id) return;

    if (isActive === newActiveState) {
      setIsStatusOpen(false);
      return;
    }

    if (!newActiveState) {
      try {
        const res = await fetch(`/api/v1/criteria/${id}/children-count`);
        const resJson = await res.json();
        const counts: ChildCounts = resJson?.data || {};
        if (counts.total && counts.total > 0) {
          setCascadeCounts(counts);
          setShowCascadeModal(true);
          setIsStatusOpen(false);
          return;
        }
      } catch (err) {
        console.warn("Lỗi kiểm tra con tiêu chí:", err);
      }
      await executeToggleActive(false, false);
    } else {
      await executeToggleActive(true, false);
    }
  };

  const executeToggleActive = async (newActive: boolean, cascade: boolean) => {
    setIsCascadeProcessing(true);
    try {
      const url = `/api/v1/criteria/${id}/active?active=${newActive}${cascade ? '&cascade=true' : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      const errorData = await response.json().catch(() => ({}));

      if (response.ok) {
        setIsActive(newActive);
        setCriteriaData((prev: any) => ({ ...prev, active: newActive }));
        setShowCascadeModal(false);
        showSuccessToast(displaySuccessMessage(newActive, 'tiêu chí', criteriaData?.name));
      } else {
        showDisplayStatusFromApi(errorData);
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
    } finally {
      setIsCascadeProcessing(false);
      setIsStatusOpen(false);
    }
  };

  const handleDeleteCriteria = () => {
    if (isReadOnly || !id) return;
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (isReadOnly || !id) return;
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PRODUCT_CRITERIA.DELETE(id), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (response.ok) {
        setShowDeleteModal(false);
        renderCustomToast("Xóa thành công");
        allowLeave();
        setTimeout(() => navigate('/criteria-management'), 400);
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

  const getCreatorDisplayName = () => {
    if (criteriaData?.createdByFullName) return criteriaData.createdByFullName;
    if (creatorUsername) {
      const baseId = extractBaseId(creatorUsername);
      const mapped = getFullName(baseId, userMap);
      if (mapped && mapped.toLowerCase() !== baseId.toLowerCase()) return mapped;
    }
    return creatorUsername ? creatorUsername.toUpperCase() : '---';
  };

  const getApproverDisplayName = () => {
    if (criteriaData?.approvedByFullName) return criteriaData.approvedByFullName;
    if (criteriaData?.approvedBy && criteriaData.approvedBy === criteriaData.createdBy && criteriaData.createdByFullName) {
      return criteriaData.createdByFullName;
    }

    if (criteriaData?.approvedBy) {
      const baseId = extractBaseId(criteriaData.approvedBy);
      const mapped = getFullName(baseId, userMap);
      if (mapped && mapped.toLowerCase() !== baseId.toLowerCase()) return mapped;
      return baseId.toUpperCase();
    }
    return '---';
  };

  const getSelectedGroupsLabel = () => {
    if (formData.groupIds.length === 0) return "Chọn nhóm sản phẩm";
    if (formData.groupIds.length === groupOptions.length && groupOptions.length > 0) return "Tất cả nhóm sản phẩm";

    const selected = groupOptions.filter(opt => formData.groupIds.includes(opt.value));
    const visibleSelected = selected.slice(0, 3);
    const remainingCount = selected.length - visibleSelected.length;

    return (
      <>
        {visibleSelected.map((opt, index) => (
          <span
            key={opt.value}
            title={opt.hidden ? 'Nhóm đang bị ẩn' : undefined}
            style={{
              opacity: opt.hidden ? 0.42 : 1,
              color: opt.hidden ? '#6B7280' : undefined,
            }}
          >
            {opt.label}{index < visibleSelected.length - 1 || remainingCount > 0 ? ', ' : ''}
          </span>
        ))}
        {remainingCount > 0 && <span>và {remainingCount} nhóm khác</span>}
      </>
    );
  };

  const isFormValid = formData.code.trim() !== '' && formData.name.trim() !== '' && formData.groupIds.length > 0;
  const canSubmit = !isReadOnly && isFormValid;
  const canSaveDraft = !isReadOnly;

  const filteredOptions = groupOptions.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayOptions = useMemo(() => {
    if (!isReadOnly) return filteredOptions;
    // Ở chế độ chỉ xem, ưu tiên hiển thị các nhóm được chọn lên đầu để dễ xem
    return [...filteredOptions].sort((a, b) => {
      const aChecked = formData.groupIds.includes(a.value);
      const bChecked = formData.groupIds.includes(b.value);
      if (aChecked && !bChecked) return -1;
      if (!aChecked && bChecked) return 1;
      return 0;
    });
  }, [filteredOptions, isReadOnly, formData.groupIds]);

  const isAllSelected = groupOptions.length > 0 && formData.groupIds.length === groupOptions.length;
  const isStatusActive = criteriaData?.status === 'ACTIVE';
  const canChangeActiveStatus = !isOwnerLocked && isStatusActive;
  const shownActive = isCascadeLocked ? false : isActive;

  if (loading) return <div className="loading">Đang tải dữ liệu tiêu chí...</div>;
  if (!criteriaData) return <div className="error">Không tìm thấy dữ liệu tiêu chí sản phẩm phù hợp.</div>;

  return (
    <div className="pageWrapper">
      <div className="mainContainer">
        {isReadOnly && (
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

              <StatusBadge2 status={criteriaData.status} />

            </div>
          </div>

          <div className="headerRight" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isReadOnly && (
              <>
                {criteriaData.status === 'DRAFT' && (
                  <>
                    <button className="btnDraft" onClick={handleDeleteCriteria} style={{ display: 'flex', padding: '8px 14px', justifyContent: 'center', alignItems: 'center', gap: '6px', borderRadius: '8px', background: '#E3DFE6', border: 'none', cursor: 'pointer', color: '#AE1C3F', fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: '600', lineHeight: '20px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="16.667" viewBox="0 0 17 19" fill="none">
                        <path d="M0.835938 4.16829H2.5026M2.5026 4.16829H15.8359M2.5026 4.16829V15.835C2.5026 16.277 2.6782 16.7009 2.99076 17.0135C3.30332 17.326 3.72724 17.5016 4.16927 17.5016H12.5026C12.9446 17.5016 13.3686 17.326 13.6811 17.0135C13.9937 16.7009 14.1693 16.277 14.1693 15.835V4.16829H2.5026ZM5.0026 4.16829V2.50163C5.0026 2.0596 5.1782 1.63568 5.49076 1.32312C5.80332 1.01056 6.22724 0.834961 6.66927 0.834961H10.0026C10.4446 0.834961 10.8686 1.01056 11.1811 1.32312C11.4937 1.63568 11.6693 2.0596 11.6693 2.50163V4.16829M6.66927 8.33496V13.335M10.0026 8.33496V13.335" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Xóa
                    </button>
                    <button className={`btnDraft ${canSaveDraft ? 'active' : 'disabled'}`} disabled={!canSaveDraft} onClick={() => onSaveDraftClick('DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                      Lưu nháp
                    </button>
                    <button className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} disabled={!canSubmit} onClick={onSubmitClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Gửi phê duyệt
                    </button>
                  </>
                )}

                {(criteriaData.status === 'ACTIVE' || criteriaData.status === 'NEEDS_REVISION') && (
                  <>
                    <button className={`btnDraft ${canSaveDraft ? 'active' : 'disabled'}`} disabled={!canSaveDraft} onClick={() => onSaveDraftClick(criteriaData.status === 'NEEDS_REVISION' ? 'NEEDS_REVISION' : 'DRAFT')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                      Lưu nháp
                    </button>
                    <button className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} disabled={!canSubmit} onClick={onSubmitClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Gửi phê duyệt
                    </button>
                  </>
                )}

                {criteriaData.status === 'ARCHIVED' && (
                  <button className="btnRestore active" onClick={() => handleUpdateCriteria('ACTIVE')} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#115e59', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
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
                <label className="label"> Mã tiêu chí <span style={{ color: '#EF4444' }}>(*)</span></label>
                <input 
                  type="text" 
                  name="code" 
                  className="input" 
                  value={formData.code} 
                  onChange={handleInputChange} 
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                  style={{ backgroundColor: isReadOnly ? '#F9FAFB' : '#FFF', cursor: isReadOnly ? 'not-allowed' : 'text' }}
                  placeholder="Nhập mã tiêu chí"
                />
              </div>
              <div className="formGroup">
                <label className="label"> Tên tiêu chí <span style={{ color: '#EF4444' }}>(*)</span></label>
                <input 
                  type="text" 
                  name="name" 
                  className="input" 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  readOnly={isReadOnly}
                  disabled={isReadOnly}
                  style={{ backgroundColor: isReadOnly ? '#F9FAFB' : '#FFF', cursor: isReadOnly ? 'not-allowed' : 'text' }}
                  placeholder="Nhập tên tiêu chí"
                />
              </div>

              <div className="formGroup" ref={dropdownRef}>
                <label className="label"> Nhóm sản phẩm áp dụng <span style={{ color: '#EF4444' }}>(*)</span></label>
                <div className="custom-select-container" style={{ position: 'relative' }}>
                  <div 
                    className={`select-custom ${isOpen ? 'open' : ''}`} 
                    onClick={handleToggleDropdown}
                    style={{ 
                      backgroundColor: isReadOnly ? '#F9FAFB' : '#FFF',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                      {getSelectedGroupsLabel()}
                    </span>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className={`arrow-icon ${isOpen ? 'up' : ''}`}>
                      <path d="M1 1L5 5L9 1" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  
                  {isOpen && (
                    <div 
                      ref={dropdownListRef}
                      className="custom-options-list" 
                      style={{ 
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        zIndex: 99,
                        padding: 0, 
                        background: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        maxHeight: '300px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div className="dropdown-search-wrapper" style={{ padding: '8px', borderBottom: '1px solid #E5E7EB', background: '#fff' }}>
                        <input
                          type="text"
                          className="input"
                          placeholder="Tìm kiếm nhóm sản phẩm..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={{ padding: '6px 12px', fontSize: '14px', width: '100%', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #D1D5DB', outline: 'none' }}
                        />
                      </div>

                      <div style={{ overflowY: 'auto', flex: 1 }}>
                        {groupOptions.length > 0 && !searchTerm && (!isReadOnly || isAllSelected) && (
                          <div 
                            className="custom-option select-all-option"
                            onClick={handleToggleSelectAll}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '10px', 
                              cursor: isReadOnly ? 'default' : 'pointer', 
                              padding: '10px 12px', 
                              borderBottom: '1px solid #F3F4F6', 
                              background: '#F9FAFB', 
                              fontWeight: '500', 
                              userSelect: 'none' 
                            }}
                          >
                            <div 
                              style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '4px',
                                border: isAllSelected ? '1.5px solid #AE1C3F' : '1.5px solid #D1D5DB',
                                backgroundColor: isAllSelected ? '#AE1C3F' : '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                                flexShrink: 0
                              }}
                            >
                              {isAllSelected && (
                                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                  <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span style={{ fontSize: '14px', color: '#111827' }}>Tất cả nhóm sản phẩm</span>
                          </div>
                        )}

                        <div>
                          {displayOptions.length === 0 ? (
                            <div className="custom-option disabled" style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '14px' }}>
                              Không tìm thấy nhóm sản phẩm phù hợp
                            </div>
                          ) : (
                            displayOptions.map((opt) => {
                              const isChecked = formData.groupIds.includes(opt.value);
                              return (
                                <div 
                                  key={opt.value} 
                                  className={`custom-option ${isChecked ? 'selected' : ''}`}
                                  onClick={() => handleToggleGroup(opt.value)}
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    cursor: isReadOnly ? 'default' : 'pointer', 
                                    padding: '10px 12px', 
                                    userSelect: 'none' 
                                  }}
                                >
                                  <div 
                                    style={{
                                      width: '18px',
                                      height: '18px',
                                      borderRadius: '4px',
                                      border: isChecked ? '1.5px solid #AE1C3F' : '1.5px solid #D1D5DB',
                                      backgroundColor: isChecked ? '#AE1C3F' : (isReadOnly ? '#F9FAFB' : '#FFFFFF'),
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'all 0.15s ease',
                                      flexShrink: 0
                                    }}
                                  >
                                    {isChecked && (
                                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                        <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: '14px',
                                      color: opt.hidden ? '#6B7280' : '#1F2937',
                                      opacity: opt.hidden ? 0.55 : 1,
                                    }}
                                    title={opt.hidden ? 'Nhóm đang bị ẩn' : undefined}
                                  >
                                    {opt.label}{opt.hidden ? ' (Đang ẩn)' : ''}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="formGroup" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '15px', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  id="isRequired"
                  name="isRequired"
                  checked={formData.isRequired} 
                  onChange={handleCheckboxChange}
                  disabled={isReadOnly}
                  style={{ width: '18px', height: '18px', cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                />
                <label htmlFor="isRequired" style={{ fontSize: '14px', fontWeight: '500', color: '#374151', cursor: isReadOnly ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
                  Đây là tiêu chí bắt buộc
                </label>
              </div>

            </div>
          </div>

          <div className="rightCol" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="formCard" style={{ borderRadius: 12, background: 'var(--Mauve-3, #F2EFF3)', display: 'flex', width: 340, padding: 24, flexDirection: 'column', alignItems: 'flex-start', gap: 10, border: '1px solid #E5E7EB', opacity: isStatusActive ? 1 : 0.5, pointerEvents: isStatusActive ? 'auto' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#1A191B', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>Trạng thái hiển thị</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'help' }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div className="custom-select-container" ref={statusRef} style={{ width: '100%', position: 'relative' }}>
                <div 
                  className={`select-custom ${isStatusOpen ? 'open' : ''}`} 
                  onClick={() => canChangeActiveStatus && setIsStatusOpen(v => !v)}
                  style={{ display: 'flex', padding: '8px 12px', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 8, border: '1px solid #D5D7DA', background: !canChangeActiveStatus ? '#F9FAFB' : '#FFF', boxShadow: '0 1px 2px rgba(10,13,18,0.05)', cursor: !canChangeActiveStatus ? 'not-allowed' : 'pointer', width: '100%', boxSizing: 'border-box' }}
                >
                  <span style={{ color: '#1A191B', fontWeight: 500 }}>{shownActive === false ? 'Ẩn' : 'Hiển thị'}</span>
                  {canChangeActiveStatus && (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isStatusOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path d="M5 7.5L10 12.5L15 7.5"/>
                    </svg>
                  )}
                </div>
                {canChangeActiveStatus && isStatusOpen && (
                  <div className="custom-options-list" style={{ zIndex: 50 }}>
                    <div 
                      className={`custom-option ${shownActive === false ? 'selected' : ''}`} 
                      onClick={() => handleToggleActive(false)}
                    >
                      Ẩn
                    </div>
                    <div 
                      className={`custom-option ${shownActive === true  ? 'selected' : ''}`} 
                      onClick={() => handleToggleActive(true)}
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
              createdAt={formatDateTime(criteriaData.createdAt)} 
              version={criteriaData.version ?? 0}
              versions={criteriaData.versions || []}
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
                {criteriaData.comments && criteriaData.comments.length > 0 ? (
                  criteriaData.comments.map((c: any, index: number) => (
                    <React.Fragment key={c.id || index}>
                      <div className="commentItem">
                        <div className="userInfo">
                          <img src={c.avatarUrl || getRandomAvatar(c.createdBy || index)} className="avatar" alt="avatar" />
                          <div style={{ flex: 1 }}>
                            <div className="userHeader">
                              <span className="userName">
                                {getFullName(extractBaseId(c.createdBy), userMap) || c.createdBy || 'Người kiểm duyệt'}
                              </span>
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

      <ActionConfirmModal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction) {
            const act = confirmAction;
            setConfirmAction(null);
            handleUpdateCriteria(act);
          }
        }}
        variant={confirmAction === 'DRAFT' || confirmAction === 'NEEDS_REVISION' ? 'draft' : 'submit'}
        title={confirmAction === 'DRAFT' || confirmAction === 'NEEDS_REVISION' ? 'Xác nhận lưu nháp' : 'Xác nhận gửi phê duyệt'}
        desc={confirmAction === 'DRAFT' || confirmAction === 'NEEDS_REVISION' ? 'Bạn có chắc chắn muốn lưu bản nháp tiêu chí không?' : 'Bạn có chắc chắn muốn gửi phê duyệt tiêu chí không?'}
        confirmText={confirmAction === 'DRAFT' || confirmAction === 'NEEDS_REVISION' ? 'Lưu nháp' : 'Gửi phê duyệt'}
      />

      <DuplicateVersionModal
        isOpen={showDuplicateModal}
        itemName={criteriaData?.name || 'tiêu chí này'}
        priorVersion={priorConflict}
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
          if (!priorConflict) return;
          try {
            setIsDeletingPrior(true);
            const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
            const delRes = await fetch(API_ENDPOINTS.PRODUCT_CRITERIA.DELETE(priorConflict.id), {
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
                handleUpdateCriteria(target as any);
              }
            } else {
              const err = await delRes.json();
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
        itemType="criteria"
        versionItem={previewVersionItem}
      />

      <ActionConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={executeDelete}
        variant="delete"
        title="Xác nhận xóa"
        desc="Bạn có chắc chắn muốn xóa tiêu chí này không? Hành động này không thể hoàn tác."
        confirmText="Xóa"
      />

      <CascadeHideModal
        isOpen={showCascadeModal}
        onClose={() => setShowCascadeModal(false)}
        onConfirm={() => executeToggleActive(false, true)}
        itemTypeLabel="tiêu chí"
        itemName={formData.name || criteriaData?.name || ''}
        counts={cascadeCounts}
        isProcessing={isCascadeProcessing}
      />
      {dialog}
    </div>
  );
};

export default DetailCriteriaPage;