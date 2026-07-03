import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './DetailGroupPage.css'; // File CSS chứa style giao diện
import toast from 'react-hot-toast';
import Quill from 'quill';
import 'quill/dist/quill.snow.css'; 
import Cropper from 'react-easy-crop';
import axios from 'axios';

import { API_ENDPOINTS } from '../config/apiConfig';


interface Criterion {
  id: string;
  name: string;
  isRequired: boolean;
  isSelected: boolean; 
  value: string; 
}

interface QuillEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  hasError?: boolean;
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange, placeholder, hasError }) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (!editorRef.current || !toolbarRef.current || quillInstanceRef.current) return;

    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder: placeholder || 'Nhập nội dung...',
      modules: {
        toolbar: toolbarRef.current 
      }
    });

    quillInstanceRef.current = quill;

    if (value && quill.root.innerHTML !== value) {
      quill.root.innerHTML = value;
    }

    quill.on('text-change', () => {
      const html = quill.root.innerHTML;
      const textContent = quill.getText().trim();
      if (textContent.length === 0) {
        onChange('');
      } else {
        onChange(html);
      }
    });

    // DỌN DẸP DOM: Tránh lỗi nhân đôi thanh công cụ trong React Strict Mode
    return () => {
      quillInstanceRef.current = null;
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    };
  }, []);

  useEffect(() => {
    if (quillInstanceRef.current) {
      const currentHtml = quillInstanceRef.current.root.innerHTML;
      if (value !== currentHtml && !(value === '' && currentHtml === '<p><br></p>')) {
        quillInstanceRef.current.clipboard.dangerouslyPasteHTML(value || '');
      }
    }
  }, [value]);

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: hasError ? '1px solid #EF4444' : '1px solid #D1D5DB' }}>
      <div ref={toolbarRef} className="ql-toolbar ql-snow" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '8px 12px' }}>
        <span className="ql-formats">
          <button className="ql-bold" />
          <button className="ql-italic" />
          <button className="ql-underline" />
          <button className="ql-strike" />
        </span>
        <span className="ql-formats">
          <button className="ql-list" value="ordered" />
          <button className="ql-list" value="bullet" />
        </span>
        <span className="ql-formats">
          <button className="ql-script" value="sub" />
          <button className="ql-script" value="super" />
        </span>
        <span className="ql-formats">
          <button className="ql-indent" value="-1" />
          <button className="ql-indent" value="+1" />
        </span>
        <span className="ql-formats">
          <select className="ql-color" />
          <select className="ql-background" />
        </span>
        <span className="ql-formats">
          <select className="ql-align" />
        </span>
        <span className="ql-formats">
          <button className="ql-clean" />
        </span>
      </div>
      <div ref={editorRef} style={{ minHeight: '120px', fontSize: '15px', border: 'none' }} />
    </div>
  );
};



// --- HÀM UTILS HỖ TRỢ CẮT ẢNH SỬ DỤNG CANVAS ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); 
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas rỗng'));
        return;
      }
      resolve(new File([blob], 'cropped_image.jpeg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.95);
  });
}

// --- COMPONENT CHÍNH ---
const AddProductPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [isGroupOpen, setIsGroupOpen] = useState(false); 
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isOperationOpen, setIsOperationOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false); 

  const groupRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const operationRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null); 
  // REF DUY NHẤT CHO THẺ INPUT FILE
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [groupOptions, setGroupOptions] = useState<{ label: string; value: string }[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: string }[]>([]);
  const [operationOptions, setOperationOptions] = useState<{ label: string; value: string }[]>([]);

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);

  const [showCriteriaModal, setShowCriteriaModal] = useState(false);

  // --- STATE UPLOAD & CẮT ẢNH ---
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(''); 
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [isActive, setIsActive] = useState<boolean>(true); 
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  
  const [formData, setFormData] = useState({
    productGroupId: '',   
    productCategoryId: '', 
    businessId: ''        
  });

  // --- DỌN DẸP BỘ NHỚ KHI ĐÓNG MODAL / ĐỔI ẢNH ---
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(event.target as Node)) setIsGroupOpen(false);
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) setIsCategoryOpen(false);
      if (operationRef.current && !operationRef.current.contains(event.target as Node)) setIsOperationOpen(false);
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) setIsStatusOpen(false); 
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
  const fetchActiveGroups = async () => {
      try {
        setLoadingGroups(true);
        const response = await axios.get(API_ENDPOINTS.PRODUCT_GROUPS.LIST, {
          params: { status: 'ACTIVE', active: true }
        });
        setGroupOptions(response.data.map((c: any) => ({ label: c.name, value: c.id })));
      } catch (error) {
        console.error("Lỗi fetch groups:", error);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchActiveGroups();
  }, []);

  useEffect(() => {
    if (!formData.productGroupId) {
      setCategoryOptions([]);
      setOperationOptions([]);
      setCriteria([]);
      return;
    }
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await axios.get(API_ENDPOINTS.PRODUCT_CATEGORY.LIST, {
          params: { status: 'ACTIVE', active: true , types: formData.productGroupId }
        });
        setCategoryOptions(response.data.map((c: any) => ({ label: c.name, value: c.id })));
      } catch (error) {
        console.error("Lỗi fetch categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };
    const fetchCriteriaByGroup = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.PRODUCT_CRITERIA.LIST, {
          params: { types: formData.productGroupId, status: 'ACTIVE' , active: true }
        });
        
        const formattedCriteria: Criterion[] = response.data.map((item: any) => ({
          id: item.id || item.criteriaId,
          name: item.name,
          isRequired: item.isRequired,
          isSelected: item.isRequired ? true : false,
          value: ''
        })).sort((a: any, b: any) => Number(b.isRequired) - Number(a.isRequired));
         
      } catch (error) {
        console.error("Lỗi fetch criteria:", error);
      }
    };
    fetchCategories();
    fetchCriteriaByGroup();
  }, [formData.productGroupId]);

  useEffect(() => {
    if (!formData.productCategoryId) {
      setOperationOptions([]);
      return;
    }
    const fetchOperations = async () => {
      try {
        setLoadingOperations(true);
        const response = await axios.get(API_ENDPOINTS.PRODUCT_BUSINESS.LIST, {
          params: { status: 'ACTIVE' , active: true , categoryIds: formData.productCategoryId }
        });
        setOperationOptions(response.data.map((o: any) => ({ label: o.name, value: o.id })));
      } catch (error) {
        console.error("Lỗi fetch business:", error);
      } finally {
        setLoadingOperations(false);
      }
    };
    fetchOperations();
  }, [formData.productCategoryId]); 

  const handleCriterionValueChange = (id: string, newValue: string) => {
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, value: newValue } : c));
  };

  const toggleCriterionSelection = (id: string) => {
    setCriteria(prev => prev.map(c => {
      if (c.id === id && !c.isRequired) {
        return { ...c, isSelected: !c.isSelected };
      }
      return c;
    }));
  };

  // --- LOGIC XỬ LÝ ẢNH MỚI ---
  const handleSelectFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn định dạng hình ảnh');
      return;
    }
    // Thu hồi link blob cũ tránh leak bộ nhớ
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]); 
      setShowImageModal(true); 
      // Reset input để chọn lại file cũ không bị lỗi
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const submitImageUpload = async () => {
    if (!previewUrl || !croppedAreaPixels) {
      toast.error("Vui lòng chọn và căn chỉnh vùng cắt ảnh");
      return;
    }
    setIsUploading(true);
    
    try {
      // Cách này không dùng fetch, tránh được lỗi CORS ở layer network
      const croppedFile = await getCroppedImg(previewUrl, croppedAreaPixels);
      
      if (!croppedFile) {
        throw new Error("Xảy ra lỗi trong quá trình xử lý cắt ảnh");
      }

      const uploadData = new FormData();
      uploadData.append('file', croppedFile);

      const response = await fetch('/api/v1/files/upload', { 
        method: 'POST',
        body: uploadData,
      });

      if (!response.ok) throw new Error("Upload thất bại");

      const data = await response.json(); 
      setImageUrl(data.url);  
      setShowImageModal(false);
      setPreviewUrl(null);
      toast.success("Cập nhật ảnh thành công");
    } catch (error: any) {
      console.error(error);
      toast.error("Lỗi: Server từ chối truy cập ảnh. Hãy kiểm tra cấu hình CORS.");
    } finally {
      setIsUploading(false);
    }
};

  const handleGoBack = () => navigate('/products/processing');

  const handleCreateProduct = async (status: 'DRAFT' | 'ACTIVE' | 'PENDING_APPROVAL') => {
    if (!formData.productGroupId) {
      toast.error("Vui lòng chọn Nhóm sản phẩm", { position: 'top-center' });
      return;
    }
    
    if (status !== 'DRAFT') {
      const missingRequiredCriterion = criteria.find(c => c.isRequired && !c.value.trim());
      if (missingRequiredCriterion) {
        toast.error(`Vui lòng nhập nội dung cho tiêu chí bắt buộc: ${missingRequiredCriterion.name}`, { 
          position: 'top-center' 
        });
        return; 
      }
    }

    const activeCriteriaPayload = criteria
      .filter(c => c.isSelected)
      .map(c => ({
        criteriaId: c.id,
        value: c.value.trim()
      }));

    const payload: any = { 
      productGroupId: formData.productGroupId,
      status: status,
      criteria: activeCriteriaPayload,
      imageUrl: imageUrl || null,
      active: isActive
    };

    if (formData.productCategoryId) payload.productCategoryId = formData.productCategoryId;
    if (formData.businessId) payload.businessId = formData.businessId;

    try {
      await axios.post(API_ENDPOINTS.PRODUCT.LIST, payload);
      toast.success(status === 'DRAFT' ? "Lưu nháp sản phẩm thành công" : "Gửi phê duyệt sản phẩm thành công", { position: 'top-center' });
      setTimeout(() => navigate('//products/processing'), 2000);
    } catch (error: any) {
      console.error("Lỗi gửi request:", error);
      const errMsg = error.response?.data?.message || "Không thể kết nối đến server.";
      toast.error(errMsg, { position: 'top-center' });
    }
  };
  const canSubmit = formData.productGroupId !== '';

  return (
    <div className="pageWrapper">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/png, image/jpeg, image/jpg" 
        style={{ display: 'none' }} 
      />
      
      <div className="mainContainer">
        
        {/* HEADER */}
        <div className="header">
          <div className="headerLeft">
            <button className="btnBack" onClick={handleGoBack}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12.6667 6.83333H1M6.83333 1L1 6.83333L6.83333 12.6667" stroke="#3C393F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="breadcrumbText">Danh sách sản phẩm</span>
            </button>
            <div className="breadcrumb">
              <div className="separatorWrapper"><svg width="5" height="9" viewBox="0 0 5 9" fill="none"><path d="M0.5 8.5L4.5 4.5L0.5 0.5" stroke="#171717" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
              <span className="breadcrumbActive">Tạo mới sản phẩm</span>
            </div>
          </div>

          <div className="headerRight">
             <button 
              className={`btnDraft ${canSubmit ? 'active' : 'disabled'}`} 
              disabled={!canSubmit} 
              onClick={() => handleCreateProduct('DRAFT')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }} 
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 8V21H3V8M1 3H23V8H1V3ZM10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Lưu nháp
            </button>
            <button 
              className={`btnSubmit ${canSubmit ? 'active' : 'disabled'}`} 
              disabled={!canSubmit} 
              onClick={() => handleCreateProduct('PENDING_APPROVAL')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }} 
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Gửi phê duyệt
            </button>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="contentGrid">
          
          {/* CỘT BÊN TRÁI: FORM NHẬP LIỆU */}
          <div className="leftCol">
            <div className="formCard" style={{ padding: '24px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
              
              {/* 1. PRODUCT GROUP */}
              <div className="formGroup" style={{ marginBottom: '16px' }}>
                <label className="label" style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>Nhóm sản phẩm (*)</label>
                <div className="custom-select-container" ref={groupRef}>
                  <div className={`select-custom ${isGroupOpen ? 'open' : ''}`} onClick={() => setIsGroupOpen(!isGroupOpen)} style={{ backgroundColor: 'white' }}>
                    <span>{loadingGroups ? "Đang tải..." : (groupOptions.find(o => o.value === formData.productGroupId)?.label || "Chọn nhóm")}</span>
                  </div>
                  {isGroupOpen && (
                    <div className="custom-options-list">
                      {groupOptions.map((opt) => (
                        <div key={opt.value} className={`custom-option ${formData.productGroupId === opt.value ? 'selected' : ''}`}
                          onClick={() => { 
                            setFormData({ productGroupId: opt.value, productCategoryId: '', businessId: '' }); 
                            setIsGroupOpen(false); 
                          }}>
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2 & 3. PRODUCT CATEGORY & BUSINESS */}
              <div style={{ display: 'flex', gap: '20px' }}>
                <div className="formGroup" style={{ flex: 1 }}>
                  <label className="label" style={{ fontWeight: 600, marginBottom: '8px', display: 'block', color: formData.productGroupId ? '#171717' : '#9CA3AF' }}>
                    Danh mục sản phẩm {!formData.productGroupId}
                  </label>
                  <div className="custom-select-container" ref={categoryRef}>
                    <div 
                      className={`select-custom ${isCategoryOpen ? 'open' : ''} ${!formData.productGroupId ? 'disabled' : ''}`} 
                      onClick={() => formData.productGroupId && setIsCategoryOpen(!isCategoryOpen)} 
                      style={{ backgroundColor: formData.productGroupId ? 'white' : '#E5E7EB', cursor: formData.productGroupId ? 'pointer' : 'not-allowed' }}
                    >
                      <span>{loadingCategories ? "Đang tải..." : (categoryOptions.find(o => o.value === formData.productCategoryId)?.label || "Chọn danh mục")}</span>
                    </div>
                    {isCategoryOpen && formData.productGroupId && (
                      <div className="custom-options-list">
                        <div className="custom-option" onClick={() => { 
                          setFormData({...formData, productCategoryId: '', businessId: ''}); 
                          setIsCategoryOpen(false); 
                        }}><i>-- Bỏ chọn --</i></div>
                        {categoryOptions.map((opt) => (
                          <div key={opt.value} className={`custom-option ${formData.productCategoryId === opt.value ? 'selected' : ''}`}
                            onClick={() => { 
                              setFormData({...formData, productCategoryId: opt.value, businessId: ''}); 
                              setIsCategoryOpen(false); 
                            }}>{opt.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="formGroup" style={{ flex: 1 }}>
                  <label className="label" style={{ fontWeight: 600, marginBottom: '8px', display: 'block', color: formData.productCategoryId ? '#171717' : '#9CA3AF' }}>
                    Nghiệp vụ {!formData.productCategoryId}
                  </label>
                  <div className="custom-select-container" ref={operationRef}>
                    <div 
                      className={`select-custom ${isOperationOpen ? 'open' : ''} ${!formData.productCategoryId ? 'disabled' : ''}`} 
                      onClick={() => formData.productCategoryId && setIsOperationOpen(!isOperationOpen)} 
                      style={{ backgroundColor: formData.productCategoryId ? 'white' : '#E5E7EB', cursor: formData.productCategoryId ? 'pointer' : 'not-allowed' }}
                    >
                      <span>{loadingOperations ? "Đang tải..." : (operationOptions.find(o => o.value === formData.businessId)?.label || "Chọn nghiệp vụ")}</span>
                    </div>
                    {isOperationOpen && formData.productCategoryId && (
                      <div className="custom-options-list">
                        <div className="custom-option" onClick={() => { setFormData({...formData, businessId: ''}); setIsOperationOpen(false); }}><i>-- Bỏ chọn --</i></div>
                        {operationOptions.map((opt) => (
                          <div key={opt.value} className={`custom-option ${formData.businessId === opt.value ? 'selected' : ''}`}
                            onClick={() => { setFormData({...formData, businessId: opt.value}); setIsOperationOpen(false); }}>{opt.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CRITERIA LIST */}
              {criteria.filter(c => c.isSelected).map((criterion) => (
                <div key={criterion.id} className="formGroup" style={{ marginBottom: '24px', marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {!criterion.isRequired && (
                      <button
                        type="button"
                        onClick={() => toggleCriterionSelection(criterion.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#9CA3AF', transition: 'color 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#EF4444'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#9CA3AF'}
                        title="Bỏ tiêu chí thừa"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    )}
                    <label className="label" style={{ fontWeight: 600, margin: 0 }}>
                      {criterion.name} {criterion.isRequired && <span style={{ color: '#EF4444' }}>(*)</span>}
                    </label>
                  </div>
                  <QuillEditor 
                    value={criterion.value}
                    placeholder={criterion.isRequired ? "Tiêu chí này bắt buộc phải nhập..." : "Nhập nội dung chi tiết..."}
                    hasError={criterion.isRequired && !criterion.value.trim()}
                    onChange={(newHtmlContent) => handleCriterionValueChange(criterion.id, newHtmlContent)}
                  />
                  {criterion.isRequired && !criterion.value.trim() && (
                    <span style={{ color: '#EF4444', fontSize: '13px', marginTop: '6px', display: 'block', fontWeight: 500 }}>
                      ⚠️ Trường bắt buộc, vui lòng nhập nội dung.
                    </span>
                  )}
                </div>
              ))}

              {/* Nút Thêm tiêu chí */}
              {formData.productGroupId && (
                <div style={{ textAlign: 'left', marginTop: '16px' }}>
                  <button 
                    type="button"
                    onClick={() => setShowCriteriaModal(true)} 
                    style={{ color: '#10B981', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer', padding: '0' }}
                  >
                    + Thêm tiêu chí
                  </button>
                </div>
              )}
              
              {/* KHU VỰC ẢNH MÔ TẢ ĐÃ ĐƯỢC LÀM GỌN */}
              <div className="formGroup" style={{ marginBottom: '20px', marginTop: '16px' }}>
                <label className="label" style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
                  Ảnh mô tả
                </label>
                
                {imageUrl ? (
                  <div className="product-image-wrapper" style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
                    {/* SỬA: Đảm bảo src lấy ảnh qua Proxy bằng cách KHÔNG để domain localhost:8082 ở đây */}
                    <img 
                      src={imageUrl.startsWith('http') ? imageUrl : imageUrl} 
                      alt="Product" 
                      className="product-image" 
                      style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 12, border: '1px solid #E5E7EB', display: 'block' }}
                    />
                    
                    <div className="image-overlay">
                      <button 
                        type="button" 
                        className="overlay-btn" 
                        onClick={() => {
                        // Thay vì hardcode, hãy tách chuỗi hoặc dùng URL object
                        const cleanPath = imageUrl.replace(/^(https?:\/\/[^\/]+)/, '');
                        setPreviewUrl(cleanPath); 
                        setShowImageModal(true);
                      }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      
                      <button 
                        type="button" 
                        className="overlay-btn" 
                        onClick={() => { 
                          setImageUrl(''); 
                          setPreviewUrl(null);    
                          setSelectedFile(null);  
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowImageModal(true)}
                    className="upload-placeholder"
                    style={{width:'100%',maxWidth:420,aspectRatio:'16 / 9',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',border:'2px dashed #D1D5DB',borderRadius:12,background:'#F9FAFB',cursor:'pointer',color:'#6B7280',transition:'all 0.2s'}}
                    onMouseOver={e => {e.currentTarget.style.borderColor='#AE1C3F'; e.currentTarget.style.background='#FDF2F4';}}
                    onMouseOut={e => {e.currentTarget.style.borderColor='#D1D5DB'; e.currentTarget.style.background='#F9FAFB';}}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                      <p style={{ margin: '12px 0 4px', fontSize: 14, color: '#6B7280' }}>Kéo và thả ảnh tại đây hoặc</p>
                      <span style={{ color: '#10B981', fontWeight: 600, fontSize: '15px' }}>Chọn file</span>
                      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9CA3AF' }}>PNG, JPG, WEBP · Tối đa 10MB</p>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CỘT BÊN PHẢI: TRẠNG THÁI HIỂN THỊ & BÌNH LUẬN */}
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

             {/* 2. CARD BÌNH LUẬN */}
             <div className="commentCard emptyComment">
              <div className="commentHeader">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M21 11.5C21 16.1944 17.1944 20 12.5 20C11.1327 20 9.84307 19.6765 8.7033 19.1022L3 21L4.8978 15.2967C4.32354 14.1569 4 12.8673 4 11.5C4 6.80558 7.80558 3 12.5 3C17.1944 3 21 6.80558 21 11.5Z" stroke="#AE1C3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="commentTitle">Bình luận</span>
                </div>
                Bình luận sẽ hiển thị sau khi sản phẩm được khởi tạo.
            </div>
          </div>
        </div>
      </div>

      {/* MODAL THÊM TIÊU CHÍ */}
      {showCriteriaModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '460px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px 16px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>Thêm tiêu chí</h3>
              <button onClick={() => setShowCriteriaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', maxHeight: '400px', padding: '8px 0' }}>
              {criteria.filter(c => !c.isRequired).map((c) => (
                <div
                  key={c.id}
                  onClick={() => toggleCriterionSelection(c.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', cursor: 'pointer', backgroundColor: c.isSelected ? '#FDF2F4' : 'transparent', borderBottom: '1px solid #F3F4F6' }}
                >
                  <span style={{ fontSize: '15px', fontWeight: c.isSelected ? 500 : 400, color: c.isSelected ? '#111827' : '#374151', userSelect: 'none' }}>
                    {c.name}
                  </span>
                  {c.isSelected && (
                    <svg width="16" height="16" viewBox="0 0 16 12" fill="none">
                      <path d="M1.33334 6.00001L5.33334 10L14.6667 1.33334" stroke="#AE1C3F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F9FAFB', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
              <button onClick={() => setShowCriteriaModal(false)} style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', fontWeight: 500, cursor: 'pointer', fontSize: '14px' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM HÌNH ẢNH (TÍCH HỢP KHUNG CẮT ẢNH 16:9) */}
      {showImageModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '600px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                {previewUrl ? 'Căn chỉnh & Cắt ảnh (16:9)' : 'Thêm hình ảnh'}
              </h3>
              <button onClick={() => { setShowImageModal(false); setSelectedFile(null); setPreviewUrl(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {!previewUrl ? (
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  style={{ border: `1.5px dashed ${isDragging ? '#10B981' : '#E5E7EB'}`, borderRadius: '8px', padding: '40px 20px', textAlign: 'center', backgroundColor: isDragging ? '#F0FDF4' : 'transparent', transition: 'all 0.2s ease', position: 'relative' }}
                >                  
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  </div>
                  <p style={{ margin: '12px 0 4px', fontSize: 14, color: '#6B7280' }}>Kéo và thả ảnh tại đây hoặc</p>
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#10B981', fontWeight: 600, fontSize: '15px', cursor: 'pointer', padding: 0 }}>Chọn file</button>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9CA3AF' }}>PNG, JPG, WEBP · Tối đa 10MB</p>
                </div>
                
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ position: 'relative', width: '100%', height: '320px', backgroundColor: '#F3F4F6', borderRadius: '8px', overflow: 'hidden' }}>
                    <Cropper
                      image={previewUrl}
                      crop={crop}
                      zoom={zoom}
                      aspect={16 / 9} 
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                    <span style={{ fontSize: '14px', color: '#4B5563', fontWeight: 500, minWidth: '70px' }}>Thu phóng:</span>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.05}
                      aria-labelledby="Zoom"
                      onChange={(e) => setZoom(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#AE1C3F', cursor: 'pointer' }}
                    />
                    {/* Trỏ về fileInputRef tổng thay vì tự render thẻ input */}
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: '#3B82F6', 
                        cursor: 'pointer', 
                        fontSize: '14px', 
                        fontWeight: 600, 
                        marginLeft: '8px' 
                      }}
                    >
                      Chọn ảnh khác
                    </button>                    
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E5E7EB' }}>
              <button type="button" onClick={() => { setShowImageModal(false); setSelectedFile(null); setPreviewUrl(null); }} style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#E5E7EB', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }} disabled={isUploading}>Hủy</button>
              <button 
                type="button"
                onClick={submitImageUpload} 
                disabled={!previewUrl || isUploading} 
                style={{ 
                  padding: '8px 24px', 
                  borderRadius: '6px', 
                  border: 'none', 
                  backgroundColor: '#AE1C3F', 
                  color: 'white', 
                  fontWeight: 600, 
                  cursor: (!previewUrl || isUploading) ? 'not-allowed' : 'pointer', 
                  fontSize: '14px', 
                  opacity: (!previewUrl || isUploading) ? 0.7 : 1 
                }}
              >
                {isUploading ? 'Đang tải...' : 'Cắt & Tải lên'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddProductPage;