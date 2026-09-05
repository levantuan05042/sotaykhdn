import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { API_ENDPOINTS } from '../config/apiConfig';
import StatusBadge2 from '../components/ui/StatusBadgeListRequest';
import './BatchRequestDetailPage.css';

const extractUsername = (rawName: string | null | undefined): string => {
  if (!rawName) return '';
  return String(rawName).split('_')[0].trim().toLowerCase();
};

const stripHtml = (htmlString: string) => {
  if (!htmlString) return '';
  return htmlString.replace(/<\/?[^>]+(>|$)/g, '');
};

const isHtmlEmpty = (html: string) => {
  if (!html) return true;
  return html.replace(/<[^>]*>?/gm, '').trim().length === 0 && !html.includes('<img');
};

interface OptionItem {
  id: string;
  name: string;
}

interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GroupCacheData {
  categoryId: string;
  businessId: string;
  details: any[];
  addedOptionalIds: string[];
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });

const getCroppedBlob = async (src: string, px: PixelCrop): Promise<Blob> => {
  const img = await createImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = px.width;
  canvas.height = px.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, px.x, px.y, px.width, px.height, 0, 0, px.width, px.height);
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.92));
};

const toDisplayUrl = (raw: string) => {
  if (!raw) return '';
  if (raw.startsWith('http')) {
    return raw;
  }
  const cleanPath = raw.includes('/files/') 
    ? raw.substring(raw.indexOf('/files/')) 
    : `/files/products/${raw}`;
  return cleanPath; 
};

/* =========================================
   CUSTOM DROPDOWN COMPONENT
========================================= */
interface CustomSelectProps {
  label?: string;
  value: string;
  options: OptionItem[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, options, placeholder, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.id) === String(value));

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }} ref={dropdownRef}>
      {label && <label className="batch-form-label">{label}</label>}
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="batch-form-select"
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
          borderColor: isOpen ? '#AE1C3F' : '#D1D5DB',
          boxShadow: isOpen ? '0 0 0 3px rgba(174, 28, 63, 0.12)' : 'none',
          opacity: disabled ? 0.8 : 1,
          backgroundImage: disabled ? 'none' : undefined
        }}
      >
        <span style={{ color: selectedOption ? '#111827' : '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
      </div>

      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          zIndex: 100,
          maxHeight: '220px',
          overflowY: 'auto'
        }}>
          {options.length > 0 ? (
            options.map(opt => {
              const isSelected = String(opt.id) === String(value);
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: isSelected ? '#AE1C3F' : '#111827',
                    backgroundColor: isSelected ? '#FEF2F2' : '#FFFFFF',
                    fontWeight: isSelected ? '500' : '400',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#FEF2F2';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  {opt.name}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '10px 14px', fontSize: '14px', color: '#9CA3AF', textAlign: 'center' }}>
              Không có dữ liệu
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* =========================================
   IMAGE CROP MODAL COMPONENT
========================================= */
interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: File, blobUrl: string) => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<'drop' | 'crop'>('drop');
  const [dataUrl, setDataUrl] = useState('');        
  const [fileName, setFileName] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('drop');
      setDataUrl('');
      setFileName('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh (PNG, JPG, WEBP)');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDataUrl(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setStep('crop');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onCropComplete = useCallback((_pixelCrop: any, px: PixelCrop) => {
    setCroppedAreaPixels(px);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedBlob(dataUrl, croppedAreaPixels);
      const file = new File([blob], fileName || 'cropped.jpg', { type: 'image/jpeg' });
      onConfirm(file, URL.createObjectURL(blob));
    } catch (e) {
      console.error('Crop error:', e);
      toast.error('Cắt ảnh thất bại, vui lòng thử lại');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '600px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' }}>
            {step === 'crop' ? 'Căn chỉnh & Cắt ảnh (16:9)' : 'Thêm hình ảnh'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {step === 'drop' && (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `1.5px dashed ${isDragging ? '#10B981' : '#E5E7EB'}`, borderRadius: '8px', padding: '40px 20px', textAlign: 'center', backgroundColor: isDragging ? '#F0FDF4' : 'transparent', transition: 'all 0.2s ease', cursor: 'pointer' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <p style={{ margin: '12px 0 4px', fontSize: 14, color: '#6B7280' }}>Kéo và thả ảnh tại đây hoặc</p>
              <span style={{ color: '#10B981', fontWeight: 600, fontSize: '15px' }}>Chọn file</span>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9CA3AF' }}>PNG, JPG, WEBP · Tối đa 10MB</p>
            </div>
          )}

          {step === 'crop' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative', width: '100%', height: '320px', backgroundColor: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
                <Cropper
                  image={dataUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={16 / 9}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  showGrid={true}
                  style={{
                    containerStyle: { backgroundColor: '#1a1a1a' },
                    cropAreaStyle:  { border: '2px solid rgba(255,255,255,0.88)', color: 'rgba(0,0,0,0.55)' },
                  }}
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
                  onChange={e => setZoom(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#AE1C3F', cursor: 'pointer' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setStep('drop');
                    setDataUrl('');
                    setFileName('');
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: '14px', fontWeight: 600, marginLeft: '8px', whiteSpace: 'nowrap' }}
                >
                  Chọn ảnh khác
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E5E7EB' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#E5E7EB', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={step === 'drop' || !dataUrl || isProcessing}
            style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#AE1C3F', color: 'white', fontWeight: 600, fontSize: '14px', cursor: (step === 'drop' || !dataUrl || isProcessing) ? 'not-allowed' : 'pointer', opacity: (step === 'drop' || !dataUrl || isProcessing) ? 0.5 : 1 }}
          >
            {isProcessing ? 'Đang xử lý...' : 'Cắt & Tải lên'}
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
      />
    </div>
  );
};

/* =========================================
   CRITERIA MODAL COMPONENT (GIỐNG DETAIL PRODUCT)
========================================= */
interface CriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: any[];
  onToggle: (id: string) => void;
}

const CriteriaModal: React.FC<CriteriaModalProps> = ({ isOpen, onClose, criteria, onToggle }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1050, backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: 'white', borderRadius: 12, width: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>Thêm tiêu chí</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 400, padding: '8px 0' }}>
          {criteria.filter(c => !c.required).map(c => {
            const isSelected = c.isAdded || false;
            return (
              <div 
                key={c.id} 
                onClick={() => onToggle(c.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', cursor: 'pointer', backgroundColor: isSelected ? '#FDF2F4' : 'transparent', transition: 'background-color 0.2s', borderBottom: '1px solid #F3F4F6' }}
              >
                <span style={{ fontSize: 15, fontWeight: isSelected ? 500 : 400, color: isSelected ? '#111827' : '#374151', userSelect: 'none' }}>{c.tieuChi}</span>
                {isSelected && (
                  <svg width="16" height="16" viewBox="0 0 16 12" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M1.33334 6.00001L5.33334 10L14.6667 1.33334" stroke="#AE1C3F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F9FAFB', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #D1D5DB', backgroundColor: 'white', color: '#374151', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================
   QUILL EDITOR COMPONENT
========================================= */
interface QuillEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  hasError?: boolean;
  readOnly?: boolean; 
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange, placeholder, hasError, readOnly = false }) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (!editorRef.current || !toolbarRef.current || quillRef.current) return;
    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      placeholder: placeholder || 'Nhập nội dung chi tiết...',
      modules: { toolbar: toolbarRef.current },
      readOnly: readOnly,
    });
    quillRef.current = quill;
    if (value) quill.clipboard.dangerouslyPasteHTML(value);
    quill.on('text-change', () => {
      const h = quill.root.innerHTML;
      onChange(h === '<p><br></p>' ? '' : h);
    });
    return () => {
      quillRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!quillRef.current) return;
    const cur = quillRef.current.root.innerHTML;
    if (value !== cur && !(value === '' && cur === '<p><br></p>'))
      quillRef.current.clipboard.dangerouslyPasteHTML(value || '');
  }, [value]);

  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!readOnly);
    }
  }, [readOnly]);

  return (
    <div
      style={{
        backgroundColor: readOnly ? '#F9FAFB' : '#fff', borderRadius: '6px', overflow: 'hidden',
        border: hasError ? '1px solid #EF4444' : '1px solid #D1D5DB',
        boxShadow: hasError ? '0 0 0 1px rgba(239,68,68,0.15)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <div 
        ref={toolbarRef} 
        className="ql-toolbar ql-snow" 
        style={{ 
          borderTop: 'none', borderLeft: 'none', borderRight: 'none', 
          padding: '6px 10px', 
          backgroundColor: hasError ? '#FEF2F2' : '#F9FAFB',
          display: readOnly ? 'none' : 'block'
        }}
      >
        <span className="ql-formats">
          <button className="ql-bold" />
          <button className="ql-italic" />
          <button className="ql-underline" />
        </span>
        <span className="ql-formats">
          <button className="ql-list" value="ordered" />
          <button className="ql-list" value="bullet" />
        </span>
      </div>
      <div ref={editorRef} style={{ minHeight: '140px', fontSize: '13px', border: 'none', color: readOnly ? '#374151' : 'inherit' }} />
    </div>
  );
};

/* =========================================
   MAIN BATCH DETAIL PAGE COMPONENT
========================================= */
const BatchRequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const routeState = location.state as any;
  const externalStatus = routeState?.status || routeState?.requestStatus;
  const externalName = routeState?.name || routeState?.requestName || routeState?.title;

  const getCurrentUsernameRaw = () => {
    const possibleKeys = ['currentUserUsername', 'username', 'userCode', 'userId', 'account', 'user', 'userInfo', 'currentUser'];
    for (const key of possibleKeys) {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (typeof parsed === 'object' && parsed !== null) {
            const u = parsed.username || parsed.userName || parsed.code || parsed.sub || parsed.userCode;
            if (u) return String(u);
          }
        } catch {
          return String(val);
        }
      }
    }
    return '';
  };

  const currentUsername = extractUsername(getCurrentUsernameRaw());
  const isLoggedIn = Boolean(currentUsername);

  const [products, setProducts] = useState<any[]>([]);
  
  const firstProduct = products.length > 0 ? products[0] : null;
  const creatorField = firstProduct?.createdBy || firstProduct?.created_by || firstProduct?.creator;
  let rawCreatorName = '';
  
  if (typeof creatorField === 'object' && creatorField !== null) {
    rawCreatorName = creatorField.username || creatorField.userName || creatorField.name || creatorField.code || '';
  } else if (creatorField !== undefined && creatorField !== null) {
    rawCreatorName = String(creatorField);
  }

  const creatorUsername = extractUsername(rawCreatorName);

  const isOwner = Boolean(
    isLoggedIn && 
    currentUsername && 
    creatorUsername && 
    currentUsername === creatorUsername
  );

  const [loading, setLoading] = useState(false);
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  
  const [batchName, setBatchName] = useState<string>(externalName || 'Chi tiết lô sản phẩm');

  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    productGroupId: '',
    productCategoryId: '',
    businessId: '',
    imageUrl: '',
    feedback: '',
  });
  
  const [groupCache, setGroupCache] = useState<Record<string, GroupCacheData>>({});

  const [showImageModal, setShowImageModal] = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false); // Modal thêm tiêu chí giống DetailProduct
  const [previewImage, setPreviewImage] = useState('');   
  const [avatarFile, setAvatarFile] = useState<File | null>(null); 
  const [imageRemoved, setImageRemoved] = useState(false); 

  const [details, setDetails] = useState<any[]>([]);
  const [groupOptions, setGroupOptions] = useState<OptionItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<OptionItem[]>([]);
  const [operationOptions, setOperationOptions] = useState<OptionItem[]>([]);
  const [, setLoadingCategories] = useState(false);
  const [, setLoadingOperations] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({});

  const isUserActionRef = useRef(false);

  const [addedOptionalIds, setAddedOptionalIds] = useState<string[]>([]);

  const hasGlobalChanges = Object.keys(pendingUpdates).length > 0 || hasFormChanges;

  const formattedDate = useMemo(() => {
    if (products.length > 0 && products[0].createdAt) {
      return new Date(products[0].createdAt).toLocaleDateString('vi-VN');
    }
    return new Date().toLocaleDateString('vi-VN'); 
  }, [products]);

  const batchStatus = useMemo(() => {
    if (externalStatus) return externalStatus;
    if (products.length > 0) return products[0].requestStatus || products[0].status;
    return 'DRAFT';
  }, [externalStatus, products]);

  const normalizedBatchStatus = (batchStatus || 'DRAFT').toString().toUpperCase();
  const isEditableStatus = normalizedBatchStatus === 'DRAFT' || normalizedBatchStatus === 'NEEDS_REVISION';

  const canEdit = isEditableStatus && isOwner;
  const isReadOnly = !canEdit;

  useEffect(() => {
    const fetchBatchDetails = async () => {
      if (!requestId) return;
      setLoading(true);
      try {
        const response = await axios.get(`${API_ENDPOINTS.PRODUCT.LIST2}/${encodeURIComponent(requestId)}/products`);
        const data = response.data || [];
        setProducts(data);
        setCurrentPage(1); 
        
        if (!externalName && data.length > 0 && data[0].requestName) {
          setBatchName(data[0].requestName);
        }
      } catch (error) {
        toast.error('Không thể tải dữ liệu danh sách sản phẩm!', { position: 'top-center' });
      } finally {
        setLoading(false);
      }
    };
    fetchBatchDetails();
  }, [requestId, externalName]);

  useEffect(() => {
    const fetchGroupOptions = async () => {
      try {
        const response = await axios.get(`${API_ENDPOINTS.PRODUCT_GROUPS.LIST}?status=ACTIVE&active=true`);
        const raw = (response.data || []).filter((g: any) => g?.name);
        const options: OptionItem[] = raw.map((g: any) => ({ id: String(g.id ?? g.name), name: g.name }));
        const unique = Array.from(new Map(options.map(o => [o.id, o])).values());
        if (unique.length > 0) setGroupOptions(unique);
      } catch (error) {
        console.error('Lỗi khi tải nhóm sản phẩm:', error);
      }
    };
    fetchGroupOptions();
  }, []);

  useEffect(() => {
    if (!quickViewProduct || !formData.productGroupId) {
      setCategoryOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingCategories(true);
        const res = await axios.get(`${API_ENDPOINTS.PRODUCT_CATEGORY.LIST}?status=ACTIVE&types=${formData.productGroupId}&active=true`);
        if (cancelled) return;
        const options: OptionItem[] = (res.data || []).map((c: any) => ({ id: String(c.id), name: c.name }));
        setCategoryOptions(options);
      } catch (error) {
        console.error('Lỗi tải danh mục:', error);
      } finally { 
        if (!cancelled) setLoadingCategories(false); 
      }
    })();
    return () => { cancelled = true; };
  }, [formData.productGroupId, quickViewProduct]);

  useEffect(() => {
    if (!quickViewProduct || !formData.productCategoryId) {
      setOperationOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingOperations(true);
        const res = await axios.get(`${API_ENDPOINTS.PRODUCT_BUSINESS.LIST}?status=ACTIVE&types=${formData.productCategoryId}&active=true`);
        if (cancelled) return;
        const options: OptionItem[] = (res.data || []).map((b: any) => ({ id: String(b.id), name: b.name }));
        setOperationOptions(options);
      } catch (error) {
        console.error('Lỗi tải nghiệp vụ:', error);
      } finally { 
        if (!cancelled) setLoadingOperations(false); 
      }
    })();
    return () => { cancelled = true; };
  }, [formData.productCategoryId, quickViewProduct]);

  useEffect(() => {
    if (!quickViewProduct || !formData.productGroupId) {
      if (!formData.productGroupId) setDetails([]);
      return;
    }

    if (!isUserActionRef.current) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const targetId = formData.productGroupId; 
        const criteriaEndpoint = `${API_ENDPOINTS.PRODUCT_CRITERIA?.LIST || '/api/criteria'}?status=ACTIVE&types=${targetId}&active=true`;
        
        const res = await axios.get(criteriaEndpoint);
        if (cancelled) return;

        const rawData = res?.data ? (Array.isArray(res.data) ? res.data : (res.data.content || [])) : [];
        
        if (rawData.length > 0) {
          const newCriteriaList = rawData.map((d: any) => ({
            id: d.id || d.criteriaId,
            code: d.code || d.maTieuChi || d.id,
            tieuChi: d.tieuChi || d.name,
            noiDung: '',
            required: d.required || false,
          }));
          setDetails(newCriteriaList);
          setAddedOptionalIds([]);
        } else {
          setDetails([]);
        }
      } catch (error) {
        console.error('Lỗi khi tải bộ tiêu chí theo nhóm:', error);
        setDetails([]);
      }
    })();

    return () => { cancelled = true; };
  }, [formData.productGroupId, quickViewProduct]);

  useEffect(() => {
    return () => { if (avatarFile && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage); };
  }, [previewImage, avatarFile]);

  const handleGroupChange = (newGroupId: string) => {
    if (formData.productGroupId) {
      setGroupCache(prev => ({
        ...prev,
        [formData.productGroupId]: {
          categoryId: formData.productCategoryId,
          businessId: formData.businessId,
          details: details,
          addedOptionalIds: addedOptionalIds
        }
      }));
    }

    if (groupCache[newGroupId]) {
      const cachedData = groupCache[newGroupId];
      isUserActionRef.current = false; 
      handleFormChange({
        productGroupId: newGroupId,
        productCategoryId: cachedData.categoryId,
        businessId: cachedData.businessId
      });
      setDetails(cachedData.details);
      setAddedOptionalIds(cachedData.addedOptionalIds);
    } else {
      isUserActionRef.current = true; 
      handleFormChange({
        productGroupId: newGroupId,
        productCategoryId: '',
        businessId: ''
      });
    }
  };

  const handleImageConfirm = (file: File, blobUrl: string) => {
    if (avatarFile && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage);
    setAvatarFile(file);
    setPreviewImage(blobUrl);
    setImageRemoved(false);
    setShowImageModal(false);
    setHasFormChanges(true);
  };

  const handleRemoveImage = () => {
    if (avatarFile && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage);
    setAvatarFile(null);
    setPreviewImage('');
    setImageRemoved(true);
    setHasFormChanges(true);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const response = await axios.post(API_ENDPOINTS.FILES.UPLOAD, fd);
      const data = response.data;
      if (!data.url) throw new Error('Backend không trả về đường dẫn ảnh');
      return data.url; 
    } catch (error) {
      console.error("Lỗi upload ảnh:", error);
      throw new Error('Upload ảnh lên hệ thống thất bại');
    }
  };

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return products.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [products, currentPage]);

  const handleFormChange = (updates: any) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasFormChanges(true);
  };

  const handleDetailsChange = (id: string, value: string) => {
    setDetails(prev => prev.map(c => c.id === id ? { ...c, noiDung: value } : c));
    setHasFormChanges(true);
  };

  const handleOpenQuickView = (product: any) => {
    isUserActionRef.current = false;
    setGroupCache({}); 
    
    setQuickViewProduct(product);
    setHasFormChanges(false);
    setAvatarFile(null);
    setImageRemoved(false);

    const initialImg = product.imageUrl || product.image || '';
    setPreviewImage(toDisplayUrl(initialImg));

    const productDetails = (product.details || []).map((d: any) => ({
      id: d.id,
      code: d.code || d.maTieuChi || d.id,
      tieuChi: d.tieuChi,
      noiDung: d.noiDung || '',
      required: d.required || false,
    }));
    setDetails(productDetails);

    const existingActiveOptional = productDetails
      .filter((d: any) => !d.required && !isHtmlEmpty(d.noiDung))
      .map((d: any) => d.id);
    setAddedOptionalIds(existingActiveOptional);

    let resolvedGroupId = product.productGroupId ? String(product.productGroupId) : '';
    if (!resolvedGroupId && product.productGroupName) {
      const matched = groupOptions.find(g => g.name === product.productGroupName);
      if (matched) resolvedGroupId = matched.id;
    }

    const latestComment = product.comments && product.comments.length > 0 
      ? product.comments[product.comments.length - 1].comment 
      : '';

    setFormData({
      name: product.name || '',
      productGroupId: resolvedGroupId,
      productCategoryId: product.productCategoryId ? String(product.productCategoryId) : '',
      businessId: product.businessId ? String(product.businessId) : '',
      imageUrl: initialImg,
      feedback: latestComment,
    });
  };

  const getPayloadFromCurrentForm = async () => {
    let finalImageUrl = formData.imageUrl;
    if (imageRemoved) {
      finalImageUrl = '';
    } else if (avatarFile) {
      try {
        finalImageUrl = await uploadImage(avatarFile);
      } catch (e: any) {
        throw new Error(e.message || 'Lỗi upload ảnh');
      }
    }

    const criteriaPayload = details
      .filter((d) => !isHtmlEmpty(d.noiDung))
      .map((d) => ({ criteriaId: d.id, value: d.noiDung }));

    return {
      name: formData.name,
      productGroupId: formData.productGroupId || '',
      productCategoryId: formData.productCategoryId || '',
      businessId: formData.businessId || '',
      imageUrl: finalImageUrl,
      criteria: criteriaPayload,
      comments: formData.feedback.trim() ? [{ comment: formData.feedback.trim() }] : [],
    };
  };

  const handleLocalSave = async () => {
    if (!quickViewProduct) return;
    
    // Kiểm tra validate form
    const missingRequired = details.find(d => d.required && isHtmlEmpty(d.noiDung));
    if (!formData.name.trim() || missingRequired) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc (*).", { position: 'top-center' });
      return;
    }

    // Block giao diện khi đang lưu
    setIsUpdating(true); 
    
    try {
      // 1. Lấy dữ liệu payload từ form
      const payload = await getPayloadFromCurrentForm();
      
      // 2. GỌI API LƯU TRỰC TIẾP VÀO DB
      await axios.post(API_ENDPOINTS.PRODUCT.UPDATE(quickViewProduct.id), payload);

      // 3. Cập nhật state UI để bảng danh sách hiển thị thông tin mới ngay lập tức
      setProducts(prev => prev.map(p => {
        if (p.id !== quickViewProduct.id) return p;

        const updatedComments = formData.feedback.trim()
          ? [{ 
              id: p.comments && p.comments.length > 0 ? p.comments[p.comments.length - 1].id : undefined, 
              comment: formData.feedback.trim() 
            }]
          : [];

        return {
          ...p,
          name: formData.name,
          productGroupId: formData.productGroupId,
          productGroupName: groupOptions.find(g => String(g.id) === String(formData.productGroupId))?.name || p.productGroupName,
          productCategoryId: formData.productCategoryId,
          productCategoryName: categoryOptions.find(c => String(c.id) === String(formData.productCategoryId))?.name || p.productCategoryName,
          businessId: formData.businessId,
          businessName: operationOptions.find(b => String(b.id) === String(formData.businessId))?.name || p.businessName,
          imageUrl: payload.imageUrl,
          comments: updatedComments,
          details: details.map(d => ({ ...d }))
        };
      }));

      // 4. Xóa sản phẩm này khỏi danh sách pending (nếu có) để khi bấm Gửi ở header không bị gọi lại API thừa
      setPendingUpdates(prev => {
        const newPending = { ...prev };
        delete newPending[quickViewProduct.id];
        return newPending;
      });

      setHasFormChanges(false);
      toast.success("Đã lưu thành công vào CSDL!", { position: 'top-center' });
    } catch (error: any) {
      console.error("Lỗi khi lưu DB:", error);
      toast.error(error.message || "Có lỗi xảy ra khi lưu vào hệ thống.", { position: 'top-center' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveDraftToDB = async () => {
    setIsUpdating(true);
    try {
      const updatesToPush = { ...pendingUpdates };
      if (quickViewProduct && hasFormChanges) {
        updatesToPush[quickViewProduct.id] = await getPayloadFromCurrentForm();
      }

      if (Object.keys(updatesToPush).length === 0) {
        setIsUpdating(false);
        return;
      }

      const promises = Object.keys(updatesToPush).map(id => 
        axios.post(API_ENDPOINTS.PRODUCT.UPDATE(id), updatesToPush[id])
      );
      await Promise.all(promises);

      setPendingUpdates({});
      setHasFormChanges(false);
      toast.success("Đã lưu nháp thành công!", { position: 'top-center' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Có lỗi xảy ra khi lưu CSDL.", { position: 'top-center' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSend = async () => {
    if (!requestId) return;
    setIsUpdating(true);
    try {
      const updatesToPush = { ...pendingUpdates };
      if (quickViewProduct && hasFormChanges) {
        updatesToPush[quickViewProduct.id] = await getPayloadFromCurrentForm();
      }
      if (Object.keys(updatesToPush).length > 0) {
        const promises = Object.keys(updatesToPush).map(id => 
          axios.post(API_ENDPOINTS.PRODUCT.UPDATE(id), updatesToPush[id])
        );
        await Promise.all(promises);
      }

      await axios.post(API_ENDPOINTS.PRODUCT_REQUESTS.UPDATE_STATUS2(requestId), { status: 'PENDING_APPROVAL' });
      
      setPendingUpdates({});
      setHasFormChanges(false);
      toast.success("Đã gửi kiểm duyệt thành công!", { position: 'top-center' });
      setTimeout(() => window.location.reload(), 1000); 
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Có lỗi xảy ra khi gửi.", { position: 'top-center' });
    } finally {
      setIsUpdating(false);
    }
  };

  const PRIORITY_CODES = ["TCBH_0001", "TCSP_0003", "TCUD_001"];
  const priorityCriteria = details.filter(c => PRIORITY_CODES.includes(c.code));
  const remainingCriteria = details.filter(c => !PRIORITY_CODES.includes(c.code));
  const requiredCriteria = remainingCriteria.filter(c => c.required);
  
  const optionalCriteria = remainingCriteria.filter(c => !c.required);
  const visibleOptionalCriteria = optionalCriteria.filter(
    c => !isHtmlEmpty(c.noiDung) || addedOptionalIds.includes(c.id)
  );

  // Danh sách tiêu chí truyền vào modal thêm tiêu chí
  const criteriaForModal = optionalCriteria.map(c => ({
    ...c,
    isAdded: addedOptionalIds.includes(c.id) || !isHtmlEmpty(c.noiDung)
  }));

  const handleToggleOptionalCriterion = (id: string) => {
    setAddedOptionalIds(prev => {
      const exists = prev.includes(id);
      if (exists) {
        // Xóa khỏi danh sách hiện và clear nội dung
        handleDetailsChange(id, '');
        return prev.filter(item => item !== id);
      } else {
        setHasFormChanges(true);
        return [...prev, id];
      }
    });
  };

  const renderCriterion = (criterion: any, isOptional = false, onRemove?: () => void) => (
    <div key={criterion.id} style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <label className="batch-form-label" style={{ marginBottom: 0 }}>
          {criterion.tieuChi} {criterion.required && <span style={{ color: '#EF4444', marginLeft: '4px' }}>(*)</span>}
        </label>
        {isOptional && onRemove && canEdit && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              background: 'none',
              border: '1px solid #EF4444',
              color: '#EF4444',
              width: '22px',
              height: '22px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              lineHeight: 1,
              transition: 'background 0.2s'
            }}
            title="Bỏ tiêu chí này"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            -
          </button>
        )}
      </div>
      <QuillEditor
        value={criterion.noiDung}
        hasError={criterion.required && isHtmlEmpty(criterion.noiDung)}
        onChange={(value) => handleDetailsChange(criterion.id, value)}
        readOnly={!canEdit}
      />
    </div>
  );

  return (
    <div className="batch-detail-container">
      <Toaster position="top-right" reverseOrder={false} />
      
      {/* HEADER */}
      <div className="batch-header">
        <div className="batch-header-left">
          <button onClick={() => navigate(-1)} className="batch-back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Quay lại
          </button>
          
          <h2 className="batch-title">
            {stripHtml(batchName)}
          </h2>
          
          <StatusBadge2 status={normalizedBatchStatus} className="batch-status-badge" />
        </div>

        <div className="batch-header-right">
          <span className="batch-meta-text">{products.length} sản phẩm</span>
          <span className="batch-meta-text">{formattedDate}</span>
          
          <div className="batch-header-divider"></div>

          {isReadOnly ? (
             <span style={{ fontSize: '14px', color: '#6B7280', fontStyle: 'italic', padding: '6px 12px', background: '#F3F4F6', borderRadius: '6px' }}>
               Chỉ được xem
             </span>
          ) : (
            <div className="batch-actions-group">
              <button 
                disabled={!hasGlobalChanges || isUpdating} 
                onClick={handleSaveDraftToDB}
                className="btn-secondary-action"
              >
                Lưu nháp
              </button>

              <button 
                disabled={isUpdating} 
                onClick={handleSend}
                className="btn-primary-action"
              >
                Gửi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="batch-workspace">
        
        {/* TABLE SECTION */}
        <div className="batch-table-container">
          <div className="batch-table-scroll">
            <table className="batch-custom-table">
              <thead>
                <tr className="batch-table-header-tr">
                  <th className="batch-table-th" style={{ width: '20%' }}>Sản phẩm</th>
                  <th className="batch-table-th" style={{ width: '20%' }}>Nhóm sản phẩm</th>
                  <th className="batch-table-th" style={{ width: '20%' }}>Danh mục sản phẩm</th>
                  <th className="batch-table-th" style={{ width: '20%' }}>Nghiệp vụ</th>
                  <th className="batch-table-th" style={{ width: '20%' }}>Ghi chú</th>
                  <th className="batch-table-th" style={{ width: '1%', whiteSpace: 'nowrap' }}></th> 
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Đang tải dữ liệu...</td>
                  </tr>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((item) => {
                    const isSelected = quickViewProduct?.id === item.id;
                    return (
                      <tr key={item.id} className={isSelected ? "batch-tr-selected" : ""}>
                        <td className="batch-table-td batch-table-td-name">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name || '—'}</span>
                          </div>
                        </td>
                        <td className="batch-table-td">
                          {item.productGroupName || 'Chưa chọn'}
                        </td>
                        <td className="batch-table-td">
                          {item.productCategoryName || 'Chưa chọn'}
                        </td>
                        <td className="batch-table-td">
                          {item.businessName || 'Chưa chọn'}
                        </td>
                        <td className="batch-table-td" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                          {String(item.notes) === '0' ? (
                            <StatusBadge2 status="NEEDS_REVISION" className="batch-status-badge" />
                          ) : String(item.notes) === '1' ? (
                            <StatusBadge2 status="REJECTED" className="batch-status-badge" />
                          ) : String(item.notes) === '2' ? (
                            '—'
                          ) : String(item.notes) === 'REVIEWED' ? (
                            <StatusBadge2 status="REVIEWED" className="batch-status-badge" />
                          ) : (
                            item.notes || '—'
                          )}
                        </td>
                        <td 
                          className="batch-table-td" 
                          style={{ padding: '0 12px', textAlign: 'center', width: '1%', whiteSpace: 'nowrap' }}
                        >
                          <div className="batch-action-inner" style={{ justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenQuickView(item)}
                              className="btn-xem-nhanh"
                            >
                              Xem nhanh
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="13 17 18 12 13 7"></polyline>
                                <polyline points="6 17 11 12 6 7"></polyline>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>Không có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {!loading && products.length > 0 && (
            <div className="batch-pagination">
              <span style={{ fontSize: '13px', color: '#6B7280' }}>
                Hiển thị {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, products.length)} trên tổng số {products.length}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #D1D5DB', backgroundColor: currentPage === 1 ? '#F3F4F6' : '#fff', color: currentPage === 1 ? '#9CA3AF' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                >Trước</button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #D1D5DB', backgroundColor: currentPage === totalPages ? '#F3F4F6' : '#fff', color: currentPage === totalPages ? '#9CA3AF' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                >Sau</button>
              </div>
            </div>
          )}
        </div>

        {/* QUICK VIEW PANEL */}
        {quickViewProduct && (
          <div className="batch-quickview-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              <div className="batch-card-box" style={{ marginBottom: '12px' }}>
                <button 
                  onClick={() => setQuickViewProduct(null)} 
                  className="batch-close-btn"
                >✕</button>
                
                <CustomSelect
                  label="Nhóm sản phẩm"
                  value={formData.productGroupId}
                  options={groupOptions}
                  placeholder="Chưa chọn"
                  disabled={!canEdit}
                  onChange={(val) => handleGroupChange(val)}
                />
                
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <CustomSelect
                      label="Danh mục sản phẩm"
                      value={formData.productCategoryId}
                      options={categoryOptions}
                      placeholder="Chưa chọn"
                      disabled={!canEdit || !formData.productGroupId}
                      onChange={(val) => {
                        handleFormChange({ productCategoryId: val, businessId: '' });
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <CustomSelect
                      label="Nghiệp vụ"
                      value={formData.businessId}
                      options={operationOptions}
                      placeholder="Chưa chọn"
                      disabled={!canEdit || !formData.productCategoryId}
                      onChange={(val) => handleFormChange({ businessId: val })}
                    />
                  </div>
                </div>
                
                {priorityCriteria.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    {priorityCriteria.map(c => renderCriterion(c))}
                  </div>
                )}
                
                {requiredCriteria.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    {requiredCriteria.map(c => renderCriterion(c))}
                  </div>
                )}

                {visibleOptionalCriteria.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    {visibleOptionalCriteria.map(criterion => 
                      renderCriterion(
                        criterion, 
                        true, 
                        () => {
                          setAddedOptionalIds(prev => prev.filter(id => id !== criterion.id));
                          handleDetailsChange(criterion.id, '');
                        }
                      )
                    )}
                  </div>
                )}

                <div className="formGroup">
                  <label className="label">Ảnh mô tả</label>

                  {previewImage ? (
                    <div className="product-image-wrapper">
                      <img
                        src={previewImage}
                        alt="Product"
                        className="product-image"
                      />
                      {canEdit && (
                        <div className="image-overlay">
                          <button type="button" className="overlay-btn" onClick={() => setShowImageModal(true)} title="Đổi ảnh">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button type="button" className="overlay-btn btn-delete" onClick={handleRemoveImage} title="Xóa ảnh">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    !canEdit ? (
                      <div className="upload-placeholder disabled">
                         <span style={{ fontSize: 14, color: '#9CA3AF' }}>Không có ảnh mô tả</span>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setShowImageModal(true)} className="upload-placeholder">
                        <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                        <span style={{ marginTop: 10, fontSize: 14, color: '#6B7280' }}>Kéo và thả ảnh tại đây hoặc</span>
                        <span style={{ color: '#10B981', fontWeight: 600, fontSize: 14 }}>Chọn file</span>
                        <span style={{ marginTop: 4, fontSize: 12, color: '#9CA3AF' }}>PNG, JPG, WEBP · Tỉ lệ 16:9</span>
                      </button>
                    )
                  )}
                </div>

                {/* NÚT THÊM TIÊU CHÍ GIỐNG HỆT DETAIL PRODUCT PAGE */}
                {optionalCriteria.length > 0 && canEdit && (
                  <div style={{ marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setShowCriteriaModal(true)}
                      style={{
                        background: 'none',
                        border: '1px dashed #AE1C3F',
                        color: '#AE1C3F',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <span>+ Thêm tiêu chí</span>
                    </button>
                  </div>
                )}

              </div>
            </div>

            <div style={{ flexShrink: 0, backgroundColor: '#FFFFFF', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
              <div className="batch-card-box" style={{ marginBottom: '8px' }}>
                <label className="batch-form-label">
                  Nội dung yêu cầu chỉnh sửa (nếu có)
                </label>
                <textarea
                  value={formData.feedback}
                  readOnly
                  className="batch-form-textarea"
                  placeholder="Không có nội dung yêu cầu chỉnh sửa"
                  style={{ 
                    backgroundColor: '#F9FAFB', 
                    cursor: 'default',          
                    color: '#374151',
                    height: '64px',
                    resize: 'none'
                  }}
                />
              </div>
              
              {canEdit && (
                <div className="batch-card-box" style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px', marginBottom: 0 }}>
                  <button 
                    onClick={handleLocalSave}
                    disabled={!hasFormChanges || isUpdating}
                    className="btn-primary-action"
                  >
                    Lưu
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      <ImageModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onConfirm={handleImageConfirm}
      />

      <CriteriaModal
        isOpen={showCriteriaModal}
        onClose={() => setShowCriteriaModal(false)}
        criteria={criteriaForModal}
        onToggle={handleToggleOptionalCriterion}
      />
    </div>
  );
};

export default BatchRequestDetailPage;