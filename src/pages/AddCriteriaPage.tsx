import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './DetailGroupPage.css'; // Dùng chung CSS để đồng bộ giao diện
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/apiConfig';
import ActionConfirmModal from '../components/ui/ActionConfirmModal';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { FIELD_LIMITS, getNameError, getCodeError } from '../utils/fieldValidation';
import CharCountHint from '../components/ui/CharCountHint';
import { useCloseOnOutsideClick } from '../hooks/useCloseOnOutsideClick';
import { useSubmitLock, draftActionLabel, submitActionLabel } from '../hooks/useSubmitLock';
import SuperGroupNestedSelect, { formatSelectedGroupsLabel, SUPER_GROUP_OPTIONS } from '../components/ui/SuperGroupNestedSelect';

const AddCriteriaPage: React.FC = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false); 
  const statusRef = useRef<HTMLDivElement>(null); 
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // --- STATES ---
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSuperGroup, setSelectedSuperGroup] = useState('');
  const [showSuperList, setShowSuperList] = useState(true);
  const [groupOptions, setGroupOptions] = useState<{ label: string; value: string; superGroup?: string }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // State lưu từ khóa tìm kiếm nhóm

  // --- STATES CHO FORM ---

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    groupIds: [] as string[],
    required: false,
    active: true
  });

  // --- EFFECT: ĐÓNG DROPDOWN KHI BẤM RA NGOÀI ---
  useCloseOnOutsideClick([
    { ref: dropdownRef, close: () => setIsOpen(false) },
    { ref: statusRef, close: () => setIsStatusOpen(false) },
  ]);

  // --- EFFECT: RESET TỪ KHÓA TÌM KIẾM KHI ĐÓNG DROPDOWN ---
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  // --- FETCH NHÓM SẢN PHẨM ---
  useEffect(() => {
    const fetchActiveGroups = async () => {
      try {
        setLoadingGroups(true);
        const response = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
          params: { status: 'ACTIVE', active: true }
        });

        const options = response.data.map((g: any) => ({
          label: g.name,
          value: String(g.id),
          superGroup: g.superGroup || '',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const visibleGroupOptions = groupOptions.filter(opt => opt.superGroup === selectedSuperGroup);

  const handleToggleGroup = (id: string) => {
    setFormData(prev => {
      const isExist = prev.groupIds.includes(id);
      const updatedIds = isExist 
        ? prev.groupIds.filter(item => item !== id)
        : [...prev.groupIds, id];
      return { ...prev, groupIds: updatedIds };
    });
  };

  const handleToggleSelectAll = () => {
    setFormData(prev => {
      const allIds = visibleGroupOptions.map(opt => opt.value);
      const allSelected = allIds.length > 0 && allIds.every(id => prev.groupIds.includes(id));
      if (allSelected) {
        return { ...prev, groupIds: prev.groupIds.filter(id => !allIds.includes(id)) };
      }
      return { ...prev, groupIds: [...new Set([...prev.groupIds, ...allIds])] };
    });
  };

  const handleSelectSuperGroup = (value: string) => {
    setSelectedSuperGroup(value);
    setShowSuperList(false);
    setSearchTerm('');
    setIsOpen(true);
  };

  const handleBackToSuperGroups = () => {
    setShowSuperList(true);
    setSearchTerm('');
    setIsOpen(true);
  };

  const handleGoBack = () => navigate('/criteria-management');

  const getSelectedGroupsLabel = () => {
    if (loadingGroups) return "Đang tải nhóm sản phẩm...";
    return formatSelectedGroupsLabel(groupOptions, formData.groupIds, "Chọn nhóm sản phẩm");
  };

  const selectedCountBySuperGroup = SUPER_GROUP_OPTIONS.reduce((acc, sg) => {
    acc[sg.value] = groupOptions.filter(opt => opt.superGroup === sg.value && formData.groupIds.includes(opt.value)).length;
    return acc;
  }, {} as Record<string, number>);

  const [confirmAction, setConfirmAction] = useState<'DRAFT' | 'PENDING_APPROVAL' | null>(null);
  const { isSubmitting, submitKind, beginSubmit, endSubmit } = useSubmitLock();

  // --- VALIDATE FORM TRƯỚC KHI LƯU NHÁP HOẶC MỞ MODAL DUYỆT ---
  const onSaveDraftClick = () => {
    const codeErr = getCodeError(formData.code, 'Mã tiêu chí');
    if (codeErr) {
      toast.error(codeErr, { position: 'top-center' });
      return;
    }
    const nameErr = getNameError(formData.name, 'Tên tiêu chí');
    if (nameErr) {
      toast.error(nameErr, { position: 'top-center' });
      return;
    }
    setConfirmAction('DRAFT');
  };

  const onSubmitClick = () => {
    if (!formData.code.trim()) {
      toast.error("Vui lòng nhập mã tiêu chí", { position: 'top-center' });
      return;
    }
    const codeErr = getCodeError(formData.code, 'Mã tiêu chí');
    if (codeErr) {
      toast.error(codeErr, { position: 'top-center' });
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên tiêu chí", { position: 'top-center' });
      return;
    }
    const nameErr = getNameError(formData.name, 'Tên tiêu chí');
    if (nameErr) {
      toast.error(nameErr, { position: 'top-center' });
      return;
    }
    if (formData.groupIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một nhóm sản phẩm áp dụng", { position: 'top-center' });
      return;
    }
    setConfirmAction('PENDING_APPROVAL');
  };

  // Gửi API thực tế sau khi chọn người kiểm duyệt từ Modal hoặc lưu nháp
  const submitCriteriaData = async (status: 'DRAFT' | 'PENDING_APPROVAL', approvedBy?: string) => {
    if (!beginSubmit(status === 'DRAFT' ? 'draft' : 'submit')) return;
    const codeErr = getCodeError(formData.code, 'Mã tiêu chí');
    if (codeErr) {
      toast.error(codeErr, { position: 'top-center' });
      endSubmit();
      return;
    }
    const nameErr = getNameError(formData.name, 'Tên tiêu chí');
    if (nameErr) {
      toast.error(nameErr, { position: 'top-center' });
      endSubmit();
      return;
    }
    try {
      await axios.post(API_ENDPOINTS.PRODUCT_CRITERIA.LIST, {
        code: formData.code.trim() || undefined,
        name: formData.name.trim() || undefined,
        groupIds: formData.groupIds.length > 0 ? formData.groupIds : undefined,
        status,
        required: formData.required ?? false,
        active: isActive ?? false,
        approvedBy: approvedBy || null
      });

      const message = status === 'DRAFT' ? "Lưu nháp thành công" : "Gửi phê duyệt thành công";
      renderCustomToast(message);
      setConfirmAction(null);
      allowLeave();
      setTimeout(() => navigate('/criteria-management'), 400);

    } catch (error: any) {
      console.error("Lỗi API:", error);
      const errorMessage = error.response?.data?.message || 'Mã hoặc tên tiêu chí đã tồn tại trên hệ thống';
      toast.error(errorMessage, { position: 'top-center' });
      endSubmit();
    }
  };

  const renderCustomToast = (message: string) => {
    toast.success(message);
  };

  const isFormDirty =
    formData.code.trim() !== '' ||
    formData.name.trim() !== '' ||
    formData.groupIds.length > 0 ||
    formData.required ||
    isActive !== true;
  const { allowLeave, dialog } = useUnsavedChangesGuard(isFormDirty);

  const canSaveDraft = !isSubmitting;
  const canSubmit = formData.code.trim() !== '' && formData.name.trim() !== '' && formData.groupIds.length > 0 && !isSubmitting;

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
              className={`btnDraft ${canSaveDraft ? 'active' : 'disabled'}`} 
              disabled={!canSaveDraft} 
              onClick={onSaveDraftClick}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }} 
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 8V21H3V8M1 3H23V8H1V3ZM10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {draftActionLabel(isSubmitting, submitKind)}
            </button>
            <button 
              className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} 
              disabled={!canSubmit} 
              onClick={onSubmitClick}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }} 
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {submitActionLabel(isSubmitting, submitKind)}
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="contentGrid">
          <div className="leftCol">
            <div className="formCard" style={{ overflow: 'visible' }}>

              {/* INPUT MÃ TIÊU CHÍ */}
              <div className="formGroup">
                <label className="label"> Mã tiêu chí <span style={{ color: '#EF4444' }}>(*)</span></label>
                <input 
                  type="text" 
                  name="code" 
                  className={`input ${getCodeError(formData.code, 'Mã tiêu chí') ? 'input-invalid' : ''}`}
                  placeholder="Nhập mã tiêu chí..."
                  value={formData.code} 
                  onChange={handleInputChange} 
                />
                <CharCountHint
                  current={formData.code.length}
                  max={FIELD_LIMITS.code}
                  error={getCodeError(formData.code, 'Mã tiêu chí')}
                />
              </div>

              {/* INPUT TÊN TIÊU CHÍ */}
              <div className="formGroup">
                <label className="label"> Tên tiêu chí <span style={{ color: '#EF4444' }}>(*)</span></label>
                <input 
                  type="text" 
                  name="name" 
                  className={`input ${getNameError(formData.name, 'Tên tiêu chí') ? 'input-invalid' : ''}`}
                  placeholder="Nhập tên tiêu chí..."
                  value={formData.name} 
                  onChange={handleInputChange} 
                />
                <CharCountHint
                  current={formData.name.length}
                  max={FIELD_LIMITS.name}
                  error={getNameError(formData.name, 'Tên tiêu chí')}
                />
              </div>
              
              <div className="formGroup" ref={dropdownRef}>
                <label className="label"> Nhóm sản phẩm áp dụng <span style={{ color: '#EF4444' }}>(*)</span></label>
                <SuperGroupNestedSelect
                  isOpen={isOpen}
                  onToggleOpen={() => setIsOpen(!isOpen)}
                  selectedSuperGroup={selectedSuperGroup}
                  showSuperList={showSuperList}
                  onSelectSuperGroup={handleSelectSuperGroup}
                  onBackToSuperGroups={handleBackToSuperGroups}
                  options={visibleGroupOptions}
                  selectedIds={formData.groupIds}
                  onToggleGroup={handleToggleGroup}
                  onToggleSelectAll={handleToggleSelectAll}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  closedLabel={getSelectedGroupsLabel()}
                  loading={loadingGroups}
                  selectedCountBySuperGroup={selectedCountBySuperGroup}
                />
              </div>

              {/* CHECKBOX BẮT BUỘC */}
              <div className="formGroup" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
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
          
          <div className="rightCol" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px', alignSelf: 'flex-start' }}>
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
                  <span style={{ color: 'var(--Token-Text-body-emphasis-color, #1A191B)', fontSize: '16px', fontWeight: 500, lineHeight: '24px' }}>
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
                      display: 'flex', padding: '8px 12px', alignItems: 'center', justifyContent: 'space-between', gap: '8px', alignSelf: 'stretch',
                      borderRadius: '8px', border: '1px solid #D5D7DA', background: '#FFF', boxShadow: '0 1px 2px rgba(10, 13, 18, 0.05)',
                      cursor: 'pointer', boxSizing: 'border-box', width: '100%'
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
                      <div className={`custom-option ${isActive === false ? 'selected' : ''}`} onClick={() => { setIsActive(false); setIsStatusOpen(false); }}>
                        Ẩn
                      </div>
                      <div className={`custom-option ${isActive === true ? 'selected' : ''}`} onClick={() => { setIsActive(true); setIsStatusOpen(false); }}>
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

      <ActionConfirmModal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction ? submitCriteriaData(confirmAction) : undefined}
        variant={confirmAction === 'DRAFT' ? 'draft' : 'submit'}
        title={confirmAction === 'DRAFT' ? 'Xác nhận lưu nháp' : 'Xác nhận gửi phê duyệt'}
        desc={confirmAction === 'DRAFT' ? 'Bạn có chắc chắn muốn lưu bản nháp tiêu chí không?' : 'Bạn có chắc chắn muốn gửi phê duyệt tiêu chí không?'}
        confirmText={confirmAction === 'DRAFT' ? 'Lưu nháp' : 'Gửi phê duyệt'}
        loading={isSubmitting}
      />
      {dialog}
    </div>
  );
};

export default AddCriteriaPage;