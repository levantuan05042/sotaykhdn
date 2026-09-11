import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import './DetailGroupPage.css';
import './DetailProductsPage.module.css';
import toast from 'react-hot-toast';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import Cropper from 'react-easy-crop';
import axios from 'axios';
import { API_ENDPOINTS, BASE_URL } from '../config/apiConfig';

import StatusBadge2 from '../components/ui/StatusBadge2';
import StatusBadgeListRequest from '../components/ui/StatusBadgeListRequest';
import ProductImageCard2 from '../components/ui/ProductImageCard2';
import VersionDetailModal from '../components/ui/VersionDetailModal';
import ProductInfoCard from '../components/ui/ProductInfoCard';
import type { VersionItem } from '../components/ui/ProductInfoCard';
import { getRandomAvatar } from '../utils/avatarUtils';
import { CASCADE_LOCK_MESSAGE, isCascadeHidden, DISABLED_CONTROL_STYLE } from '../utils/formatUtils';

interface Criterion {
  id: string;
  name: string;
  isRequired: boolean;
  isSelected: boolean;
  value: string;
}

interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const serializeCriteriaForDiff = (list: Criterion[]) =>
  JSON.stringify(list.filter(c => c.isSelected).map(c => ({ id: c.id, name: c.name, value: c.value })));

const stripHtml = (htmlString?: string | null) => {
  if (!htmlString) return '';
  return String(htmlString).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
};

const isHtmlEmpty = (html: string) => {
  if (!html) return true;
  return html.replace(/<[^>]*>?/gm, '').trim().length === 0 && !html.includes('<img');
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '---';
  try {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const checkIsRequired = (item: any) => {
  if (item.isRequired === true || item.isRequired === 'true') return true;
  if (item.required   === true || item.required   === 'true') return true;
  if (item.isRequire  === true || item.isRequire  === 'true') return true;
  if (item.batBuoc    === true || item.batBuoc    === 'true') return true;
  const t1 = String(item.tieuChi || item.name  || '');
  const t2 = String(item.noiDung || item.value || '');
  return t1.includes('(*)') || t2.includes('(*)');
};

const renderNote = (noteVal: any) => {
  if (noteVal === 2 || noteVal === '2') return <StatusBadgeListRequest status="APPROVED" />;
  if (noteVal === 1 || noteVal === '1') return <StatusBadgeListRequest status="REJECTED" />;
  if (noteVal === 0 || noteVal === '0') return <StatusBadgeListRequest status="NEEDS_REVISION" />;
  if (noteVal === 'REVIEWED') return <StatusBadgeListRequest status="REVIEWED" />;
  return noteVal || "—";
};

// --- FIX HIỂN THỊ ẢNH UAT ---
const getApiOrigin = () => {
  if (!BASE_URL) return window.location.origin;
  if (BASE_URL.startsWith('http')) {
    try { 
      return new URL(BASE_URL).origin; 
    } catch (e) { 
      return window.location.origin; 
    }
  }
  return window.location.origin;
};

const toDisplayUrl = (raw: string) => {
  if (!raw) return '';
  // 1. Giữ nguyên nếu là dạng blob (ảnh preview local) hoặc data base64
  if (raw.startsWith('blob:') || raw.startsWith('data:')) return raw;

  let cleanPath = raw;
  const apiOrigin = getApiOrigin();

  // 2. Tách bóc pathname nếu DB lưu cứng domain cũ (như localhost)
  if (raw.startsWith('http')) {
    try {
      const urlObj = new URL(raw);
      cleanPath = urlObj.pathname; 
    } catch (error) {
      return raw;
    }
  }

  // 3. Chuẩn hóa đường dẫn backend trả về
  if (!cleanPath.includes('/files/')) {
    const fileName = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;
    cleanPath = `/files/products/${fileName}`;
  } else if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  // 4. Ghép origin chuẩn của UAT/Prod
  return `${apiOrigin}${cleanPath}`;
};
// ----------------------------

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload  = () => resolve(img);
    img.onerror = reject;
  });

const getCroppedBlob = async (src: string, px: PixelCrop): Promise<Blob> => {
  const img    = await createImage(src);
  const canvas = document.createElement('canvas');
  canvas.width  = px.width;
  canvas.height = px.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, px.x, px.y, px.width, px.height, 0, 0, px.width, px.height);
  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.92));
};

const extractUsername = (rawUser: any): string => {
  if (!rawUser) return '';
  let strVal = '';
  if (typeof rawUser === 'object' && rawUser !== null) {
    strVal = rawUser.username || rawUser.userName || rawUser.code || rawUser.userCode || rawUser.sub || rawUser.fullName || rawUser.name || '';
  } else {
    strVal = String(rawUser);
  }
  strVal = strVal.trim().toLowerCase();
  if (strVal.includes('@')) {
    strVal = strVal.split('@')[0];
  }
  return strVal;
};

const getCurrentUsername = (): string => {
  const possibleKeys = ['currentUserUsername', 'username', 'userCode', 'userId', 'account', 'user', 'userInfo', 'currentUser'];
  for (const key of possibleKeys) {
    const val = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (val) {
      try {
        const parsed = JSON.parse(val);
        const extracted = extractUsername(parsed);
        if (extracted) return extracted;
      } catch {
        const extracted = extractUsername(val);
        if (extracted) return extracted;
      }
    }
  }
  return '';
};

// ─────────────────────────────────────────────
// ImageModal Component
// ─────────────────────────────────────────────
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

  const onCropComplete = useCallback((_: any, px: PixelCrop) => {
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

// ─────────────────────────────────────────────
// QuillEditor Component
// ─────────────────────────────────────────────
interface QuillEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  hasError?: boolean;
  readOnly?: boolean;
}

const QuillEditor: React.FC<QuillEditorProps> = ({ value, onChange, placeholder, hasError, readOnly }) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorRef  = useRef<HTMLDivElement>(null);
  const quillRef   = useRef<Quill | null>(null);

  useEffect(() => {
    // Toolbar chỉ được render khi ở chế độ chỉnh sửa (xem JSX bên dưới: {!readOnly && <div ref={toolbarRef}.../>}).
    // Ở chế độ readOnly, toolbarRef.current sẽ mãi mãi là null, nên KHÔNG được bắt buộc nó phải tồn tại
    // ở đây — nếu không Quill sẽ không bao giờ được khởi tạo và value sẽ không bao giờ hiển thị (lỗi cũ).
    if (!editorRef.current || quillRef.current) return;
    if (!readOnly && !toolbarRef.current) return;
    const quill = new Quill(editorRef.current, {
      theme: 'snow',
      readOnly: !!readOnly,
      placeholder: placeholder || 'Nhập nội dung chi tiết...',
      modules: { toolbar: readOnly ? false : toolbarRef.current },
    });
    quillRef.current = quill;
    if (value) quill.clipboard.dangerouslyPasteHTML(value);
    
    if (!readOnly) {
      quill.on('text-change', () => {
        const h = quill.root.innerHTML;
        onChange(h === '<p><br></p>' ? '' : h);
      });
    }
    return () => { quillRef.current = null; };
  }, [readOnly]);

  useEffect(() => {
    if (!quillRef.current) return;
    quillRef.current.enable(!readOnly);
    const cur = quillRef.current.root.innerHTML;
    if (value !== cur && !(value === '' && cur === '<p><br></p>'))
      quillRef.current.clipboard.dangerouslyPasteHTML(value || '');
  }, [value, readOnly]);

  return (
    <div style={{ backgroundColor: readOnly ? '#F9FAFB' : '#fff', borderRadius: 8, border: hasError ? '1px solid #EF4444' : '1px solid #D1D5DB', boxShadow: hasError ? '0 0 0 1px rgba(239,68,68,0.15)' : 'none', transition: 'all 0.2s ease', position: 'relative' }}>
      {!readOnly && (
        <div ref={toolbarRef} className="ql-toolbar ql-snow" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '8px 12px', backgroundColor: hasError ? '#FEF2F2' : '#F9FAFB', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
          <span className="ql-formats">
            <button className="ql-bold" title="In đậm (Bold)" />
            <button className="ql-italic" title="In nghiêng (Italic)" />
            <button className="ql-underline" title="Gạch chân (Underline)" />
            <button className="ql-strike" title="Gạch ngang chữ (Strikethrough)" />
          </span>
          <span className="ql-formats">
            <button className="ql-list" value="ordered" title="Danh sách số (Numbered list)" />
            <button className="ql-list" value="bullet" title="Danh sách dấu chấm (Bullet list)" />
          </span>
          <span className="ql-formats">
            <button className="ql-script" value="sub" title="Chỉ số dưới (Subscript)" />
            <button className="ql-script" value="super" title="Chỉ số trên (Superscript - m²)" />
          </span>
          <span className="ql-formats">
            <button className="ql-indent" value="-1" title="Giảm thụt lề (Outdent)" />
            <button className="ql-indent" value="+1" title="Tăng thụt lề (Indent)" />
          </span>
          <span className="ql-formats">
            <select className="ql-color" title="Màu chữ" />
            <select className="ql-background" title="Màu nền highlight" />
          </span>
          <span className="ql-formats">
            <select className="ql-align" title="Căn lề văn bản" />
          </span>
          <span className="ql-formats">
            <button className="ql-clean" title="Xóa toàn bộ định dạng" />
          </span>
        </div>
      )}
      <div ref={editorRef} style={{ minHeight: 120, fontSize: 15, border: 'none', backgroundColor: readOnly ? '#F9FAFB' : 'transparent', color: readOnly ? '#374151' : undefined, cursor: readOnly ? 'not-allowed' : 'text', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}/>
    </div>
  );
};

// ─────────────────────────────────────────────
// CriteriaModal Component
// ─────────────────────────────────────────────
const CriteriaModal: React.FC<{
  isOpen: boolean; onClose: () => void;
  criteria: Criterion[]; onToggle: (id: string) => void;
}> = ({ isOpen, onClose, criteria, onToggle }) => {
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
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', maxHeight: 400, padding: '8px 0' }}>
          {criteria.filter(c => !c.isRequired).map(c => (
            <div key={c.id} onClick={() => onToggle(c.id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', cursor: 'pointer', backgroundColor: c.isSelected ? '#FDF2F4' : 'transparent', transition: 'background-color 0.2s', borderBottom: '1px solid #F3F4F6' }}
              className="figma-option-row">
              <span style={{ fontSize: 15, fontWeight: c.isSelected ? 500 : 400, color: c.isSelected ? '#111827' : '#374151', userSelect: 'none' }}>{c.name}</span>
              {c.isSelected && (
                <svg width="16" height="16" viewBox="0 0 16 12" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M1.33334 6.00001L5.33334 10L14.6667 1.33334" stroke="#AE1C3F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          ))}
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

// ─────────────────────────────────────────────
// Main Component: DetailProductPage
// ─────────────────────────────────────────────
const DetailProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state || {}) as { requestName?: string; requestId?: string };

  const groupRef     = useRef<HTMLDivElement>(null);
  const categoryRef  = useRef<HTMLDivElement>(null);
  const operationRef = useRef<HTMLDivElement>(null);
  const statusRef    = useRef<HTMLDivElement>(null);

  const [isGroupOpen,       setIsGroupOpen]       = useState(false);
  const [isCategoryOpen,    setIsCategoryOpen]    = useState(false);
  const [isOperationOpen,   setIsOperationOpen]   = useState(false);
  const [isStatusOpen,      setIsStatusOpen]      = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [showImageModal,    setShowImageModal]    = useState(false);

  const [groupOptions,     setGroupOptions]     = useState<{ label: string; value: string }[]>([]);
  const [categoryOptions,  setCategoryOptions]  = useState<{ label: string; value: string }[]>([]);
  const [operationOptions, setOperationOptions] = useState<{ label: string; value: string }[]>([]);

  const [loading,           setLoading]           = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);

  const [productData, setProductData] = useState<any>(null);
  const [isActive,    setIsActive]    = useState(true);
  const [productName, setProductName] = useState('');
  const [formData,    setFormData]    = useState({ productGroupId: '', productCategoryId: '', businessId: '' });

  const [criteria,         setCriteria]         = useState<Criterion[]>([]);
  const [originalCriteria, setOriginalCriteria] = useState<Criterion[]>([]);
  const [draggedCriterionId, setDraggedCriterionId] = useState<string | null>(null);
  const [dragOverCriterionId, setDragOverCriterionId] = useState<string | null>(null);
  const [previewVersionItem, setPreviewVersionItem] = useState<VersionItem | null>(null);
  const [showVersionModal, setShowVersionModal] = useState(false);

  const [previewImage, setPreviewImage] = useState('');   
  const [avatarFile,   setAvatarFile]   = useState<File | null>(null); 
  const [imageRemoved, setImageRemoved] = useState(false); 

  // --- LOGIC PHÂN QUYỀN ---
  const currentUsername = getCurrentUsername();
  const isLoggedIn = Boolean(currentUsername);

  const rawCreator = productData?.createdBy || productData?.created_by || productData?.creator;
  const creatorUsername = extractUsername(rawCreator);

  const isOwner = useMemo(() => {
    if (!isLoggedIn || !currentUsername || !creatorUsername) return false;
    if (currentUsername === creatorUsername) return true;
    const currentBase = currentUsername.split('_')[0];
    const creatorBase = creatorUsername.split('_')[0];
    return currentBase === creatorBase && currentBase.length > 0;
  }, [isLoggedIn, currentUsername, creatorUsername]);

  const productStatus = String(productData?.status || '').toUpperCase();
  const isRejected = productStatus === 'REJECTED';
  const isApproved =
    productStatus === 'ACTIVE' || productStatus === 'APPROVED' || productStatus === 'COMPLETED';
  const isPendingApproval = productStatus === 'PENDING_APPROVAL' || productStatus === 'PENDING';
  const isDraft = productStatus === 'DRAFT';
  const isNeedsRevision = productStatus === 'NEEDS_REVISION' || productStatus === 'REVISION';
  const isCascadeLocked = isCascadeHidden(productData);
  const isReadOnly = !isLoggedIn || !isOwner || isRejected || isCascadeLocked || isApproved || isPendingApproval;
  const isDisplayStatusDisabled = isReadOnly || productStatus !== 'ACTIVE';
  const canShowNewCriteriaNotice = (isApproved || isDraft || isNeedsRevision) && !isPendingApproval;

  const getCreatorDisplayName = () => {
    if (productData?.createdByFullName) return productData.createdByFullName;
    return productData?.createdBy || productData?.created_by || productData?.creator || '—';
  };

  const getApproverDisplayName = () => {
    if (productData?.approvedByFullName) return productData.approvedByFullName;
    return productData?.approvedBy || productData?.reviewer || '—';
  };

  useEffect(() => {
    if (productData?.imageUrl) setPreviewImage(toDisplayUrl(productData.imageUrl));
  }, [productData?.imageUrl]);

  useEffect(() => {
    return () => { if (avatarFile && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage); };
  }, [previewImage, avatarFile]);

  const handleImageConfirm = (file: File, blobUrl: string) => {
    if (isReadOnly) return;
    if (avatarFile && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage);
    setAvatarFile(file);
    setPreviewImage(blobUrl);
    setImageRemoved(false);
    setShowImageModal(false);
  };

  const handleRemoveImage = () => {
    if (isReadOnly) return;
    if (avatarFile && previewImage.startsWith('blob:')) URL.revokeObjectURL(previewImage);
    setAvatarFile(null);
    setPreviewImage('');
    setImageRemoved(true);
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

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (groupRef.current     && !groupRef.current.contains(e.target as Node))     setIsGroupOpen(false);
      if (categoryRef.current  && !categoryRef.current.contains(e.target as Node))  setIsCategoryOpen(false);
      if (operationRef.current && !operationRef.current.contains(e.target as Node)) setIsOperationOpen(false);
      if (statusRef.current    && !statusRef.current.contains(e.target as Node))    setIsStatusOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [pRes, gRes] = await Promise.all([
          fetch(API_ENDPOINTS.PRODUCT.DETAIL(id)),
          fetch(`${API_ENDPOINTS.PRODUCT_GROUPS.LIST}?status=ACTIVE&active=true`),
        ]);
        if (!pRes.ok) throw new Error('Không thể tải thông tin sản phẩm');
        const pData = await pRes.json();
        setProductData(pData);
        setIsActive(pData.active ?? true);
        setProductName(pData.name || '');
        setFormData({
          productGroupId:    pData.productGroupId    || '',
          productCategoryId: pData.productCategoryId || '',
          businessId:        pData.businessId        || '',
        });

        if (gRes.ok) {
          const gd = await gRes.json();
          setGroupOptions(gd.map((g: any) => ({ label: g.name, value: g.id })));
        }

        const rawDetails = pData.details || [];
        if (rawDetails.length > 0) {
          const mapped: Criterion[] = rawDetails.map((item: any, i: number) => ({
            id:         String(item.id || item.criteriaId || item.stt || i),
            name:       (item.tieuChi || item.name || '').replace(/\s*\(\*\)/g, ''),
            isRequired: checkIsRequired(item),
            isSelected: true,
            value:      item.noiDung || item.value || '',
          }));
          setOriginalCriteria(JSON.parse(JSON.stringify(mapped)));
          setCriteria(mapped);
        }
      } catch (e) {
        console.error(e);
        toast.error('Không tìm thấy sản phẩm hoặc cấu trúc dữ liệu không khớp');
      } finally { setLoading(false); }
    };
    init();
  }, [id]);

  useEffect(() => {
    if (!formData.productGroupId) { setCategoryOptions([]); setOperationOptions([]); return; }

    (async () => {
      try {
        setLoadingCategories(true);
        const r = await fetch(`${API_ENDPOINTS.PRODUCT_CATEGORY.LIST}?status=ACTIVE&types=${formData.productGroupId}&active=true`);
        if (r.ok) { const d = await r.json(); setCategoryOptions(d.map((c: any) => ({ label: c.name, value: c.id }))); }
      } catch (e) { console.error(e); } finally { setLoadingCategories(false); }
    })();

    (async () => {
      try {
        setLoadingOperations(true);
        const ep = API_ENDPOINTS.PRODUCT_BUSINESS?.LIST || API_ENDPOINTS.PRODUCT_GROUPS.LIST.replace('product-groups', 'business');
        const r  = await fetch(`${ep}?status=ACTIVE&types=${formData.productGroupId}&active=true`);
        if (r.ok) { const d = await r.json(); setOperationOptions(d.map((b: any) => ({ label: b.name, value: b.id }))); }
      } catch (e) { console.error(e); } finally { setLoadingOperations(false); }
    })();

    (async () => {
      try {
        const r = await fetch(`${API_ENDPOINTS.PRODUCT_CRITERIA.LIST}?types=${formData.productGroupId}&status=ACTIVE&active=true`);
        if (!r.ok) return;
        const resData = await r.json();
        const data = Array.isArray(resData) ? resData : (resData?.content || resData?.data || []);
        const isOrig = formData.productGroupId === (productData?.productGroupId || '');
        const saved = isOrig ? originalCriteria : [];

        const catalog: Criterion[] = data.map((item: any) => {
          const name = (item.tieuChi || item.name || '').replace(/\s*\(\*\)/g, '').trim();
          return {
            id: String(item.id || item.criteriaId),
            name,
            isRequired: checkIsRequired(item),
            isSelected: false,
            value: '',
          };
        });

        const merged: Criterion[] = [];
        const usedIds = new Set<string>();
        const usedNames = new Set<string>();

        for (const s of saved) {
          const fromCatalog = catalog.find(c =>
            c.id === s.id || c.name.trim().toLowerCase() === s.name.trim().toLowerCase()
          );
          const id = fromCatalog?.id || s.id;
          const name = fromCatalog?.name || s.name;
          merged.push({
            id,
            name,
            isRequired: fromCatalog?.isRequired ?? s.isRequired,
            isSelected: true,
            value: s.value,
          });
          usedIds.add(id);
          usedNames.add(name.trim().toLowerCase());
        }

        for (const c of catalog) {
          if (usedIds.has(c.id) || usedNames.has(c.name.trim().toLowerCase())) continue;
          merged.push({
            ...c,
            isSelected: false,
            value: '',
          });
          usedIds.add(c.id);
          usedNames.add(c.name.trim().toLowerCase());
        }

        setCriteria(merged);
      } catch (e) { console.error(e); }
    })();
  }, [formData.productGroupId, originalCriteria]);

  const handleCriterionValueChange = (id: string, v: string) => {
    if (isReadOnly) return;
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, value: v } : c));
  };

  const toggleCriterionSelection = (id: string) => {
    if (isReadOnly) return;
    setCriteria(prev => prev.map(c => c.id !== id ? c : (c.isRequired ? c : { ...c, isSelected: !c.isSelected })));
  };

  const moveCriterion = (draggedId: string, targetId: string) => {
    if (isReadOnly || draggedId === targetId) return;
    setCriteria(prev => {
      const selected = prev.filter(c => c.isSelected);
      const unselected = prev.filter(c => !c.isSelected);
      const dragIdx = selected.findIndex(c => c.id === draggedId);
      const targetIdx = selected.findIndex(c => c.id === targetId);
      if (dragIdx === -1 || targetIdx === -1) return prev;
      const reorderedSelected = [...selected];
      const [movedItem] = reorderedSelected.splice(dragIdx, 1);
      reorderedSelected.splice(targetIdx, 0, movedItem);
      return [...reorderedSelected, ...unselected];
    });
  };

  const missingRequiredCriteria = useMemo(() => {
    return criteria.filter(c => c.isRequired && !c.isSelected);
  }, [criteria]);

  const handleAddMissingRequiredCriteria = (criterionIds: string[]) => {
    if (isReadOnly) return;
    setCriteria(prev => prev.map(c => criterionIds.includes(c.id) ? { ...c, isSelected: true } : c));
    toast.success('Đã bổ sung tiêu chí bắt buộc vào phiên bản này. Vui lòng nhập nội dung.', { position: 'top-center' });
    setTimeout(() => {
      const el = document.getElementById(`criterion-${criterionIds[0]}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const isFormDirty     = productName !== (productData?.name || '') || formData.productGroupId !== (productData?.productGroupId || '') || formData.productCategoryId !== (productData?.productCategoryId || '') || formData.businessId !== (productData?.businessId || '');
  const isCriteriaDirty = serializeCriteriaForDiff(criteria) !== serializeCriteriaForDiff(originalCriteria);
  const isDirty         = !isReadOnly && (isFormDirty || isCriteriaDirty || avatarFile !== null || imageRemoved || isActive !== (productData?.active ?? true));

  const renderCustomToast = (message: string) => {
    toast.custom(t => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} toast-pill-container`}>
        <div className="toast-pill-content">
          <div className="toast-pill-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span className="toast-pill-text">{message}</span>
        </div>
        <button onClick={() => toast.dismiss(t.id)} className="toast-pill-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    ), { position: 'top-center' });
  };

  const handleToggleActive = async (newActiveStatus: boolean) => {
    if (isReadOnly) {
      toast.error('Bạn không có quyền thay đổi trạng thái sản phẩm này.', { position: 'top-center' });
      return;
    }
    if (!id || newActiveStatus === isActive) return;

    try {
      const res = await fetch(`${BASE_URL}/products/${id}/active?active=${newActiveStatus}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/plain, */*' },
      });

      if (res.ok) {
        setIsActive(newActiveStatus);
        setProductData((prev: any) => prev ? { ...prev, active: newActiveStatus } : prev);
        renderCustomToast(newActiveStatus ? 'Cập nhật hiển thị sản phẩm thành công' : 'Ẩn sản phẩm thành công');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Cập nhật trạng thái hiển thị thất bại', { position: 'top-center' });
      }
    } catch (e) {
      console.error('Lỗi khi cập nhật trạng thái hiển thị:', e);
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
    }
  };

  const handleUpdateProduct = async (status: 'ARCHIVED' | 'PENDING_APPROVAL' | 'DRAFT' | 'ACTIVE') => {
    if (submittingRef.current) return;
    if (isReadOnly) {
      toast.error('Bạn không có quyền chỉnh sửa sản phẩm này do không phải là người tạo.', { position: 'top-center' });
      return;
    }
    if (!id) return;
    if (status !== 'ARCHIVED' && status !== 'ACTIVE') {
      if (!formData.productGroupId) { toast.error('Vui lòng chọn Nhóm sản phẩm', { position: 'top-center' }); return; }
      if (!productName.trim()) { toast.error('Vui lòng nhập Tên sản phẩm dịch vụ', { position: 'top-center' }); return; }
      if (status !== 'DRAFT') {
        const missingUnselectedRequired = criteria.filter(c => c.isRequired && !c.isSelected);
        if (missingUnselectedRequired.length > 0) {
          toast.error(`Phiên bản mới yêu cầu bổ sung tiêu chí bắt buộc: ${missingUnselectedRequired.map(c => c.name).join(', ')}`, { position: 'top-center' });
          return;
        }
        const miss = criteria.find(c => c.isRequired && c.isSelected && isHtmlEmpty(c.value));
        if (miss) { toast.error(`Vui lòng nhập nội dung cho tiêu chí bắt buộc mới: ${miss.name}`, { position: 'top-center' }); return; }
      }
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    let succeeded = false;
    try {
      let finalImageUrl: string | null;
      if      (imageRemoved) { finalImageUrl = null; }
      else if (avatarFile)   { try { finalImageUrl = await uploadImage(avatarFile); } catch (e: any) { toast.error(e.message || 'Lỗi upload ảnh', { position: 'top-center' }); return; } }
      else                   { finalImageUrl = productData.imageUrl || null; }

      const payload = {
        name:              productName.trim(),
        productGroupId:    formData.productGroupId    || productData.productGroupId,
        productCategoryId: formData.productCategoryId || null,
        businessId:        formData.businessId        || null,
        active:            isActive,
        imageUrl:          finalImageUrl,
        status,
        criteria: criteria.filter(c => c.isSelected).map(c => ({ criteriaId: c.id, value: c.value.trim() })),
      };
      const res = await fetch(API_ENDPOINTS.PRODUCT.UPDATE(id), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        succeeded = true;
        const msgs: Record<string, string> = {
          DRAFT: 'Lưu nháp sản phẩm thành công', ARCHIVED: 'Lưu trữ sản phẩm thành công',
          ACTIVE: 'Kích hoạt sản phẩm hoạt động trở lại thành công', PENDING_APPROVAL: 'Gửi phê duyệt sản phẩm thành công',
        };
        renderCustomToast(msgs[status] || 'Cập nhật sản phẩm thành công');
        setTimeout(() => {
          const backRequestId = routeState?.requestId || productData?.requestId;
          if (backRequestId) {
            navigate(`/products/batch/${backRequestId}`, {
              state: { requestName: stripHtml(routeState?.requestName || productData?.requestName), requestId: backRequestId },
            });
          } else {
            navigate(-1);
          }
        }, 1000);
      } else {
        const err = await res.json();
        toast.error(err.message || 'Có lỗi xảy ra khi cập nhật sản phẩm', { position: 'top-center' });
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi kết nối máy chủ', { position: 'top-center' });
    } finally {
      if (!succeeded) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  if (loading)      return <div className="loading" style={{ padding: 40, textAlign: 'center' }}>Đang tải dữ liệu sản phẩm...</div>;
  if (!productData) return <div className="error" style={{ padding: 40, textAlign: 'center' }}>Không tìm thấy dữ liệu sản phẩm phù hợp.</div>;

  const selectedCriteria = criteria.filter(c => c.isSelected);
  const requestNameDisplay = stripHtml(routeState?.requestName || productData?.requestName) || 'Quay lại';
  const requestIdForBack = routeState?.requestId || productData?.requestId;

  const handleBack = () => {
    if (requestIdForBack) {
      navigate(`/products/batch/${requestIdForBack}`, {
        state: { requestName: requestNameDisplay, requestId: requestIdForBack, name: requestNameDisplay },
      });
      return;
    }
    navigate(-1);
  };

  return (
    <div className="pageWrapper">
      <style>{`.ql-editor{word-break:break-word!important;overflow-wrap:break-word!important;white-space:pre-wrap!important;}`}</style>

      <div className="mainContainer">
        {isReadOnly && !isApproved && !isPendingApproval && (
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
            <button className="btnBack" onClick={handleBack} title={requestNameDisplay}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span className="breadcrumbText" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {requestNameDisplay}
              </span>
            </button>
            
            <div className="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Icon phân cách ">" giữa nút Quay lại và Tên SP */}
              <div className="separatorWrapper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>

              {/* Hiển thị trực tiếp Tên sản phẩm */}
              {(productName?.trim() || productData?.name) && (
                <span 
                  className="breadcrumbActive breadcrumb-truncate" 
                  title={String(productName?.trim() || productData?.name)}
                >
                  {productName?.trim() || productData?.name}
                </span>
              )}

              {canShowNewCriteriaNotice && missingRequiredCriteria.length > 0 && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 6px 4px 14px',
                    borderRadius: 9999,
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    color: '#0369A1',
                    fontSize: 13,
                    fontWeight: 500,
                    minHeight: 32,
                    boxSizing: 'border-box',
                    fontFamily: "'Inter', sans-serif",
                  }}
                  title={`Nhóm sản phẩm đã bổ sung tiêu chí bắt buộc mới: ${missingRequiredCriteria.map(c => c.name).join(', ')}.`}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: '#0284C7' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </span>
                  <span>Có tiêu chí mới (+{missingRequiredCriteria.length})</span>
                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => handleAddMissingRequiredCriteria(missingRequiredCriteria.map(c => c.id))}
                      style={{
                        background: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 9999,
                        padding: '4px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginLeft: 4,
                        transition: 'background-color 0.15s ease',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#0369A1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#0284C7';
                      }}
                      title="Bổ sung tiêu chí mới vào sản phẩm này"
                    >
                      Bổ sung ngay
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="headerRight" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#65636D', fontSize: '14px', fontWeight: 400, whiteSpace: 'nowrap' }}>Ghi chú:</span>
              <span style={{ color: '#111827', fontSize: '14px', fontWeight: 500, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                {renderNote(productData?.notes || productData?.note)}
              </span>
            </div>

            {!isReadOnly && (
              <button 
                type="button"
                className="btnSubmit" 
                disabled={!isDirty || isSubmitting || productData?.status === 'PENDING_APPROVAL'} 
                onClick={() => handleUpdateProduct(productData?.status || 'ACTIVE')}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  backgroundColor: (isDirty && !isSubmitting && productData?.status !== 'PENDING_APPROVAL') ? '#AE1C3F' : '#E3DFE6',
                  color: (isDirty && !isSubmitting && productData?.status !== 'PENDING_APPROVAL') ? '#FFF' : '#9CA3AF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: (isDirty && !isSubmitting && productData?.status !== 'PENDING_APPROVAL') ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu'}
              </button>
            )}
          </div>
        </div>

        <div className="contentGrid">
          <div className="leftCol">
            {/* Bọc TẤT CẢ trong 1 formCard duy nhất */}
            <div className="formCard">
              
              <div className="formGroup" style={{ marginBottom: 16 }}>
                <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Nhóm sản phẩm (*)</label>
                <div className="custom-select-container" ref={groupRef}>
                  <div 
                    className={`select-custom ${isGroupOpen ? 'open' : ''} ${isReadOnly ? 'is-disabled' : ''}`} 
                    onClick={() => { if (!isReadOnly) setIsGroupOpen(v => !v); }} 
                    style={isReadOnly ? DISABLED_CONTROL_STYLE : { backgroundColor: 'white' }}
                  >
                    <span>{groupOptions.find(o => o.value === formData.productGroupId)?.label || productData?.productGroupName || 'Chọn nhóm'}</span>
                  </div>
                  {isGroupOpen && !isReadOnly && (
                    <div className="custom-options-list">
                      {groupOptions.map(o => (
                        <div 
                          key={o.value} 
                          className={`custom-option ${formData.productGroupId === o.value ? 'selected' : ''}`}
                          onClick={() => { 
                            setFormData({ productGroupId: o.value, productCategoryId: '', businessId: '' }); 
                            setIsGroupOpen(false); 
                          }}
                        >
                          {o.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20 }}>
                <div className="formGroup" style={{ flex: 1 }}>
                  <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Danh mục sản phẩm</label>
                  <div className="custom-select-container" ref={categoryRef}>
                    <div 
                      className={`select-custom ${isCategoryOpen ? 'open' : ''} ${isReadOnly ? 'is-disabled' : ''}`} 
                      onClick={() => { if (!isReadOnly) setIsCategoryOpen(v => !v); }} 
                      style={isReadOnly ? DISABLED_CONTROL_STYLE : { backgroundColor: 'white' }}
                    >
                      <span>{loadingCategories ? 'Đang tải...' : (categoryOptions.find(o => o.value === formData.productCategoryId)?.label || productData?.productCategoryName || 'Chọn danh mục')}</span>
                    </div>
                    {isCategoryOpen && !isReadOnly && (
                      <div className="custom-options-list">
                        <div className="custom-option" onClick={() => { setFormData({ ...formData, productCategoryId: '', businessId: '' }); setIsCategoryOpen(false); }}><i>-- Bỏ chọn --</i></div>
                        {categoryOptions.map(o => (
                          <div key={o.value} className={`custom-option ${formData.productCategoryId === o.value ? 'selected' : ''}`}
                            onClick={() => { setFormData({ ...formData, productCategoryId: o.value }); setIsCategoryOpen(false); }}>{o.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="formGroup" style={{ flex: 1 }}>
                  <label className="label" style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Nghiệp vụ</label>
                  <div className="custom-select-container" ref={operationRef}>
                    <div 
                      className={`select-custom ${isOperationOpen ? 'open' : ''} ${isReadOnly ? 'is-disabled' : ''}`} 
                      onClick={() => { if (!isReadOnly) setIsOperationOpen(v => !v); }} 
                      style={isReadOnly ? DISABLED_CONTROL_STYLE : { backgroundColor: 'white' }}
                    >
                      <span>{loadingOperations ? 'Đang tải...' : (operationOptions.find(o => o.value === formData.businessId)?.label || productData?.businessName || 'Chọn nghiệp vụ')}</span>
                    </div>
                    {isOperationOpen && !isReadOnly && (
                      <div className="custom-options-list">
                        <div className="custom-option" onClick={() => { setFormData({ ...formData, businessId: '' }); setIsOperationOpen(false); }}><i>-- Bỏ chọn --</i></div>
                        {operationOptions.map(o => (
                          <div key={o.value} className={`custom-option ${formData.businessId === o.value ? 'selected' : ''}`}
                            onClick={() => { setFormData({ ...formData, businessId: o.value }); setIsOperationOpen(false); }}>{o.label}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {formData.productGroupId && (
                <>
                  {selectedCriteria.map((criterion) => {
                    const hasErr = !isReadOnly && criterion.isRequired && isHtmlEmpty(criterion.value);
                    const isDraggingThis = draggedCriterionId === criterion.id;
                    const isDragOverThis = dragOverCriterionId === criterion.id && draggedCriterionId !== criterion.id;
                    const isNewInThisVersion = criterion.isRequired && !originalCriteria.some(o => o.id === criterion.id);

                    return (
                      <div
                        key={criterion.id}
                        id={`criterion-${criterion.id}`}
                        className="formGroup criterion-card"
                        onDragOver={(e) => {
                          if (isReadOnly) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverCriterionId !== criterion.id) {
                            setDragOverCriterionId(criterion.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverCriterionId === criterion.id) {
                            setDragOverCriterionId(null);
                          }
                        }}
                        onDrop={(e) => {
                          if (isReadOnly) return;
                          e.preventDefault();
                          if (draggedCriterionId && draggedCriterionId !== criterion.id) {
                            moveCriterion(draggedCriterionId, criterion.id);
                          }
                          setDraggedCriterionId(null);
                          setDragOverCriterionId(null);
                        }}
                        style={{
                          marginTop: 16,
                          marginBottom: 20,
                          backgroundColor: isReadOnly ? '#F9FAFB' : '#FFFFFF',
                          borderRadius: 10,
                          border: isDragOverThis
                            ? '2px dashed #B01E3E'
                            : isNewInThisVersion
                            ? '1px solid #BAE6FD'
                            : '1px solid #E5E7EB',
                          borderLeft: isNewInThisVersion
                            ? '4px solid #0284C7'
                            : isDragOverThis
                            ? '2px dashed #B01E3E'
                            : '1px solid #E5E7EB',
                          padding: 16,
                          opacity: isDraggingThis ? 0.45 : 1,
                          transform: isDraggingThis ? 'scale(0.99)' : 'none',
                          transition: 'all 0.15s ease',
                          boxShadow: isDragOverThis
                            ? '0 4px 12px rgba(176, 30, 62, 0.15)'
                            : isNewInThisVersion
                            ? '0 2px 10px rgba(2, 132, 199, 0.08)'
                            : '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {!isReadOnly && (
                              <div
                                draggable={true}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  e.dataTransfer.setData('text/plain', criterion.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  const card = (e.currentTarget as HTMLElement).closest('.criterion-card') as HTMLElement;
                                  if (card && e.dataTransfer.setDragImage) {
                                    e.dataTransfer.setDragImage(card, 20, 20);
                                  }
                                  setDraggedCriterionId(criterion.id);
                                }}
                                onDragEnd={(e) => {
                                  e.stopPropagation();
                                  setDraggedCriterionId(null);
                                  setDragOverCriterionId(null);
                                }}
                                title="Nhấn giữ để kéo di chuyển tiêu chí"
                                style={{
                                  cursor: 'grab',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#6B7280',
                                  padding: 4,
                                  borderRadius: 4,
                                  userSelect: 'none',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                                  e.currentTarget.style.color = '#111827';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.color = '#6B7280';
                                }}
                                onMouseDown={(e) => {
                                  e.currentTarget.style.cursor = 'grabbing';
                                }}
                                onMouseUp={(e) => {
                                  e.currentTarget.style.cursor = 'grab';
                                }}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="9" cy="5" r="2" />
                                  <circle cx="9" cy="12" r="2" />
                                  <circle cx="9" cy="19" r="2" />
                                  <circle cx="15" cy="5" r="2" />
                                  <circle cx="15" cy="12" r="2" />
                                  <circle cx="15" cy="19" r="2" />
                                </svg>
                              </div>
                            )}

                            <label className="label" style={{ fontWeight: 600, margin: 0, fontSize: 14, color: '#1F2937' }}>
                              {criterion.name} {criterion.isRequired && <span style={{ color: '#EF4444' }}>(*)</span>}
                            </label>
                            {isNewInThisVersion && (
                              <span
                                style={{
                                  backgroundColor: '#F0F9FF',
                                  color: '#0369A1',
                                  border: '1px solid #BAE6FD',
                                  fontSize: 11,
                                  padding: '2px 9px',
                                  borderRadius: 20,
                                  fontWeight: 600,
                                  userSelect: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                title="Tiêu chí bắt buộc mới được bổ sung cho phiên bản này"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
                                </svg>
                                Mới ở phiên bản này
                              </span>
                            )}
                          </div>

                          {!isReadOnly && !criterion.isRequired && (
                            <button
                              type="button"
                              onClick={() => toggleCriterionSelection(criterion.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 4,
                                display: 'flex',
                                alignItems: 'center',
                                color: '#9CA3AF',
                                marginLeft: 4,
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.color = '#EF4444')}
                              onMouseOut={(e) => (e.currentTarget.style.color = '#9CA3AF')}
                              title="Bỏ tiêu chí này"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          )}
                        </div>

                        <div draggable={false} onDragStart={(e) => e.stopPropagation()}>
                          <QuillEditor
                            value={criterion.value}
                            placeholder={criterion.isRequired ? 'Tiêu chí này bắt buộc phải nhập...' : 'Nhập nội dung chi tiết...'}
                            hasError={hasErr}
                            readOnly={isReadOnly}
                            onChange={(v) => handleCriterionValueChange(criterion.id, v)}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {!isReadOnly && (
                    <div style={{ textAlign: 'left', marginTop: selectedCriteria.length ? 8 : 0 }}>
                      <button 
                        type="button" 
                        onClick={() => setShowCriteriaModal(true)} 
                        className="btnAddCriteria" 
                        style={{ 
                          display: 'flex',     
                          alignItems: 'center',  
                          gap: 6,                
                          color: '#10B981', 
                          background: 'none', 
                          border: 'none', 
                          fontWeight: 600, 
                          cursor: 'pointer', 
                          padding: 0 
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="16"/>
                          <line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        Thêm tiêu chí
                      </button>
                    </div>
                  )}
                </>
              )}

              </div>
              <div
                className="product-image-card-container formGroup"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #F3F4F6',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  padding: '20px 24px',
                  boxSizing: 'border-box',
                  width: '100%',
                  marginBottom: '20px',
                  marginTop: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                    Ảnh mô tả <span style={{ color: '#EF4444' }}>(*)</span>
                  </h3>
                </div>

                {previewImage ? (
                  <div
                    className="product-image-wrapper"
                    style={{
                      position: 'relative',
                      width: '100%',
                      border: '1px solid #F3F4F6',
                      borderRadius: '12px',
                      backgroundColor: '#FAFAFA',
                      padding: '32px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '160px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <ProductImageCard2 imageUrl={previewImage} />

                    {!isReadOnly && (
                      <div className="image-overlay">
                        <button
                          type="button"
                          className="overlay-btn"
                          onClick={() => setShowImageModal(true)}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>

                        <button
                          type="button"
                          className="overlay-btn"
                          onClick={handleRemoveImage}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  !isReadOnly ? (
                    <button
                      type="button"
                      onClick={() => setShowImageModal(true)}
                      className="upload-placeholder"
                      style={{
                        width: '100%',
                        minHeight: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed #D1D5DB',
                        borderRadius: 12,
                        background: '#F9FAFB',
                        cursor: 'pointer',
                        color: '#6B7280',
                        transition: 'all 0.2s',
                        padding: '32px 16px',
                        boxSizing: 'border-box'
                      }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = '#AE1C3F'; e.currentTarget.style.background = '#FDF2F4'; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.background = '#F9FAFB'; }}
                    >
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <p style={{ margin: '0 0 4px', fontSize: 14, color: '#6B7280' }}>Kéo và thả ảnh tại đây hoặc</p>
                      <span style={{ color: '#10B981', fontWeight: 600, fontSize: '15px' }}>Chọn file</span>
                      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9CA3AF' }}>PNG, JPG, WEBP · Tối đa 10MB</p>
                    </button>
                  ) : (
                    <div
                      className="upload-placeholder-readonly"
                      style={{
                        width: '100%',
                        minHeight: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #F3F4F6',
                        borderRadius: 12,
                        background: '#FAFAFA',
                        color: '#6B7280',
                        padding: '32px 16px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 500 }}>Chưa có ảnh</span>
                    </div>
                  )
                )}
              </div>
          </div>

          <div className="rightCol" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="formCard" style={{ borderRadius: 12, background: '#F2EFF3', display: 'flex', width: 340, padding: 24, flexDirection: 'column', alignItems: 'flex-start', gap: 16, border: '1px solid #E5E7EB', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#1A191B', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>Trạng thái sản phẩm</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'help' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
                <div>
                  <StatusBadge2 status={productData?.status || 'DRAFT'} />
                </div>
              </div>
            </div>

            <div className="formCard">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#1A191B', fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>Trạng thái hiển thị</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: 'help' }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
                
                <div className="custom-select-container" ref={statusRef}>
                  <div 
                    className={`select-custom ${isStatusOpen ? 'open' : ''} ${isDisplayStatusDisabled ? 'is-disabled' : ''}`} 
                    onClick={() => { if (!isDisplayStatusDisabled) setIsStatusOpen(v => !v); }} 
                    style={isDisplayStatusDisabled ? DISABLED_CONTROL_STYLE : { backgroundColor: 'white' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        backgroundColor: isDisplayStatusDisabled 
                          ? (isActive ? '#6EE7B7' : '#9CA3AF') 
                          : (isActive ? '#10B981' : '#6B7280') 
                      }}/>
                      <span>{isActive ? 'Đang hoạt động' : 'Đang ẩn'}</span>
                    </div>
                  </div>
                  
                  {isStatusOpen && !isDisplayStatusDisabled && (
                    <div className="custom-options-list">
                      
                      {/* Sửa setIsActive(true) thành handleToggleActive(true) */}
                      <div className={`custom-option ${isActive ? 'selected' : ''}`} onClick={() => { 
                        handleToggleActive(true); 
                        setIsStatusOpen(false); 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981' }}/>
                          <span>Đang hoạt động</span>
                        </div>
                      </div>

                      {/* Sửa setIsActive(false) thành handleToggleActive(false) */}
                      <div className={`custom-option ${!isActive ? 'selected' : ''}`} onClick={() => { 
                        handleToggleActive(false); 
                        setIsStatusOpen(false); 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#6B7280' }}/>
                          <span>Đang ẩn</span>
                        </div>
                      </div>
                      
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ width: 340 }}>
              <ProductInfoCard
                creatorName={getCreatorDisplayName()}
                approverName={getApproverDisplayName()}
                createdAt={formatDateTime(productData?.createdAt)}
                version={productData?.version || 1}
                versions={productData?.versions || []}
                currentId={id}
                onSelectVersion={(v) => {
                  setPreviewVersionItem(v);
                  setShowVersionModal(true);
                }}
                showEngagementStats={productStatus === 'ACTIVE'}
                viewCount={productData?.viewCount}
                savedCount={productData?.savedCount}
              />
            </div>

            <div className="commentCard emptyComment" style={{ width: 340, boxSizing: 'border-box', position: 'relative' }}>
              {productData?.comments && productData.comments.length > 0 && (
                <div className="commentAvatarFloating" title={productData.comments[productData.comments.length - 1]?.createdBy || ''}>
                  {(productData.comments[productData.comments.length - 1]?.createdBy || '?').trim().charAt(0).toUpperCase()}
                </div>
              )}
              <div className="commentHeader">
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M18.071 18.0698C15.0159 21.1264 10.4896 21.7867 6.78631 20.074C6.23961 19.8539 2.70113 20.8339 1.93334 20.067C1.16555 19.2991 2.14639 15.7601 1.92631 15.2134C0.212846 11.5106 0.874111 6.9826 3.9302 3.9271C7.83147 0.0243001 14.1698 0.0243001 18.071 3.9271C21.9803 7.83593 21.9723 14.1681 18.071 18.0698Z" stroke="#AE1C3F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="commentTitle">Bình luận</span>
              </div>
              <div className="commentList">
                {productData?.comments && productData.comments.length > 0 ? (
                  productData.comments.map((c: any, i: number) => {
                    const isLatest = i === productData.comments.length - 1;
                    return (
                      <React.Fragment key={c.id || i}>
                        <div className="commentItem">
                          <div className="userInfo">
                            <img src={c.avatarUrl || getRandomAvatar(c.createdBy || i)} className="avatar" alt="avatar"/>
                            <div style={{ flex: 1 }}>
                              <div className="userHeader">
                                <span className="userName" style={isLatest ? { fontWeight: 700, color: '#111827' } : undefined}>{c.createdBy || 'Người kiểm duyệt'}</span>
                                <span className="commentDate" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                  {formatDateTime(c.createdAt)}
                                  {isLatest && <span className="unreadDot" title="Bình luận mới nhất" />}
                                </span>
                              </div>
                              <p className="commentText" style={isLatest ? { color: '#1F2937', fontWeight: 500 } : undefined}>{c.comment}</p>
                            </div>
                          </div>
                        </div>
                        {i < productData.comments.length - 1 && <hr className="commentDivider"/>}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <div className="no-comments">Chưa có bình luận hay phản hồi nào cho sản phẩm này.</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      <CriteriaModal isOpen={showCriteriaModal} onClose={() => setShowCriteriaModal(false)} criteria={criteria} onToggle={toggleCriterionSelection} />
      <ImageModal isOpen={showImageModal} onClose={() => setShowImageModal(false)} onConfirm={handleImageConfirm} />
      <VersionDetailModal
        isOpen={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        itemType="product"
        versionItem={previewVersionItem}
      />
    </div>
  );
};

export default DetailProductPage;